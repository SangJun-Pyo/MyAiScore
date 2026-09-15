# MyAiScore

Discover how you build with AI, one session at a time.

MyAiScore reads a selected local Claude Code session and produces a playful **session mix score, collaboration style, three highlights and a next challenge**. No collaboration essay, interview questions, GitHub URL or model key is required. Reports describe recorded activity; they do not certify ability or prove code correctness.

## Run from this checkout

Install this checkout's dependencies once:

```bash
npm ci
npm run session:report -- --example
```

The example is synthetic and reads no personal log. To analyze a real project's most recent supported Claude Code session from this installed checkout:

```bash
npm run session:report -- --project "C:/path/to/your-project"
```

From another project directory, use the absolute path to this checkout's binary so you do not execute a similarly named script from the target repository:

```bash
node C:/Users/sangj/MyAiScore/bin/myaiscore.mjs
```

Discovery is restricted to that project's Claude transcript directory. If it cannot establish scope, explicitly choose a matching JSONL file:

```bash
npm run session:report -- --project "C:/path/to/project" --session "C:/path/to/session.jsonl" --out session-report.json
```

Use a new output filename; existing files are never overwritten. Run with --help for supported options. The package is currently private and unpublished: these are working installed-checkout commands, not a claim that `npx myaiscore` is available.

## Browser report

```bash
npm run dev -- --port 3100
```

Open [New session](http://127.0.0.1:3100/evaluate). Import the generated safe summary locally or ask the CLI to print a browser link:

```bash
npm run session:report -- --example --web-url http://127.0.0.1:3100/evaluate
```

The link contains the numeric summary and fixed labels in a URL fragment; the CLI does not open it or upload anything. The browser consumes and clears the fragment. Saving to Profile is explicit and browser-local. Sharing copies a summary; it does not publish raw logs or a hosted report.

## Data and scoring

Local parsing reads a bounded selected session, never executes project code and makes no network/model calls. Exported reports contain structural counts and generated labels only: no transcript text, commands, outputs, file paths, session identifiers or secrets. Missing results remain unknown; check-shaped command calls do not establish passing tests.

Session mix adds capped contributions for conversation, exploration, editing and verification-shaped activity. More activity does not mean better work. Empty inputs have no score; partial/unsupported data is labeled. [Exact contract and rules](docs/Assessment/SESSION_REPORT.md).

Claude Code is the first source. Synthetic fixtures validate the implementation; real-version compatibility and the usefulness of the playful rules still need feedback. Old repository walkthrough and assessment result APIs are retained as historical compatibility, with their original access boundaries and separate scores.

## Development and handoff

```bash
npm run typecheck
npm test
npm run check:docs
npm run build
npx playwright install chromium
npm run test:e2e
```

Canonical project on this machine: C:/Users/sangj/MyAiScore. Shared instructions: [AGENTS](AGENTS.md), imported by [CLAUDE](CLAUDE.md). Start with [ROADMAP](docs/Development/ROADMAP.md), [master](docs/00_MASTER_PLAN.md), [ADR-0014](docs/Architecture/ADR/0014-cli-first-session-reports.md) and [Phase 8](docs/Development/Sessions/Phase-08-CLI-Session-Reports.md). Code and docs are integrated together through issue branches/PRs; do not use archived prompts as current instructions.
