# Proposal: PR-based CI with an automated Claude reviewer

Status: steps 0–2 implemented on `agent/ci-reviewer` (2026-11-24); step 3 and owner setup pending. Modeled on `lounge-bot-arctic` (#6, "Add CI and an automated Claude PR reviewer").

## What Lounge does

- `ci.yml`: typecheck + tests on every PR and on `master`; a "Migrations apply cleanly" job that boots a
  local Supabase, replays every migration plus the seed, and runs `supabase db lint`.
- `claude-review.yml`: on every non-draft PR, `anthropics/claude-code-action` (Opus, read-only tools plus
  `gh pr review/comment` and inline comments) reviews against `CLAUDE.md` and `docs/pull-requests.md`,
  then **approves** or **requests changes**. It never edits or pushes.
- A scripted final step merges only if the bot approved the *exact head SHA*, both CI checks are green,
  and no newer commit landed (`gh pr merge --squash --match-head-commit`). It fails the check when the
  reviewer posted no verdict, so "no review" never looks like a pass.
- `docs/pull-requests.md` is the contract: PR description requirements and a mandatory **Migration**
  section (schema changes, every code touch point, existing data, destructive ops, rollback). The
  reviewer greps the code itself to verify the touch-point list.
- `CLAUDE.md` tells every agent: work lands only by PR, open as draft until ready, never merge, never
  push `master`, push fixes to the same branch, rebase when asked.

## Where Phoenix already is

Phoenix's CI is *ahead* of Lounge's on testing: `.github/workflows/test.yml` already runs tsc, lint,
unit tests, then a full local Supabase stack with pgTAP, role-level RLS tests, a production build, and
Playwright e2e. What it lacks is the review/merge loop, the PR contract, and a working run:

- **The DB/e2e job is red on `master`.** The last run (Release v2.1.0) failed at `supabase start`:
  `[inbucket] in supabase/config.toml is no longer supported. Use [local_smtp] instead.`
  (`supabase/config.toml:57`, CLI pinned at 2.121.0). Unit job passes.
- Local `master` is 20 commits ahead of `origin/master`; CI hasn't seen any of wave 1–3.
- Agents merge locally into an integration branch; no PRs. Stale PRs #1 and #2 are open.

## Key difference: this repo is public

`wsalvucci/phoenix-system` is **public**, Lounge is private on the free plan. That changes the design:

1. **Use native branch protection + auto-merge** instead of Lounge's scripted merge loop. Required
   checks: `Types and unit tests`, `Database tests and end-to-end`, `Claude review`. The reviewer job
   passes only when the bot approved the head SHA, and on approval runs
   `gh pr merge --auto --squash --match-head-commit <sha>`. GitHub then merges when all three are green.
2. **Fork PRs must never be auto-reviewed or merged.** Anyone can open a PR. Gate the review job on
   `github.event.pull_request.head.repo.full_name == github.repository` and keep the trigger
   `pull_request` (never `pull_request_target`, which would hand secrets to fork code and expose the
   reviewer to prompt injection with write access).
3. **Review comments are public.** The reviewer prompt must forbid quoting student data, seed rows
   with real names, or keys. Worth confirming the repo is meant to be public at all given
   `DATA_DISCLOSURE.md`, the prod project ref in scripts, and files like `test.csv`.

## Proposed changes

### 0. Make CI green (prerequisite)
- `supabase/config.toml`: rename `[inbucket]` to `[local_smtp]` (check the keys still apply).
- Add `supabase db lint --local --level error --fail-on error` after `supabase start` (Lounge has it).
  It currently finds a real bug in `duplicate_scorebook_events` (`timestamptz + integer` on the
  "days" shift), so the step is `continue-on-error` until that is fixed.
- Optional: Node 20 → 22 in `test.yml` (runner deprecation warning).
- Push `master` so CI runs on current code.

### 1. `claude-review.yml`
Same skeleton as Lounge (Opus, read-only `--allowedTools`, `--disallowedTools Edit,Write,NotebookEdit`,
concurrency per PR, skip drafts), with a Phoenix prompt that reuses rather than duplicates existing rules:

- Read `CLAUDE.md`, `docs/pull-requests.md`, the **Review checklist** section of `.claude/agents/qa.md`,
  and `docs/DATA_DISCLOSURE.md`.
- Blocking classes, in priority order: authorization/data leaks across roles; new service-role use;
  dashboard data bypassing `getDisplayBoards`/`display_cut` or widening `displayTypes.ts`; destructive
  or untyped migrations (`types/supabase.ts` not regenerated); point math in
  `lib/pointConversionFormula.ts`; React Query keys that collide across schools/students; reintroducing
  the archaic `PointConversionRuleType` path or other standing-decision violations
  (`.claude/agents/README.md`); a `BREAKING:` change without a changelog entry; edits to
  `package.json` `version` or tags outside `npm run release`.
- Migration section verification exactly as Lounge (grep every touched object; thin descriptions block).
  Also flag anything moved into or out of `supabase/held/`.
- Verdict: request changes (inline comments) / request rebase on conflict / approve. Final step checks
  the verdict for the head SHA, fails on "no verdict", and enables auto-merge on approval.

### 2. `docs/pull-requests.md` + a root `CLAUDE.md`
Port Lounge's doc, adapted: required checks are the three above; Migration section references
`types/supabase.ts` and `supabase/held/`; a **Disclosure** section is required for any PR that adds a
field crossing the wire or a new role surface (names the `DATA_DISCLOSURE.md` tier and ruling). Merging
does not deploy, apply migrations to the hosted project, or cut a release.

`CLAUDE.md` (Phoenix has none) gets Lounge's short PR-loop rules plus a pointer to
`.claude/agents/README.md`.

### 3. Change how agents land work
- Agents keep `agent/<role>-<topic>` branches, but **push them and open a PR against `master`**
  (draft → ready) instead of the main session merging into an integration branch. This needs a standing
  owner OK to push `agent/*` branches; `master` and tags stay off limits.
- `qa` agent becomes the *local pre-PR* check (run the suite before marking ready); the CI reviewer
  becomes the merge gate. Update `qa.md` and the agents README chain accordingly.
- **Changelog conflicts:** parallel PRs all editing `## [Unreleased]` in `CHANGELOG.md` will conflict
  constantly and stall the reviewer on rebase requests. Switch to one fragment file per PR (e.g.
  `changes/<branch>.md`) and have `scripts/release.mjs` fold them in at release time.
- Releases stay manual: main session runs `npm run release` with owner go-ahead.

### 4. Owner-only setup (cannot be done by agents)
1. Add repo secret `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`) or `ANTHROPIC_API_KEY`.
2. Settings → Actions: "Allow GitHub Actions to create and approve pull requests".
3. Settings → General: enable auto-merge and "Automatically delete head branches".
4. After the first green run (so check names exist): branch protection on `master` requiring the three
   checks, up-to-date branches, no direct pushes; keep admin bypass for workflow-file PRs, which the
   Claude action refuses to review (same caveat as Lounge).
5. Close or rebase stale PRs #1 and #2.

## Rollout
1. Fix CI, push `master`. 2. Land the reviewer with the merge step disabled (review-only) for a few
agent PRs to calibrate the prompt. 3. Turn on auto-merge and branch protection. 4. Switch agents to the
PR flow and retire the integration branch.
