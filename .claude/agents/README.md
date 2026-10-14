# Phoenix System agent team

Seven project agents in `.claude/agents/`. Invoke by name ("have the designer restyle the student dashboard") or let delegation pick one.

| Agent | Model | Owns | Can write code? |
|---|---|---|---|
| `lead-developer` | Opus | Architecture: contracts, signatures, module boundaries | No — reads contracts/types/docs only, never implementation |
| `backend` | Opus | Supabase schema, RLS, migrations, server data access | Yes, final say on all backend contracts |
| `senior-developer` | Sonnet | The load-bearing code; supervises developers | Yes |
| `developer` | Haiku | Mechanical volume + search, spawned in parallel | Yes, strictly within given files |
| `ux-optimizer` | Sonnet | Flows, hierarchy, labels, defaults, empty states | Yes, structure only |
| `designer` | Sonnet | Theme, palette, typography, motion | Yes, style only |
| `privacy-boundary` | Opus | What student data may reach whom | No — owns `docs/DATA_DISCLOSURE.md`, reports violations |
| `qa` | Sonnet | Pre-merge gate for `master` | No — reports, never fixes |

## The intended chain

```
requirements
   └─ lead-developer      design the contract (+ backend, if schema is involved)
        └─ senior-developer  implement the load-bearing parts
             └─ developer ×N   mechanical edits >150 lines, and searches
   └─ ux-optimizer / designer  flow and visual passes
        └─ qa                 only when the branch is ready for master
```

## Boundaries that keep them from colliding

- `lead-developer` decides *shape*; `senior-developer` decides *implementation*; `backend` overrides both on anything touching the database.
- `ux-optimizer` changes structure, ordering, labels, and defaults. `designer` changes tokens, colour, type, spacing, and motion. Neither changes logic or data access.
- `developer` stops and reports rather than guessing on authorization, types, point math, service-role usage, or SQL.
- `qa` runs on merge to `master`, not on every commit, and has no write tools on purpose.
- `privacy-boundary` decides *what* may be disclosed; `backend` decides *how* it is enforced. On disagreement the stricter disclosure wins and the question goes to the product owner.

## Standing decisions (from the product owner, 2026-10-14)

These are settled. Do not re-litigate them; build on them.

1. **The dashboards are staff-only (ruling of 2026-10-14, superseding "the dashboards are public").** Every `app/dashboard/*` surface requires an admin or teacher login (`app/dashboard/layout.tsx`, plus `isStaffOfSchool` inside every feeding server action, `app/supaApi/server/staffAccess.ts`). They are still hallway displays, so the login decides who may *open* a dashboard, not who *reads* it. They are the **DISPLAY** tier in `docs/DATA_DISCLOSURE.md`: the full publication cut and every former PUBLIC field ruling still apply, and a staff login never widens the payload. Full-roster staff views belong outside `app/dashboard/`. `DASHBOARD_FILTERS.GLOBAL` ("no privacy filters") is still a violation.
2. **`app/dashboard/feature/` is a one-line re-export alias** of `featured/page`. Make it a redirect or delete it; it is not a competing implementation.
3. **The Victorian theme is the direction for the student surface, and it is to be remade completely** — a fresh rebuild rather than an extension of `victorian-theme.css`. The cyan `student-dashboard.css` console is retired, not merged in.
4. **`PointConversionRuleType` is archaic and must not be used.** It is one of several legacy systems still in the database. The `convertPointUsingRuleType` / `eval(formula)` path in `types/domain.ts` and `app/dataClasses.ts` is deleted rather than hardened; `lib/pointConversionFormula.ts` (safe evaluator, already tested) is the one implementation.
5. **Rank colour is a system-wide identity.** Across every surface (dashboards, student, parent, teacher, admin), a rank must be recognisable at a glance by its colour, using the existing tiers in `rankToColor` (`types/domain.ts`): 1st gold, 2nd silver, 3rd bronze, 4th purple, 5th teal, 6th–10th crimson, 11th–20th green, beyond 20th neutral. The hue family per tier is fixed; exact values may be tuned per theme and mode for contrast, and colour is always paired with the rank numeral so it is never the only signal. Themes (including the Victorian remake) adopt these tiers rather than replacing them.

Treat "there are a lot of archaic systems in the database" as a standing warning: a table or enum existing in the schema is not evidence that it is current. Ask before building on one.

## Versioning and releases

SemVer with annotated `vX.Y.Z` tags on `master` and a root `CHANGELOG.md`; rules in `docs/RELEASING.md`. Implementers add `## [Unreleased]` entries with their change (marking access/surface removals **BREAKING:**) and state the release level in their report. `qa` checks the changelog and names the required bump. Only the main session cuts releases (`npm run release`); nobody pushes tags without the product owner's go-ahead.

## Model aliases

`opus` / `sonnet` / `haiku` resolve to the latest model in each tier, so these files do not need editing when a new version ships.
