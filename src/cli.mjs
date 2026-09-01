#!/usr/bin/env node
/**
 * standup-report CLI.
 * Usage:
 *   standup-report [--since 24h|48h|7d|YYYY-MM-DD] [--dir PATH] [--format terminal|slack|markdown|html]
 *                  [--html out.html] [--author PATTERN] [--all] [--version]
 */
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { findRepos, readCommits, repoAuthorEmail, gitDirName } from './scan.mjs';
import { resolveSince } from './time.mjs';
import { formatTerminal, formatSlack, formatMarkdown, formatHtml } from './formats.mjs';

const VERSION = '0.1.0';

function parseArgs(argv) {
  const opts = { since: '24h', dirs: [], format: 'terminal', author: null, html: null, all: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--since': opts.since = argv[++i] ?? '24h'; break;
      case '--dir': opts.dirs.push(argv[++i]); break;
      case '--format': opts.format = argv[++i] ?? 'terminal'; break;
      case '--html': opts.html = argv[++i]; opts.format = 'html'; break;
      case '--author': opts.author = argv[++i]; break;
      case '--all': opts.all = true; opts.author = null; break;
      case '--version': console.log(`standup-report ${VERSION}`); process.exit(0); break;
      case '--help': case '-h': opts.help = true; break;
      default:
        if (a.startsWith('-')) {
          console.error(`unknown option: ${a}`);
          process.exit(1);
        }
        opts.dirs.push(a);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`standup-report ${VERSION}
Usage: standup-report [options]

Options:
  --since <24h|48h|7d|YYYY-MM-DD>  time window (default 24h)
  --dir <path>                     directory to scan (repeatable; default: ~/projects, ~/code, ~/dev, cwd)
  --format <terminal|slack|markdown|html>
  --html <file>                    write HTML to a file (implies --format html)
  --author <pattern>               filter commits by author name/email regex
  --all                            include all authors (default: only current git user)
  --version                        print version
  --help                           this help`);
    return;
  }

  const defaultDirs = ['~/projects', '~/code', '~/dev', '.'].map(p => {
    if (p === '.') return process.cwd();
    if (p.startsWith('~/')) return path.join(process.env.HOME || '.', p.slice(2));
    return p;
  });
  const roots = opts.dirs.length ? opts.dirs : defaultDirs.filter(existsSync);

  // Find all repos under all roots, dedupe by real path.
  const repoSet = new Set();
  for (const root of roots) {
    for (const r of await findRepos(root)) repoSet.add(r);
  }
  const repos = [...repoSet];

  const sinceISO = resolveSince(opts.since);
  const grouped = [];
  for (const repoDir of repos) {
    let author = opts.author;
    if (!opts.all && !author) {
      author = await repoAuthorEmail(repoDir);
    }
    const commits = await readCommits(repoDir, { since: sinceISO, author });
    if (!commits.length) continue;
    grouped.push({ repo: await gitDirName(repoDir), notes: commits.map(c => ({
      type: null, scope: null, subject: c.subject, hash: c.hash, date: c.date,
      message: c.subject
    })) });
  }

  // Classify through parse.mjs (re-import to keep single source of truth).
  const { classify } = await import('./parse.mjs');
  for (const g of grouped) {
    g.notes = g.notes.map(n => ({ ...classify(n.message), hash: n.hash, date: n.date }));
  }
  if (opts.format === 'html' || opts.html) {
    const html = formatHtml(grouped, { title: `Standup · since ${opts.since}` });
    if (opts.html) {
      await writeFile(opts.html, html, 'utf8');
      console.log(`wrote ${opts.html} (${html.length} bytes)`);
    } else {
      process.stdout.write(html);
    }
    return;
  }
  const out = opts.format === 'slack' ? formatSlack(grouped)
    : opts.format === 'markdown' ? formatMarkdown(grouped)
    : formatTerminal(grouped);
  console.log(out);
}

main().catch(err => {
  console.error(`standup-report: ${err.message}`);
  process.exit(1);
});