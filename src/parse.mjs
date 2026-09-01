/**
 * Conventional-commit classification for standup grouping.
 * Pure functions: no I/O, easy to test.
 */

export const TYPE_ORDER = ['feat', 'fix', 'docs', 'refactor', 'perf', 'test', 'chore', 'build', 'ci', 'revert', 'other'];

const PREFIX_RE = /^(feat|fix|docs|refactor|perf|test|chore|build|ci|revert)(\([\w-]+\))?(!)?:\s*(.+)$/i;

/**
 * Parse a commit message into { type, scope, subject, raw }.
 * Falls back to { type: 'other', subject: first line } when no prefix matches.
 */
export function classify(raw) {
  const firstLine = String(raw || '').split('\n')[0].trim();
  if (!firstLine) return { type: 'other', scope: null, subject: '', raw };
  const m = firstLine.match(PREFIX_RE);
  if (!m) return { type: 'other', scope: null, subject: firstLine, raw };
  return {
    type: m[1].toLowerCase(),
    scope: m[2] ? m[2].slice(1, -1) : null,
    subject: m[4].trim(),
    raw
  };
}

/**
 * Group a list of commits into a stable structure:
 * [{ repo, notes: [{ type, subject, scope, hash, date }] }]
 * Commits without a recognized prefix go to 'other'.
 */
export function groupByRepo(repoName, commits) {
  const notes = commits.map(c => ({
    ...classify(c.message),
    hash: c.hash,
    date: c.date
  }));
  return { repo: repoName, notes };
}

/** Human label for a type, used in HTML rendering. */
export function typeLabel(type) {
  const map = {
    feat: 'features',
    fix: 'fixes',
    docs: 'docs',
    refactor: 'refactor',
    perf: 'perf',
    test: 'tests',
    chore: 'chores',
    build: 'build',
    ci: 'ci',
    revert: 'reverts',
    other: 'other'
  };
  return map[type] ?? type;
}

/** Stable sort key so output order does not depend on commit hash order. */
export function typeRank(type) {
  return TYPE_ORDER.indexOf(type) === -1 ? TYPE_ORDER.length : TYPE_ORDER.indexOf(type);
}