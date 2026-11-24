# Phoenix System

School points and rewards app: Next.js 14 App Router, TypeScript, Supabase. The agent team, its
boundaries and the product owner's standing decisions are in `.claude/agents/README.md`; read it
before building anything.

## Landing work

Work lands on `master` only through pull requests that the automated Claude reviewer approves. Never
merge a PR yourself, never push to `master` directly, and never push tags. Before opening a PR, read
`docs/pull-requests.md`: it lists what the reviewer requires, including the **Migration** and
**Disclosure** sections.

- Open the PR as a draft until it's ready; drafts aren't reviewed.
- Address review feedback by pushing to the same branch. Each push triggers a fresh review.
- If the reviewer asks for a rebase, rebase onto `master` and force-push the branch.

## Safety

The Supabase CLI here is linked to production. Only run `supabase start`, `stop`, `status`,
`test db`, `db lint --local` and the `npm run test:*` scripts. Never run `db push`, `link`,
`db pull`, `migration repair`, or anything with `--linked`, `--db-url` or `--project-ref`. Testing
details are in `docs/TESTING.md`.

Use American English in all copy, docs and file names.
