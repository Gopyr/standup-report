/**
 * Output formatters: terminal, slack, markdown, html.
 * All take the same shape: [{ repo, notes: [{ type, subject, scope, hash, date }] }]
 */
import { typeLabel, TYPE_ORDER, typeRank } from './parse.mjs';

function sortNotes(notes) {
  return [...notes].sort((a, b) => typeRank(a.type) - typeRank(b.type));
}

function esc(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function formatTerminal(repos) {
  const lines = [];
  const totalCommits = repos.reduce((n, r) => n + r.notes.length, 0);
  if (totalCommits === 0) {
    return 'No commits found in the window.';
  }
  lines.push(`${repos.length} repo${repos.length === 1 ? '' : 's'}, ${totalCommits} commit${totalCommits === 1 ? '' : 's'}`);
  for (const r of repos) {
    const notes = sortNotes(r.notes);
    if (!notes.length) continue;
    lines.push('');
    lines.push(`${r.repo}  (${notes.length} commit${notes.length === 1 ? '' : 's'})`);
    for (const n of notes) {
      const scope = n.scope ? `(${n.scope})` : '';
      lines.push(`  ${n.type}${scope}: ${n.subject}`);
    }
  }
  return lines.join('\n');
}

export function formatSlack(repos) {
  const lines = [];
  const totalCommits = repos.reduce((n, r) => n + r.notes.length, 0);
  if (totalCommits === 0) return 'No commits in window.';
  lines.push(`*Standup* (${totalCommits} commits, ${repos.length} repo${repos.length === 1 ? '' : 's'})`);
  for (const r of repos) {
    const notes = sortNotes(r.notes);
    if (!notes.length) continue;
    lines.push('');
    lines.push(`*${r.repo}*`);
    for (const n of notes) {
      const scope = n.scope ? `(${n.scope}) ` : '';
      lines.push(`  • ${n.type}${scope ? ` ${scope}` : ''}${scope ? '' : ': '}${n.subject}`);
    }
  }
  return lines.join('\n');
}

export function formatMarkdown(repos) {
  const totalCommits = repos.reduce((n, r) => n + r.notes.length, 0);
  const md = ['## Standup', ''];
  if (totalCommits === 0) {
    md.push('No commits found in the window.');
    return md.join('\n');
  }
  md.push(`**${totalCommits} commits** across **${repos.length} repo${repos.length === 1 ? '' : 's'}**:`, '');
  for (const r of repos) {
    const notes = sortNotes(r.notes);
    if (!notes.length) continue;
    md.push(`### ${r.repo}`, '');
    for (const n of notes) {
      const scope = n.scope ? `(${n.scope})` : '';
      md.push(`- \`${n.type}${scope}\` ${n.subject}`);
    }
    md.push('');
  }
  return md.join('\n');
}

/** Simple inline SVG sparkline builder from an array of numbers. */
function sparkline(values, { width = 120, height = 28, stroke = '#2dd4bf' } = {}) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="activity sparkline">
  <polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

export function formatHtml(repos, { title = 'Standup Report' } = {}) {
  const totalCommits = repos.reduce((n, r) => n + r.notes.length, 0);
  const typeCounts = {};
  for (const r of repos) {
    for (const n of r.notes) {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    }
  }
  const typeStats = TYPE_ORDER.filter(t => typeCounts[t]).map(t =>
    `<span class="chip">${typeLabel(t)} ${typeCounts[t]}</span>`
  ).join('');
  const colors = {
    feat: '#2dd4bf', fix: '#f87171', docs: '#60a5fa', refactor: '#a78bfa', perf: '#fbbf24',
    test: '#4ade80', chore: '#94a3b8', build: '#94a3b8', ci: '#94a3b8', revert: '#94a3b8', other: '#64748b'
  };
  const repoCards = repos.map(r => {
    const notes = sortNotes(r.notes);
    if (!notes.length) return '';
    const rows = notes.map(n => {
      const c = colors[n.type] ?? '#64748b';
      return `<li class="note"><span class="dot" style="background:${c}"></span><code>${esc(n.type)}${n.scope ? `(${esc(n.scope)})` : ''}</code> ${esc(n.subject)}<span class="hash">${esc(n.hash)}</span></li>`;
    }).join('');
    return `<section class="card"><h3>${esc(r.repo)}</h3><ul>${rows}</ul></section>`;
  }).join('');
  const commitsPerRepo = repos.map(r => r.notes.length);

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
*{box-sizing:border-box}
body{font-family:ui-sans,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;background:#0b0f14;color:#e6edf3;line-height:1.5}
.wrap{max-width:720px;margin:0 auto;padding:32px 20px}
header{border-bottom:1px solid #1f2a36;padding-bottom:16px;margin-bottom:20px;animation:rise .5s ease both}
h1{font-size:24px;margin:0 0 4px}
.muted{color:#8b949e;font-size:13px}
.stats{margin:16px 0;display:flex;gap:8px;flex-wrap:wrap}
.chip{background:#111824;border:1px solid #1f2a36;border-radius:999px;padding:4px 10px;font-size:12px;color:#c9d1d9}
.card{background:#111824;border:1px solid #1f2a36;border-radius:12px;padding:14px 16px;margin-bottom:12px;animation:rise .5s ease both}
.card:nth-child(2){animation-delay:.08s}.card:nth-child(3){animation-delay:.16s}.card:nth-child(4){animation-delay:.24s}
.card h3{margin:0 0 8px;font-size:15px;color:#e6edf3}
ul{margin:0;padding:0;list-style:none}
.note{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #16202e;font-size:13px}
.note:last-child{border-bottom:0}
.note code{background:#0f1729;padding:2px 6px;border-radius:6px;font-size:12px;color:#7dd3fc}
.dot{width:8px;height:8px;border-radius:50%;flex:none}
.hash{margin-left:auto;color:#475569;font-size:11px;font-family:ui-monospace,monospace}
.spark{margin:16px 0 4px}
footer{margin-top:28px;padding-top:14px;border-top:1px solid #1f2a36;color:#8b949e;font-size:12px}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
@media print{body{background:#fff;color:#111}.card{background:#f6f8fa;border-color:#d0d7de}}
</style>
<div class="wrap">
<header>
  <div class="muted">Git standup report</div>
  <h1>${esc(title)}</h1>
  <div class="muted">${totalCommits} commit${totalCommits === 1 ? '' : 's'} in ${repos.length} repo${repos.length === 1 ? '' : 's'} this window.</div>
</header>
<div class="stats">${typeStats}</div>
<div class="spark">${sparkline(commitsPerRepo)}</div>
${repoCards}
<footer>standup-report. Local git only, no data leaves the machine.</footer>
</div>
</html>`;
}