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

1. **The dashboards are public.** `app/dashboard/global` and `featured` are hallway displays *and* internet-reachable with no login — the intent is that anyone can stand a display up quickly. Therefore they are the **most restrictive** audience in the system, not the most permissive. The current `DASHBOARD_FILTERS.GLOBAL` tier ("no privacy filters") is a violation of this, not an implementation of it.
2. **`app/dashboard/feature/` is a one-line re-export alias** of `featured/page`. Make it a redirect or delete it; it is not a competing implementation.
3. **The Victorian theme is the direction for the student surface, and it is to be remade completely** — a fresh rebuild rather than an extension of `victorian-theme.css`. The cyan `student-dashboard.css` console is retired, not merged in.
4. **`PointConversionRuleType` is archaic and must not be used.** It is one of several legacy systems still in the database. The `convertPointUsingRuleType` / `eval(formula)` path in `types/domain.ts` and `app/dataClasses.ts` is deleted rather than hardened; `lib/pointConversionFormula.ts` (safe evaluator, already tested) is the one implementation.

Treat "there are a lot of archaic systems in the database" as a standing warning: a table or enum existing in the schema is not evidence that it is current. Ask before building on one.

## Model aliases

`opus` / `sonnet` / `haiku` resolve to the latest model in each tier, so these files do not need editing when a new version ships.
