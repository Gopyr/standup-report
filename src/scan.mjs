/**
 * Git repo discovery and commit reading.
 * Uses child_process to shell out to git (the source of truth); no parsing of .git internals.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const execFileP = promisify(execFile);

/** True if dir contains .git (file or dir). */
async function isGitRepo(dir) {
  try {
    const st = await stat(path.join(dir, '.git'));
    return st.isDirectory() || st.isFile();
  } catch {
    return false;
  }
}

/**
 * Recursively find git repos under rootDir.
 * Skips node_modules, .git, dist, build, .venv, venv.
 */
export async function findRepos(rootDir, depth = 0) {
  if (depth > 3) return [];
  const out = [];
  let entries;
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch {
    return out;
  }
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', 'venv', '.next', '.cache', 'Pods']);
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(rootDir, e.name);
    if (e.isDirectory()) {
      if (await isGitRepo(full)) {
        out.push(full);
      } else if (depth < 3) {
        out.push(...(await findRepos(full, depth + 1)));
      }
    }
  }
  return out;
}

/**
 * Read commits from a repo since a cutoff date (ISO or git-log friendly).
 * Returns [{ hash, date, author, message }] - filtered by author when authorRe given.
 */
export async function readCommits(repoDir, { since, author }) {
  const args = ['log', '--pretty=format:%H%x1f%aI%x1f%an%x1f%ae%x1f%s', '--date=iso'];
  if (since) args.push(`--since=${since}`);
  try {
    const { stdout } = await execFileP('git', args, { cwd: repoDir, maxBuffer: 8 * 1024 * 1024 });
    if (!stdout.trim()) return [];
    const rows = stdout.split('\n').map(line => {
      const [hash, date, name, email, subject] = line.split('\x1f');
      return { hash: hash?.slice(0, 8), date, author: name, email, subject: subject ?? '' };
    });
    // Filter to the current repo user by default; author param can override (string or regex).
    let filtered = rows;
    if (author) {
      try {
        const re = new RegExp(author, 'i');
        filtered = rows.filter(r => re.test(r.author) || re.test(r.email));
      } catch {
        filtered = rows.filter(r => `${r.author} ${r.email}`.includes(author));
      }
    }
    return filtered;
  } catch (err) {
    // Not a repo or git error: skip silently.
    return [];
  }
}

/** Resolve the repo's own git user.email, used as default author filter. */
export async function repoAuthorEmail(repoDir) {
  try {
    const { stdout } = await execFileP('git', ['config', 'user.email'], { cwd: repoDir });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function gitDirName(repoDir) {
  return path.basename(repoDir);
}