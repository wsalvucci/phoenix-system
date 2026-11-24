# Pull requests and the automated reviewer

Work lands on `master` only through pull requests. A Claude reviewer
(`.github/workflows/claude-review.yml`) reviews every non-draft PR opened from a branch of this
repository, then approves it or requests changes. When auto-merge is on (repo variable
`CLAUDE_AUTO_MERGE=true`), an approval enables GitHub auto-merge pinned to the approved commit, and
GitHub squash-merges once every required check is green. Until then, the owner merges approved PRs.

Authors never merge their own PRs, not even after an approval.

## The loop

1. Push your `agent/<role>-<topic>` branch and open a PR against `master`. Open it as a draft until
   it's ready; drafts are not reviewed.
2. The reviewer reads the diff and the description, then approves or requests changes with inline
   comments.
3. If changes are requested, push fixes to the same branch. Every push re-runs CI and the review. An
   approval counts only for the exact commit it was given on, so nothing unreviewed is merged.
4. If `master` moves and the PR conflicts, the reviewer asks for a rebase. Rebase onto `master` and
   force-push the branch. The reviewer never resolves conflicts itself.

## Required checks

| Check | Workflow | What it runs |
|---|---|---|
| Types and unit tests | `test.yml` | `tsc --noEmit`, `npm run lint`, `npm run test:unit` |
| Database tests and end-to-end | `test.yml` | local Supabase from `supabase/migrations/` + `seed.sql`, schema lint, pgTAP, role-level RLS tests, production build, Playwright |
| Claude review | `claude-review.yml` | passes only if the reviewer approved the head commit |

Run them locally before marking a PR ready; `docs/TESTING.md` has the commands, and the `qa` agent
runs the whole suite.

## What every PR needs

- A description that says what changed, why, and how it was checked (tests added or run, manual
  checks).
- Tests for new or changed logic, and always for authorization, RLS and point math.
- A `CHANGELOG.md` `## [Unreleased]` entry for user-visible changes, with **BREAKING:** on any access
  or surface removal (`docs/RELEASING.md`). Never edit `package.json` `version` or push tags.
- Docs in `docs/` updated when behavior or rules change.

## Disclosure section

A PR that adds a field to any response, widens a query, or adds a role or surface must include a
**Disclosure** section: which data crosses to which role, the `docs/DATA_DISCLOSURE.md` tier and
ruling that allows it, and where it is enforced (RLS, RPC, server action). No ruling means the
`privacy-boundary` agent decides before the PR is marked ready.

## Migration section

A PR that adds or changes anything under `supabase/migrations/` or `supabase/held/` must include a
**Migration** section covering:

- **Schema changes:** every table, column, index, constraint, RLS policy, grant, function and trigger
  added, changed or dropped.
- **Touch points:** every place in the code that reads or writes the affected objects, with file
  paths, and for each one how it was updated or why it needs no change. The reviewer searches the
  code itself and requests changes if the list is incomplete.
- **Existing data:** what happens to rows already in production (backfills, defaults, `NOT NULL` on
  populated columns, renames vs. drop-and-add).
- **Destructive operations:** a reason for every `DROP`, type change or removed column.
- **Rollback:** how to undo the change after it is deployed.

The PR must regenerate `types/supabase.ts` when the change affects anything the code uses. CI
replays every migration and the seed into an empty database, so a migration that fails to apply
blocks the merge.

## What the reviewer won't do

- Review PRs from forks. The repository is public; fork PRs are skipped and the owner handles them.
- Review a PR that changes `.github/workflows/claude-review.yml`. The Claude action refuses to run a
  review workflow that differs from the one on `master`, so a PR can't rewrite its own reviewer. Its
  "Claude review" check fails and the owner reviews and merges it by hand.
- Quote student data, seed rows or keys. Review comments are public.

## What merging doesn't do

Merging doesn't deploy, apply migrations to the hosted Supabase project, or cut a release. Those stay
manual: releases go through `npm run release` with the owner's go-ahead.
