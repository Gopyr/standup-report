import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, groupByRepo, typeRank, typeLabel } from '../src/parse.mjs';
import { resolveSince } from '../src/time.mjs';

test('classify parses conventional commit prefixes', () => {
  assert.equal(classify('feat: add compare command').type, 'feat');
  assert.equal(classify('fix(ui): button alignment').type, 'fix');
  assert.equal(classify('fix(ui): button alignment').scope, 'ui');
  assert.equal(classify('docs: update README').type, 'docs');
  assert.equal(classify('chore!: drop node 16').type, 'chore');
  assert.equal(classify('TEST: uppercase prefix still works').type, 'test');
});

test('classify falls back to other for non-conventional messages', () => {
  const c = classify('wip stuff');
  assert.equal(c.type, 'other');
  assert.equal(c.subject, 'wip stuff');
  assert.equal(classify('').type, 'other');
});

test('groupByRepo keeps commit metadata', () => {
  const commits = [
    { message: 'feat: x', hash: 'abc123', date: '2026-01-01T00:00:00Z' },
    { message: 'random note', hash: 'def456', date: '2026-01-02T00:00:00Z' }
  ];
  const g = groupByRepo('myrepo', commits);
  assert.equal(g.repo, 'myrepo');
  assert.equal(g.notes.length, 2);
  assert.equal(g.notes[0].type, 'feat');
  assert.equal(g.notes[0].hash, 'abc123');
  assert.equal(g.notes[1].type, 'other');
});

test('typeRank orders feat first, other last', () => {
  assert.equal(typeRank('feat'), 0);
  assert.ok(typeRank('other') > typeRank('fix'));
  assert.ok(typeRank('unknown-type') >= typeRank('other'));
});

test('typeLabel humanizes', () => {
  assert.equal(typeLabel('feat'), 'features');
  assert.equal(typeLabel('fix'), 'fixes');
  assert.equal(typeLabel('zzz'), 'zzz');
});

test('resolveSince handles hours, days, weeks and dates', () => {
  const h = resolveSince('24h');
  assert.ok(new Date(h).getTime() < Date.now());
  assert.ok(new Date(h).getTime() > Date.now() - 48 * 3600 * 1000);

  const d = resolveSince('3d');
  assert.ok(new Date(d).getTime() > Date.now() - 4 * 24 * 3600 * 1000);

  const w = resolveSince('1w');
  assert.ok(new Date(w).getTime() > Date.now() - 8 * 24 * 3600 * 1000);

  const dt = resolveSince('2026-08-20');
  assert.equal(new Date(dt).toISOString().slice(0, 10), '2026-08-20');
});