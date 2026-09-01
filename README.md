# Daily standup report from local git history

Scan your local repos, filter commits to yours in a time window, group them by conventional-commit type, and paste the result into Slack or your standup doc. Everything runs locally; no data leaves your machine.

## Why

Writing a standup update every morning means reconstructing what you did yesterday across the repos you touched. This tool does that from git history: your commits, your window, grouped and formatted.

## Screenshot

HTML output from a real 30-day scan of local repos (35 commits, 6 repos):

![standup-report HTML output](screenshots/html-report.png)

## Install

```bash
npm install -g .
# or run without global install
node src/cli.mjs
```

## Usage

```bash
standup-report                 # last 24h, scan default dirs
standup-report --since 48h     # custom window: 24h, 7d, or a date like 2026-08-20
standup-report --dir ~/code    # scan a specific directory tree
standup-report --format slack  # terminal | slack | markdown | html
standup-report --html out.html # same as --format html, writes to file
```

Examples:

```text
$ standup-report --since 24h

Standup: since yesterday (2026-08-31 09:00 -> now)
1 repo, 4 commits

gp-1  (3 commits)
  feat: compare command with delta output
  fix: remove em dashes from docs
  chore: bump version to 0.2.0

labboard  (1 commit)
  feat: auto-load real sample reports

4 commits total, 1 repo
```

## How it works

1. Walk the target directory (default: `~/projects`, `~/code`, `~/dev`, cwd) and find nested git repos (directories containing `.git`).
2. For each repo, read `git log --pretty` since the window start, filter to your email (`git config user.email`) unless `--author` overrides.
3. Classify message prefixes: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`, `revert`. Anything else falls under `other`.
4. Group by repo, then by type, and render the chosen format.

## Formats

- **terminal**: compact grouped list (default)
- **slack**: same content, Slack-friendly plain text with bold headers
- **markdown**: `## Standup` document with per-repo sections
- **html**: standalone self-contained page with per-day activity bars and no external assets

The HTML format is useful when standups go into a wiki or Notion export.

## Limitations

- Local git only. No GitHub/Jira/Linear integration (out of scope by design).
- Commit messages must follow a conventional-ish prefix for nice grouping; a message like `wip` lands under `other`.
- Author filtering uses one email. If you commit under several emails, pass `--author "name|email"` or `--all` to include everyone.
- Non-repo directories are skipped silently.

## Development

```bash
npm test
```

Tests cover message classification and window parsing with real fixture commit data.

## License

MIT