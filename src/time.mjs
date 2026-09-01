/**
 * Time window parsing for the CLI. Pure and testable.
 */

export function resolveSince(s) {
  // s: number+h (hours), d (days), w (weeks) or ISO date
  const m = String(s).match(/^(\d+)([hdw])$/);
  if (m) {
    const mult = { h: 1, d: 24, w: 24 * 7 }[m[2]];
    return new Date(Date.now() - Number(m[1]) * mult * 3600 * 1000).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return new Date(`${s}T00:00:00Z`).toISOString();
  }
  // fallback: default 24h
  return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
}