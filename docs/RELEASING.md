# Versioning and releases

Phoenix System uses **Semantic Versioning** (`MAJOR.MINOR.PATCH`), **annotated git tags**
named `vX.Y.Z` on `master`, and a **Keep a Changelog** file at `CHANGELOG.md`. The version
in `package.json` always equals the latest tag on `master`.

Baseline: `v1.0.0` is `master` at `8b390a9` (2026-09-12). The one hand edit of `package.json` `version` to `1.0.0` (on `agent-remediation`) is the owner-approved baseline (2026-10-14); every later change goes through `npm run release`. Everything before it is
summarized in the `1.0.0` changelog entry; history before the baseline is not tagged.

## What each number means here

This app has no public API, so "breaking" is defined by the people and systems around it:

| Bump | When | Examples |
|---|---|---|
| **MAJOR** | Someone must change how they use or deploy the app, or a surface/access path is removed or narrowed. | A route now requires login; a role loses access to data; a migration that needs a coordinated deploy, a backfill, or manual data work; removing a page. |
| **MINOR** | New capability, backwards-compatible. | A new screen, report, or role feature; an additive migration (new table/column with defaults). |
| **PATCH** | Fixes and internal work with no behaviour change for users. | Bug fixes, privacy/auth fixes that close a leak without removing legitimate access, refactors, styling fixes, dependency bumps. |

When in doubt between two levels, pick the higher one. A security fix that removes access a
legitimate user relied on is MAJOR, not PATCH.

## Changelog rules (all implementing agents)

- Every change that a user, admin, or operator could notice gets a line under
  `## [Unreleased]` in `CHANGELOG.md`, in the same working tree as the change.
- Use the Keep a Changelog headings: `Added`, `Changed`, `Deprecated`, `Removed`,
  `Fixed`, `Security`. Create a heading only when you have an entry for it.
- One line per change, written for a school admin, not a developer. Name the surface
  (`/dashboard/*`, scorebook import), not the function.
- Mark anything that forces a MAJOR bump with a leading **BREAKING:**.
- Never write student names, ids, or real data into the changelog.
- Pure internal work (tests, refactors, agent definitions) may be omitted, or grouped as one
  `Changed` line.

## Cutting a release

Releases are cut from `master` only, after `qa` returns PASS or PASS WITH NOTES for the merge.

```sh
git checkout master            # merged, clean, up to date
npm run release -- --dry-run   # shows the computed bump and changelog section
npm run release                # bump inferred from the changelog
npm run release -- minor       # or force: major | minor | patch | X.Y.Z
```

`scripts/release.mjs`:

1. Refuses unless on `master` with a clean tree and a non-empty `[Unreleased]` section.
2. Infers the bump: any **BREAKING:** or `Removed` entry → major; any `Added` or `Deprecated`
   → minor; otherwise patch. An explicit argument overrides it but may not go *lower* than the
   inferred level.
3. Moves `[Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, sets `version` in `package.json` and
   `package-lock.json`, commits `Release vX.Y.Z`, and creates the annotated tag `vX.Y.Z` whose
   message is that changelog section.
4. **Does not push.** Pushing (`git push origin master --follow-tags`) is outward-facing and
   triggers a deploy; only the main session does it, with the product owner's go-ahead.

## Who does what

| Role | Responsibility |
|---|---|
| Implementers (`senior-developer`, `backend`, `designer`, `ux-optimizer`) | Add `[Unreleased]` entries with their change. |
| `developer` | Does not write changelog entries; its supervising `senior-developer` does. |
| `qa` | Checks the changelog covers the branch diff, and states the required bump in its verdict. A missing entry for a user-visible change is NON-BLOCKING; a missing **BREAKING:** marker on a breaking change is BLOCKING. |
| Main session | Merges, runs `npm run release`, and pushes only with approval. |

## Fixing mistakes

- A tag that has **not** been pushed: `git tag -d vX.Y.Z`, `git reset --soft HEAD~1`, fix, re-run.
- A tag that **has** been pushed is never moved or deleted. Cut a new PATCH release instead.
