# Victorian remake of the student surface: plan

Author: designer. Status: PLAN ONLY, no code or styles changed. Date: 2026-10-14.

> **Disclosure rulings (2026-10-14).** The questions this plan raised are ruled in
> `docs/DATA_DISCLOSURE.md` §10 (log entry §0 D1–D7). Where they differ from the text below,
> the rulings win.
> - Compare: **retired** (§10.1). Drop it from Phase 4, and drop the `max-w-5xl` exception.
> - Standing "Nearby" rows (§4.3): **denied** (§10.2). Build only the neighbour-less version.
> - "of N students" on the student's own view: **confirmed** (§10.5). Never on shares or
>   DISPLAY. Low ranks get no distinct styling, and only ranks 1–3 get medals.
> - "Points gained since last visit": **allowed** (§10.6). Celebrate positive deltas only,
>   prefer `localStorage`, and log no visit times on the server.
> - "Groups You Lead": **names only, no letter-grade badges** (§10.7).
> - Mockups and QA screenshots: **placeholder data only** (§10.7).
Standing decision #3 (`.claude/agents/README.md`): Victorian is the student direction, rebuilt
from scratch; `student-dashboard.css` (cyan console) is retired, not merged.
`docs/design/UX_RESTRUCTURE_PLAN.md` did not exist when this was written; section 9 lists what I
need from it. Where structure and style overlap, structure is ux-optimizer's.

## 1. What exists today (inventory of the problem)

- `app/student/victorian-theme.css` (955 lines) is three layers stacked: an original burgundy/gold
  theme, a "Phase 3 streamlined" override layer that undoes half of it, and ~15 duplicated
  `.dark` blocks. It hard-codes ~40 hex values in its own `--victorian-*` variables, which
  duplicate the global token system instead of using it.
- It declares `Playfair Display` but the font is never loaded (`app/layout.tsx` only loads
  Geist), so the "Victorian" headings render in the browser's default serif.
- It contains a global `html, body { overflow-x: hidden; overscroll-behavior: none; max-width: 100vw }`
  rule. Once the CSS chunk loads it can leak to non-student routes. Must not survive.
- `student-dashboard.css` (44 lines, minified-style) re-skins the same markup cyan/monospace with
  `!important`, attribute selectors (`span[style*="color"]`) and 6-10px type. It is the reference
  look in `reference.jpeg` (a phone showing a cyan sci-fi ID card and a monospace point counter).
  That reference is the thing being retired; I took nothing from it except the one idea worth
  keeping, an identity card with the point balance as the hero (section 4).
- Component files carry the rest of the inconsistency: raw `slate-*` utility pairs, inline
  `style={{ color: ... }}` driven by `rankToColor()` / letter-grade hex in `types/domain.ts`
  (gold `#E6C200` on cream is about 1.5:1), `bg-primary text-white` in the tabs (white on the
  wave-1 dark `--primary` fails; wave 1 fixed the token but this file bypasses it), and font sizes
  from 6px to 56px with no scale.
- `SparkleBackground.tsx` + `sparkles-shaders.ts` are imported by nothing. `three` is imported
  only by that file.

## 2. Direction

**"Prize-day parlour."** The student record is a printed school-prize certificate come to life:
warm paper, iron-gall ink, burgundy cloth, brass fittings. Points are the brass: gilt is used
for the one number a student came to see and for earned marks (medals, seals, streaks), and for
nothing else. Everything else is ink on paper with hairline rules and a double-rule frame.
Dark mode is the same room by gaslight (warm near-black, cream ink, dimmed brass), never an
inverted light theme and never blue-black.

Celebratory for a child (a wax-seal stamp, gilt shimmer on a new award, medal badges) but the
chassis is a serif-and-rules editorial layout that a teacher or parent reads as dignified. No
cartoon ornament, no emoji, no gradient text.

The Victorian vocabulary, used consistently and only these: double-rule frame, small-caps tracked
labels, a corner flourish on the identity card only, a centred divider ornament between sections,
the wax seal, and medal discs for ranks 1-3.

## 3. Fit with the token system

Principle: do not create a parallel `--victorian-*` palette. The student surface re-points the
**existing** semantic tokens inside a scope class, so every shared component (`components/ui/*`,
`.surface`, `.button-primary`, `.field`) re-skins for free and nothing but the student routes sees
the change.

1. `app/globals.css`, `:root` and `.dark`: add a small set of **new global tokens** with neutral
   defaults, so other surfaces may use them later and rule 2 is satisfied:
   `--gilt`, `--gilt-foreground`, `--gilt-ink`, `--rule`, `--medal-gold`, `--medal-silver`,
   `--medal-bronze`, `--shadow-seal`. Map in `tailwind.config.js` (`gilt`, `gilt-ink`, `rule`,
   `medal.{gold,silver,bronze}`, `boxShadow.seal`). The wave-1 tokens (`success`, `warning`,
   `info`, `shadow-1..3`) are reused as-is.
2. `app/globals.css`, one new block `.theme-victorian { ... }` plus `.dark .theme-victorian { ... }`
   in `@layer base`: overrides `--background --foreground --card --popover --primary --secondary
   --muted --accent --border --input --ring --success --warning --info --destructive --radius
   --btn-background* --shadow-1..3` with the values below. The student layout root gets
   `className="theme-victorian"`. The wave-1 values for every other route are untouched.
3. Component-level classes (frame, ornament, seal, medal, shimmer) live in a new
   `app/student/victorian.css` of at most ~150 lines, `@layer components`, tokens only. No hex, no
   `!important`, no attribute selectors, no global element rules. Everything else is Tailwind
   utilities against the tokens.

### 3.1 Palette (HSL triplets, same format as globals.css)

Contrast is computed against the stated background; "pass" means WCAG 2.x. Values were chosen
by luminance; **the implementing pass must re-measure with a tool and adjust lightness only**.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--background` (paper / study) | 40 38% 95% | 24 22% 8% | warm, never pure white/black |
| `--foreground` (ink / cream) | 22 28% 12% | 40 32% 92% | ~14:1 light, ~13:1 dark |
| `--card` | 42 48% 98% | 24 20% 12% | one step off background |
| `--card-foreground` | 22 28% 12% | 40 32% 92% | |
| `--popover` / fg | = card | = card | |
| `--primary` (burgundy cloth) | 350 58% 28% | 350 46% 40% | fill; fg below |
| `--primary-foreground` | 42 48% 97% | 42 48% 96% | light ~11:1, dark ~6.5:1 |
| `--secondary` | 38 30% 90% | 24 16% 17% | |
| `--secondary-foreground` | 22 28% 14% | 40 32% 92% | |
| `--muted` | 38 26% 91% | 24 14% 16% | |
| `--muted-foreground` | 25 15% 34% | 36 16% 70% | ~6:1 light, ~6.5:1 dark on card |
| `--accent` | 38 34% 88% | 24 18% 20% | hover wash |
| `--accent-foreground` | 22 28% 12% | 40 32% 92% | |
| `--destructive` | 0 68% 38% | 0 62% 55% | text-on-card pass both; fg cream |
| `--success` | 150 48% 23% | 150 42% 52% | emerald-ink |
| `--info` | 215 50% 30% | 212 55% 68% | sapphire-ink |
| `--warning` | 36 90% 40% | 38 85% 58% | warning-foreground is ink in both |
| `--border` (UI edges, inputs) | 30 16% 50% | 30 12% 48% | 3:1+ against card/background |
| `--input` | = border | = border | |
| `--ring` | 350 62% 36% | 43 72% 62% | 3:1+ vs adjacent, both modes |
| `--rule` (decorative hairlines only) | 36 28% 78% | 28 14% 24% | NOT used for control edges |
| `--gilt` (brass fill) | 43 68% 50% | 43 62% 58% | fill only |
| `--gilt-foreground` | 22 28% 12% | 24 22% 8% | text on gilt, ~8:1 |
| `--gilt-ink` (gilt as text) | 36 82% 26% | 43 70% 66% | text on card, ~6.5:1 / ~7:1 |
| `--medal-gold/silver/bronze` | 43 68% 50 / 215 8% 62 / 28 55% 42 | 43 62% 58 / 215 10% 70 / 28 50% 52 | disc fills; numeral inside is `--gilt-foreground` or ink, never the hue |

Burgundy as *text* on paper uses `--primary` in light (about 11:1). In dark, burgundy text
would fail, so headings use `--foreground` and burgundy is carried by fills and rules only. This
is a deliberate rule: **hue never carries meaning on its own and never carries text**.

Old to new: `--victorian-burgundy #8B2635` becomes `--primary`; `--victorian-gold #D4AF37`
becomes `--gilt` (text use moves to `--gilt-ink`, since #D4AF37 on cream is ~2:1);
`--victorian-cream` becomes `--background`/`--card`; all other `--victorian-*` variables are
deleted. Wave-1 global values on non-student routes: unchanged.

### 3.2 Typography (real fonts)

Loaded with `next/font/google` in the student layout only (self-hosted at build, no runtime
request, `display: swap`), exposed as CSS variables and mapped in `tailwind.config.js`
`fontFamily`:

- **Display: Fraunces** (variable, axes `opsz`, `wght`; use 600 at display sizes, `SOFT` 0,
  `WONK` 0). A warm old-style serif with strong numerals and real optical sizing; reads as
  Victorian-print without the thin hairlines of Didone faces that disappear on a projector or a
  cracked phone. Tailwind: `font-display`. Used for the student name, section titles, and every
  big number (`font-variant-numeric: lining-nums tabular-nums`, set on `.font-display` numerals).
- **Text: Geist Sans** (already loaded). Body, tables, buttons, form fields. Keeps the app
  consistent with teacher/admin screens and stays legible at 14px.
- **Labels: Geist Sans small caps feel** via `uppercase tracking-[0.14em] text-xs font-semibold`.
  Monospace is retired from the student surface entirely.
- Playfair Display is dropped (was never loading).

One scale, minimum 12px anywhere (old CSS used 6-10px). `text-xs` 12 label, `text-sm` 14
secondary/dense, `text-base` 16 body, `text-xl` 20 card title, `text-2xl` 24 section title,
`text-4xl` 36 student name (`text-3xl` on phones), and one hero size `text-6xl` 60 / `text-5xl` 48
on phones for the point balance. Line heights: 1.5 body, 1.15 display. Weights: 400 body, 600
UI/labels, 600 Fraunces display. No 500/700/800 variants.

### 3.3 Spacing, depth, radius

- 4px base; allowed steps 2, 3, 4, 6, 8, 12 (Tailwind units). Card padding `p-4` phone, `p-6`
  from `sm`. Gap between cards `gap-4`; between sections `space-y-8`. Page gutter `px-4`, max width
  `max-w-3xl` for the record (it is a single-column certificate, the phone case is the design
  case), `max-w-5xl` only for compare.
- Radius: scope sets `--radius: 0.375rem` (squarer than the app's 0.5rem; period-appropriate)
  and components use `rounded-lg/md` only. Medals and the seal are circles.
- Depth: three levels, from the wave-1 shadows. Resting card: `shadow-1` + 1px `--rule` border.
  Interactive hover/press: `shadow-2`. Overlays (share modal): `shadow-3`. Plus the one extra
  `--shadow-seal` (small inner shadow) for the wax seal. No glow, no coloured shadows, no
  `background-attachment: fixed`, no blur except the bottom nav.
- Frame: the identity card (and only that) has a double rule, a 1px `--border` outer and a 1px
  `--rule` inset 4px via `::after`. Section titles are followed by a 1px `--rule` with a centred
  4px gilt diamond (CSS-drawn, ~10 lines).
- Page background: flat `--background` plus one very low-contrast radial paper vignette using
  `--card` at 60%. No image assets, no noise texture (cost, and it hurts contrast).

## 4. Screen anatomy (style only; structure per ux-optimizer)

> Superseded where it conflicts by the final order from `UX_RESTRUCTURE_PLAN.md` and by the
> binding adjustments in "## Concept review" at the end of this file: Points now, Recent
> points, By category, Where you stand. No neighbour rows, compare is retired, tabs are
> "My points" / "Shared with me".

Student home (`/student`), top to bottom, which also fixes the hierarchy:
1. **Identity card**: framed paper card, corner flourish, initials in a Fraunces monogram disc
   (replaces the cyan avatar block), name in `text-4xl font-display`, grade and timeframe as
   small-caps labels. The wax seal sits at the card's corner (decorative, `aria-hidden`).
2. **Point balance**: the single brightest element. Gilt rule above and below, `text-6xl`
   Fraunces numeral in `--gilt-ink` on card, "points" label small caps. This is what the user
   came for; nothing else on the screen uses gilt at this size.
3. **Standing** (overall rank, grade rank): rank 1-3 as medal discs with the numeral inside;
   other ranks as a plain ink numeral in a ruled plate. "Nearby" rows are ruled list rows, the
   student's own row has a left 3px `--primary` bar and `bg-accent`, not a hue change.
4. **Point-group breakdown / distribution**: bars and dots keep their data colours (they are
   data) but every one gets a 1px `--foreground/40` outline and always a text label and value,
   so no information is hue-only. Letter grades become a small ruled badge (letter in ink on
   `--secondary`), not coloured text.
5. **Recent events**: ruled ledger rows, date small caps left, points right in tabular Fraunces.
6. **Bottom nav** (tabs): sticky, `--card` at 95% with the only blur in the theme, hairline
   `--rule` top border, active tab filled `--primary` with `--primary-foreground`, 44px min
   targets (already present), safe-area padding kept.

Compare, Shared points, Share-points modal, link-account and error states all use the same
primitives (plate, ledger row, ruled divider, seal, button variants), so there is nothing
bespoke per screen.

## 5. Motion

All wrapped by the global reduced-motion rule already added in wave 1 and, for JS motion,
`useReducedMotion()` from `motion`. Easing `ease-out` throughout.

| Where | What | Time |
|---|---|---|
| Page entrance | cards fade + 8px rise, stagger 40ms, capped at 4 steps | 200ms |
| Buttons / rows | colour + shadow-1 to shadow-2 on hover/press, `scale(.98)` press | 150ms |
| Tab change | cross-fade of content | 150ms |
| Share modal | fade + 12px rise, backdrop fade | 200ms |
| **Points award** (the celebration) | wax seal "stamps" (scale 1.25 to 1, slight rotate settle) beside the balance, the numeral counts up from its previous visible value, one gilt shimmer sweeps across the balance rule | seal 220ms; count-up 500ms; shimmer 700ms, once |
| Everything else | static | 0 |

The count-up runs only on first load per session (`sessionStorage` flag) and only when the
number is nonzero; with reduced motion the final number simply renders. No looping animation
anywhere. `SparkleBackground` is retired (see 7); decorative particle backgrounds are
disallowed on the student surface (battery, legibility, motion-sickness).

## 6. Rebuild inventory and build order

Phase 0, tokens (blocks everything). `app/globals.css`, `tailwind.config.js`: new global
tokens, `.theme-victorian` scope, font variables, `fontFamily.display`. Verify `npx tsc --noEmit`.
Phase 1, primitives: `app/student/victorian.css` (frame, divider, seal, medal, shimmer) and a
student-local `app/student/ui.tsx` of tiny presentational pieces: `Plate`, `SectionTitle`,
`LedgerRow`, `Medal`, `WaxSeal`, `GradeBadge`, plus a style-only `rankTier(rank)` helper
(maps rank to `gold|silver|bronze|plain`; replaces `rankToColor` for the student surface so
`types/domain.ts` is not touched). Reuse and re-skin via tokens: `components/ui/{button,card,badge}.tsx`,
`MotionButton`, `LoadingLayout` (add a paper-and-rule skeleton).
Phase 2, shell: student `layout.tsx` (root class, fonts), `StickyHeader.tsx` (identity card +
balance), `StudentTabs.tsx` (bottom nav; remove `bg-primary text-white` and the slate pairs).
Phase 3, home content in `page.tsx`: Standing, then `PointDistribution` /
`PointGroupBreakdownBar`, then `RecentEventsWithRankings`; plus the two error/empty states
at the top of `page.tsx`, which currently use the old classes.
Phase 4, secondary screens: `SharedPointsTab`, `SharePointModal`, `compare/page.tsx` and
`compare/components/CompareContainer.tsx`, `scorebook/[groupId]`, `app/linkAccount/student`.
Phase 5, delete (section 7), full dark/light/320px pass, contrast measurement, changelog.
Phase 6 (optional follow-up, not part of this remake): carry `.theme-victorian` to
`app/parent`, which shares the student's mental model but currently has its own styling. Offered
for a separate decision since parent is a different audience.

Phases 1-3 touch the same files ux-optimizer will move things around in. Order: ux-optimizer
lands structure first (their plan), then designer Phases 2-4 on the restructured markup. Phases
0-1 do not depend on them and can start immediately.

## 7. Deleted

- `app/student/student-dashboard.css` (all 44 lines) and its import in `page.tsx`.
- `app/student/victorian-theme.css` (all 955 lines), the three imports of it (`page.tsx`,
  `SharedPointsTab.tsx`, `SharePointModal.tsx`), and every `victorian-*` class name in markup.
  This includes the leaking global `html, body` rule and the `student-console` /
  `student-*` class names.
- `app/student/SparkleBackground.tsx` and `app/student/sparkles-shaders.ts`: unreferenced
  today, motion-heavy, off-direction. If the delete leaves `three`/`@types/three` with zero
  importers, drop them from `package.json` (hand-off to senior-developer; saves a large
  dependency).
- Inline `style={{ color: rankToColor(...) }}` and per-letter hex colouring on the student
  surface. (`rankToColor` and `getLetterGrade` in `types/domain.ts` are shared with other
  surfaces; this plan does not edit them. If the dashboards no longer use them either, deletion
  is a senior-developer decision.)

## 8. Accessibility

- Text: body 4.5:1 minimum in both modes (table in 3.1 lists expected ratios, all computed
  against `--card`/`--background`). Large text (24px+) and control borders/focus ring 3:1.
  Implementing pass must measure every token pair, not trust this table.
- Rules and frames use `--rule` and are decorative; any edge that identifies a control uses
  `--border`/`--input` (3:1).
- No meaning by hue alone: rank has a numeral, medals have the numeral, grades have the letter,
  chart/bar colours have labels and values, own-row marker is a bar plus text weight.
- Gilt text is `--gilt-ink`, never `--gilt`. Burgundy is not used as dark-mode text.
- Minimum type size 12px. Touch targets 44px. Focus ring is the wave-1 global `ring-ring` with
  offset, retuned per mode via `--ring` above.
- Reduced motion: wave-1 global rule disables CSS animation/transition; JS motion gated by
  `useReducedMotion`; shimmer, count-up and seal stamp all have static end states.
- Phone-first: 320px verified, single column, no fixed widths over the viewport, no global
  `overflow-x: hidden` papering over a clip. Projected/wall use is not a student-surface
  concern; the public dashboards stay on the wave-1 neutral tokens.
- Dark and light must both be screenshotted at 320, 390 and 1024 widths before sign-off. I
  cannot render in this planning run, so **human eyes are required** for the paper vignette,
  Fraunces numerals, and medal discs in particular.

## 9. Risks

1. **Font load**: Fraunces adds roughly 40-80 KB (variable, subsetted latin). Mitigation:
   latin subset only, `display: swap`, fallback `Georgia`. If it regresses LCP on mobile, fall
   back to the stack without redesign since sizes are set per token.
2. **Fraunces `lnum`/`tnum` support**: confirm tabular lining figures render in the loaded axis
   subset; if not, set numerals in Geist Sans tabular at the same size (a one-line change).
3. **Data-driven colours** (`pointGroupColor` from the DB, `rankToColor`, letter-grade hex) are
   free-form and may not meet 3:1 on paper. The plan keeps them only as outlined non-text marks.
   Cannot be guaranteed if admins pick pale colours; flagged for backend/product.
4. **Scope leak**: the old file's global `html/body` rule may already have been affecting other
   routes. Removing it could change scrolling/overscroll elsewhere; the QA pass should check
   dashboard and teacher pages for horizontal overflow.
5. **Collision with ux-optimizer** on the same files; mitigated by ordering in section 6.
6. **Burgundy-in-dark** is carried by fills only; if the product owner wants burgundy text in
   dark mode it must be a lighter, pinker token and will look less period. Decision: no.
7. **Scale of rewrite**: ~1,000 CSS lines out, ~150 in, ~1,500 TSX lines restyled (mostly class
   strings, no logic). Phases are individually shippable behind the scope class, so a half-done
   remake never leaves a mixed theme: until Phase 3 completes, the old files stay loaded and
   the new scope is not applied to the root.

## 10. Release level (`docs/RELEASING.md`)

Styling-only change with the same routes, data and access: **PATCH**. Changelog lines under
`Changed` (student pages redesigned; light and dark themes updated) and `Removed` is not used
because no surface or access path is removed. Caution: `scripts/release.mjs` infers **major
for any `Removed` entry**, so do not file the deleted CSS or sparkle effect under `Removed`;
they are internal, group them in the `Changed` line. If ux-optimizer's restructure removes or
relocates a student page, that is theirs to classify, and the combined release takes the higher
level. If the dependency drop (`three`) happens, list it as one internal `Changed` line.

## 11. Hand-offs

**From ux-optimizer** (`docs/design/UX_RESTRUCTURE_PLAN.md`, not yet present when written):
- The final student information architecture: which sections exist on the home screen and in what
  order, and whether Standing, Distribution and Recent events keep their current grouping.
  My hierarchy in section 4 assumes: identity, balance, standing, breakdown, recent events.
- Whether the bottom tab nav stays two-tab (Dashboard / Shared points) or becomes more; it affects
  nav sizing.
- Whether compare stays a student route, and the final empty/error state copy so I style them once.
- A freeze on `app/student/*.tsx` markup before my Phases 2-4 begin.

**From privacy-boundary / `docs/DATA_DISCLOSURE.md`** (before I style anything that shows it):
- The student home currently renders "Nearby Students" (other students' first and last names and
  point totals, overall and by grade) and `compare/`. DISCLOSURE says a student sees their own
  position and denominator and nothing about another student beyond PUBLIC. Style cannot fix this;
  the ruling on whether those rows stay, are anonymised, or are cut decides whether the Standing
  ledger design has neighbour rows at all. I will design the neighbour-less version first and add
  rows only if they are approved.
- Confirm "of N students" (own denominator) is allowed on the student screen. DISCLOSURE says yes
  for the student's own view; I am assuming it.

**From senior-developer / backend**:
- (Optional, a nice-to-have) a `previousTotalPoints` or "points gained since last visit" figure for
  the award celebration so the count-up animates a real delta. Without it I animate from zero
  on first session load. If provided, it is the student's own data only; needs a disclosure check.
- Confirm `pointGroupColor` is validated server-side (hex only) since it feeds inline style.
- Decide on dropping `three` / `@types/three` from `package.json` after the delete.
- A shared `getMedalTier`-style rank classifier is NOT requested; I keep this local.

**To qa**: contrast measurements per token pair in both modes, 320px overflow on every student
route, reduced-motion with OS setting on, and dashboard/teacher pages unchanged from wave 1.

## Concept art requests

Use is optional and limited: the plan above is already specific. Two concepts are worth
having to calibrate the hardest-to-judge pieces (paper vignette, Fraunces numerals, gilt
balance, medal discs, seal). Hex values are approximate renderings of the HSL tokens in 3.1
and are for concept art only; the build uses the tokens, never the hex. All names, numbers and
dates in the mockups must be obvious placeholders (for example "Student Name", "Ada Example",
"0,000 points", "Grade 0"); no real student data.

Shared across both: typography is Fraunces 600 for the name, section titles and all numerals
(lining, tabular figures), Geist Sans for body and small-caps tracked labels (12px, 0.14em).
Ornament vocabulary, and nothing beyond it: a double-rule frame (1px outer, 1px inner inset 4px),
a corner flourish on the identity card only, a centred divider with a small gilt diamond, a
wax seal, and medal discs for ranks 1 to 3. Avoid for both: cyan or blue-black, monospace,
sci-fi HUD, glow or neon, gradient text, emoji, cartoon mascots, stock confetti, lace or filigree
that reduces legibility, paper-texture noise under text, illegible hairline Didone type,
sparkle or particle backgrounds, any text below 12px, anything that implies a leaderboard of
other named students.

### Concept 1: Student home, top of screen (identity card and point balance), light and dark pair
- Subject: `/student` first screen on a phone, showing the identity card, the point balance, and
  the first two lines of the Standing section, plus the bottom tab bar (two tabs, "Dashboard"
  active, "Shared points").
- Purpose: calibrate hierarchy (the gilt balance is the brightest thing), the frame, and
  whether the Victorian vocabulary reads as dignified for adults and warm for children.
- Mood: prize-day certificate, quiet pride, warm. Light mode is paper in daylight; dark mode is the
  same room by gaslight.
- Palette, light: background paper #F7F3EA, card #FDFBF4, ink #272019, burgundy fill #71202F
  with cream text #FBF7EA, gilt fill #D6A929 with ink text, gilt-as-text #784B0C, hairline rule
  #D7CDBB (decorative), control/edge border #8A7B6C.
- Palette, dark: background #191412, card #251F1A, cream ink #F4EFE3, burgundy fill #95374A with
  cream text, gilt fill #DDB74F with #191412 text, gilt-as-text #E8C56B, rule #3A312A, control
  border #7D6F64.
- Typography: name in Fraunces 600 at about 32px on phone; balance numeral in Fraunces 600 at
  about 48px, gilt-ink on card, with a small-caps "POINTS" label; grade and timeframe as 12px
  small-caps labels.
- Ornament: double-rule frame and one corner flourish on the identity card; initials in a
  Fraunces monogram disc; a wax seal (burgundy, simple star or crest, no text) overlapping the
  card's upper-right corner; gilt rules above and below the balance; divider with gilt diamond
  before the Standing section; rank 1 shown as a gold medal disc with the numeral.
- Size: 390 x 844 px portrait (iPhone class), delivered as a side by side pair (light left, dark
  right), plus the same two at 320 x 640 if cheap.
- Avoid: everything in the shared list; do not make the seal or flourish larger than the name;
  do not make any other element gilt at balance size.

### Concept 2: Points-award celebration moment, light mode (with dark variant if cheap)
- Subject: the same balance area at the instant a student's points rise: seal just stamped,
  balance showing a new total, a single gilt shimmer passing across the rule, small "+ points"
  line in small caps. Show as a three-frame storyboard (before, stamp, settled).
- Purpose: define how celebratory the product gets without becoming childish; sets the ceiling
  for the motion in section 5.
- Mood: ceremony. A teacher presenting a prize. Restrained triumph.
- Palette: as Concept 1 light; the shimmer is a soft highlight between gilt #D6A929 and
  paper #FDFBF4, never white-hot, never rainbow. Seal burgundy #71202F.
- Typography: Fraunces 600 numerals about 56px; Geist small caps for "POINTS" and the added
  amount.
- Ornament: wax seal with a slight impression shadow, gilt rule, the divider diamond. Nothing
  else.
- Size: 1200 x 500 px landscape storyboard, three panels, each a crop of the phone balance area.
- Avoid: confetti, fireworks, stars bursting, trophies, emoji, glow halos, any element that
  would need animation longer than about 700ms, anything that suggests a rank or another
  student.

If these are not produced, the build proceeds from sections 2 to 5 unchanged. Concept art is
reference only and is not a dependency for any phase.

## Concept review

Reviewed `docs/design/concepts/01-student-home-light-dark.png` and
`docs/design/concepts/02-points-award-storyboard.png` against sections 2 to 5. The mockups
confirm the direction (paper, burgundy, gilt balance, double-rule frame, Fraunces numerals,
ruled ledger rows) and I adopt them as the visual target. The corrections below are binding and
override the earlier sections where they differ. Hex values in the art are renderings, not
tokens; the art is not pixel-measured, so every pair still needs a tool measurement in the
build.

### Adopt
- Overall composition: framed identity card, centred gilt balance between two gilt rules,
  "Recent points" directly under the balance, ruled event rows with the amount right-aligned,
  two-segment bottom tab bar with the active tab filled burgundy. This matches ux-optimizer's
  order (Points now, then Recent points).
- Dark mode is the right warmth (near-black #191412 family, cream ink, dimmed brass, lighter
  burgundy fill). Light and dark are the same layout, as intended.
- Monogram disc, "Recent points" heading in Fraunces 600 about 24px with Geist event names,
  event date as a second line.
- Storyboard timing and sequence (Before, Stamp, Settled) and the wax seal rendering as a
  reference for the SVG: star impression, irregular edge, soft drop shadow (`--shadow-seal`).
- Diamond-in-rule divider as drawn.

### Reject or correct
1. **Balance colour.** Light mode: the 390px concept renders the numerals as a mid gold
   (about #B8892A), which on paper is roughly 3:1, below the 4.5:1 I committed to for gilt
   text. The storyboard renders the correct deep ochre (about #784B0C family). Decision: the
   balance, "+00" amounts and any gilt text use `--gilt-ink` (light 36 82% 26%, about #784B0C,
   about 6.5:1 on card). The 48px numeral is "large text" and would legally pass at 3:1, but
   projected and small-screen use argue for the stronger value, so no lighter gold. Dark mode
   in the concept (about #E0BB5F on #191412) already passes; keep `--gilt-ink` dark.
   The event "+00" amounts in the light 390 render are the lighter gold too, and at 18px they
   fail. They use `--gilt-ink`.
2. **Muted date text.** Light mode dates (about #9A8B7C on paper) are near 3:1 and fail
   body-text contrast at 14px. Use `--muted-foreground` (25 15% 34%) as specified, never a
   lighter tint. Add a rule: no text colour lighter than `--muted-foreground` anywhere.
   Dark-mode dates are acceptable and already track the token.
3. **Trophy icon on the tab: rejected.** My iconography rule was only "no emoji, no cartoon
   ornament", which left a gap; I am closing it. Iconography rules for the student surface:
   tabs carry text only; the Victorian vocabulary (rules, diamond, seal, medal, flourish) is the
   ornament set and a trophy is not in it; and a trophy implies competition on a screen whose
   job is "my points". Functional icons are allowed only on actions (Share, Back, Close), as a
   single-weight 1.5px outline set from the existing icon libraries, always with a visible text
   label next to it (consistent with UX plan item 4: text plus icon). The "Shared with me"
   people icon is also removed for the same reason. Tab labels are Geist 600 14px (not the
   concept's serif; controls stay in the UI face).
4. **Seal size.** In the 390 concept the seal is about 80px, roughly twice the name's cap
   height, and it overlaps the frame and crowds the name; this breaks my "not larger than the
   name" rule. Decision: on the identity card the seal is 40px (about the name's cap height at
   32px), sits inside the frame at the top-right with 12px clearance, and does not cross the
   border. In the award moment it is 56px (40px at 320 wide) at the numeral's top-right, out of
   layout flow so the numeral never shifts. `aria-hidden`. Static seal on the card is kept
   because the empty-state and idle states need a mark; the stamp animation plays only on the
   award moment.
5. **Corner flourish.** The sprig at the lower left is about 12px at 390 and nearly invisible
   in the 320 render. Adopt the motif, but it must be an inline SVG (not CSS-drawn as stated in
   3.3; update), at least 20px, one stroke weight (1.25px), `currentColor` set to `--gilt-ink`
   in light and `--gilt` in dark, with 8px clearance from any text, `aria-hidden`. It was
   close to "GRADE 0"; move it to the bottom-right of the frame, which is empty. Identity card
   only.
6. **320px variant.** The 320 renders are the 390 layout uniformly scaled to about 73%, so
   labels ("GRADE 0", dates, tab text) appear around 8 to 9px. That is a property of the mockup,
   not a layout that holds the floor. Spec: at 320 nothing scales. Floor stays 12px for labels
   and 14px for dates and tab labels; the name drops to 24px, the balance to 40px; grade and
   term labels flow left-aligned with a 16px gap rather than being spread to the card edges
   (the 390 concept leaves a large dead gap between them); the two tabs share the width at
   about 144px each, which fits "Shared with me" at 14px; event title truncates after one line
   with the amount never wrapping. Check at 320 with 200% browser text zoom.
7. **Storyboard "+ 00 POINTS" type.** Problems: the spaced "+ 00" does not match the list
   format "+00"; the delta line replaces the "POINTS" label after the stamp, so the balance
   loses its unit; it is left-aligned under a centred numeral; and wide-tracked grey caps
   compete with the label style. Spec: keep "POINTS" under the balance always. The delta shows
   as one centred line below it, "+00 points" (no space after the plus, lowercase "points",
   Geist 600 14px, `--foreground`, not tracked), visible for about 2.5 seconds after the stamp,
   then fades out in 200ms; with reduced motion it is shown without fading and stays until
   navigation. It lives in an `aria-live="polite"` region that reads "Earned 00 points" for
   screen readers. Numbers are plain digits, never spaced.
8. **"0,0XX" placeholder.** Rendered as Roman-numeral-looking capital X glyphs at a different
   width, which misleads about the numeral style. The real balance is always lining tabular
   digits, so the layout must not change width during count-up (tabular figures, and the
   container reserves the final width). Future placeholders must be digits (for example
   0,012).
9. **Shimmer.** The storyboard shows a bright yellow-white flare on the lower rule that reads
   as a lens glint and glows. Reject the glow. Spec: a 1px-high highlight travelling along the
   lower rule only, gradient from transparent to `--gilt` to transparent, no blur or bloom, 700ms
   once; end state is the plain solid rule.
10. **Numeral texture.** The storyboard numerals carry a faint embossed or foil texture. Reject;
    flat `--gilt-ink` fill only (texture under 48px text hurts legibility and is a lot of CSS).
11. **Diamonds.** The storyboard has a diamond on both rules, the home concept only on the
    upper. Decision: upper rule only; the lower rule is plain (restraint).
12. **Rank medal missing.** True, and correct as a layout, because the final order moved rank
    out of the header. But a student's own rank has to appear somewhere in the "Points now"
    block. Spec: below the "POINTS" label, one centred line "#7 in your grade" (own rank and
    own denominator, allowed by the student tier in `DATA_DISCLOSURE.md`), Geist 600 14px in
    `--foreground`, with a 28px medal disc beside it only when the rank is 1 to 3 (the numeral is
    inside the disc and the ordinal is still in the text, so nothing is hue-only). The fuller
    "Where you stand" card lower on the page shows overall and grade rank as plain ruled
    plates, medal discs on ranks 1 to 3. No neighbour rows (UX plan 10.2); `/student/compare`
    is retired so Phase 4 deletes it instead of restyling it.
13. **Tab fill in dark mode.** The concept's active tab is a lighter rose burgundy
    (about #A5434F). Fine as a fill, but its cream label must stay at least 4.5:1: measure it;
    if short, lower `--primary` dark lightness from 40% to 36%, not the label.
14. **Frame colour.** The concept draws the frame in a gilt-brown tint. Adopt `--rule` for the
    inner line and `--border` for the outer, as in 3.3, so the frame stays neutral and gilt
    stays reserved for the balance and earned marks. The dark-mode outer frame is faint in the
    art; `--border` dark (3:1) is the floor.

### Token and spec adjustments folded in
- No new tokens. Existing `--gilt-ink`, `--muted-foreground`, `--shadow-seal` carry all of the
  above; the only conditional change is `--primary` dark L 40% to 36% if item 13 measures short.
- 3.3: the corner flourish is an inline SVG (item 5); the seal sizes are 40px / 56px / 40px at
  320 (item 4).
- 3.2: the type floors are 12px labels, 14px dates and tab labels, name 24px at 320 (item 6).
- 4: Points-now block gains a rank line under the "POINTS" label (item 12); tabs are text only
  (item 3).
- 5: the shimmer, delta line and reserved numeral width as in items 7 to 9.
- 6: Phase 4 removes compare instead of restyling it.

### Still needs human eyes
Whether the 40px seal still reads as a seal and not a stray dot on a phone; the Fraunces
numerals at 40px and 48px; the dark-mode frame; and measured contrast for the light "+00"
amounts, the dates, and the dark active tab.

## Rank colour system

> Disclosure ruling: `docs/DATA_DISCLOSURE.md` §10.10 (D8–D10). 21+ neutral endorsed; `rankTier` must take cohort size and return `none` for every rank in a cohort of 21–29; DISPLAY never shows rank 11+; rank change and percentile stay uncoloured, up and down styled identically.

Implements standing decision #5 (rank colour is a system-wide identity). It is the one
exception to my earlier "hue never carries meaning" rule, and it **overrides** these earlier
statements: (a) 3.1's `--medal-gold/silver/bronze` tokens (deleted, replaced below); (b) 4 and
Concept review item 12, which limited medals to ranks 1 to 3 (all tiers are coloured now);
(c) 7, which deleted inline `rankToColor` on the student surface (it is migrated to tokens
instead); (d) 8, "hue never carries meaning". The surviving rule: rank colour is always
accompanied by the rank numeral and ordinal text, is never the only signal, and no other
meaning (points, category, state) may use a rank-tier hue.

This section defines the token layer for every surface. Each surface's own restyle follows its
own pass (student in Phases 2 to 4; dashboards, parent, teacher, admin when their pass is
scheduled); they all read the same tokens.

### R1. Tiers and the single classifier

Eight tiers, fixed hue families as decided: `1` gold, `2` silver, `3` bronze, `4` purple,
`5` teal, `top10` crimson (ranks 6 to 10), `top20` green (11 to 20), `none` neutral (21+).
One pure function is the only place the boundaries live, in a new shared module
(`lib/rankTier.ts`, hand-off to senior-developer): `rankTier(rank, cohortSize) -> '1'|'2'|'3'|'4'|'5'|'top10'|'top20'|'none'`.
It returns `none` for any non-finite, missing or less-than-1 rank, or a missing, non-finite or
less-than-1 `cohortSize`, so unknown never gets a colour. **Cohort gate (`docs/DATA_DISCLOSURE.md`
§10.10 ruling 3):** for `21 <= cohortSize < 30` every rank, including 1st, returns `none`; for
`cohortSize <= 20` or `>= 30` the tier follows the absolute rank only (never rank/N, a percentile
or points). The gate lives only inside this function so no call site can skip it, and each rank
uses its own cohort's N. The CSS side needs no change: it only reads `data-rank-tier`. No colour values in TypeScript.

### R2. Token family (CSS variables, HSL triplets, in `:root` and `.dark` of `app/globals.css`)

Three roles per tier, because one value cannot serve a fill and text on both a pale and a dark
surface (gold is the clear case):
- `--rank-<t>`: the identity colour, for fills (discs, bars, plates, borders, chart marks).
- `--rank-<t>-foreground`: text or numeral placed on that fill.
- `--rank-<t>-ink`: the tier as text or thin line on `--card`/`--background`.

Tuned values. "On" figures are WCAG contrast, estimated by luminance, for the implementing
pass to re-measure and adjust lightness only. Fill-vs-foreground must be at least 4.5:1;
ink-vs-card at least 4.5:1. Fills used as UI marks carry a 1px ring in the `-ink` colour so the
3:1 non-text edge is met without darkening the identity colour.

Light mode (card about #FDFBF4, ink foreground 22 28% 12%, cream foreground 42 48% 97%):

| Tier | fill `--rank-<t>` | `-foreground` | fill/fg | `-ink` | ink on card |
|---|---|---|---|---|---|
| 1 gold | 51 100% 45% (#E6C200) | 22 28% 12% | about 9:1 | 42 100% 24% (about #7A5C00) | about 6:1 |
| 2 silver | 215 8% 56% (about #8B9098) | 22 28% 12% | about 5:1 | 215 10% 34% (about #4E555D) | about 7:1 |
| 3 bronze | 27 60% 37% (about #975A26) | 42 48% 97% | about 5.3:1 | 27 62% 31% (about #80481E) | about 7:1 |
| 4 purple | 300 72% 21% (#5E0F5E) | 42 48% 97% | about 13:1 | 300 72% 21% | about 12:1 |
| 5 teal | 180 100% 21% (#006B6B) | 42 48% 97% | about 6:1 | 180 100% 21% | about 6:1 |
| top10 crimson | 349 80% 35% (#A1122A family) | 42 48% 97% | about 7:1 | 349 80% 35% | about 7.5:1 |
| top20 green | 116 58% 32% (about #237E1F) | 42 48% 97% | about 5:1 | 116 62% 26% (about #1C6619) | about 6.5:1 |
| none | `--secondary` | `--foreground` | about 13:1 | `--foreground` | about 14:1 |

Dark mode (card about #251F1A, cream foreground 40 32% 92%, ink foreground 24 22% 8%):

| Tier | fill `--rank-<t>` | `-foreground` | fill/fg | `-ink` | ink on card |
|---|---|---|---|---|---|
| 1 gold | 50 100% 55% (about #FFD11A) | 24 22% 8% | about 11:1 | 50 100% 55% | about 11:1 |
| 2 silver | 215 8% 65% | 24 22% 8% | about 7:1 | 215 10% 72% | about 8:1 |
| 3 bronze | 27 55% 50% | 24 22% 8% | about 5:1 | 27 62% 58% | about 6:1 |
| 4 purple | 300 45% 36% | 40 32% 95% | about 8:1 | 300 55% 74% | about 6.7:1 |
| 5 teal | 180 70% 28% | 40 32% 95% | about 6:1 | 180 60% 52% | about 7:1 |
| top10 crimson | 349 72% 42% | 40 32% 95% | about 6:1 | 350 90% 72% | about 5.9:1 |
| top20 green | 116 50% 30% | 40 32% 95% | about 7:1 | 116 55% 56% | about 7:1 |
| none | `--secondary` | `--foreground` | about 12:1 | `--foreground` | about 13:1 |

Notes on tuning versus the originals: light-mode silver gained a faint cool cast (215 hue, 8%
saturation) so it does not collapse into the neutral grey; gold keeps its exact hue; light
ink variants are darker than the fills because #E6C200 and #8F8F8F fail as text on paper (about
1.5:1 and about 3:1). Public dashboards run the dark-mode set. The dashboards' current hex
values (`#FFD700`, `#C0C0C0`, `#CD7F32`, `#800080`, `#008080`, `#DC143C`, `#40D13B`, `#FFFFFF`
in `app/dataClasses.ts`) differ from the `types/domain.ts` set; the tokens above replace both.

### R3. Tailwind and scoping so components never touch a hex

`tailwind.config.js` maps one dynamic colour, `rank`, using the alpha-aware form so
`bg-rank/15` works: `rank: { DEFAULT: 'hsl(var(--rank) / <alpha-value>)', foreground: 'hsl(var(--rank-foreground) / <alpha-value>)', ink: 'hsl(var(--rank-ink) / <alpha-value>)' }`.
`app/globals.css` adds one attribute block per tier:
`[data-rank-tier="1"] { --rank: var(--rank-1); --rank-foreground: var(--rank-1-foreground); --rank-ink: var(--rank-1-ink); }`
and so on, with the `none` set as the default on `:root` so an element with no attribute is
neutral. A component sets `data-rank-tier={rankTier(rank)}` and uses `bg-rank text-rank-foreground`,
`text-rank-ink`, `border-rank`, `ring-rank-ink`. All 24 per-tier variables are defined in both
`:root` and `.dark` (rule 2), mapped by the one `rank` colour, and `.theme-victorian` does not
redefine them (the identity is the same on every surface; it is only mode-tuned).
Dynamic class names are therefore avoided (no Tailwind purge problem).

### R4. How the Victorian components use them

- **RankBadge (replaces my Medal):** one component, one shape. A circle, same diameter and
  type weight for every rank. Ranks 1 to 5: solid fill, numeral in `-foreground`, 1px `-ink`
  ring. Ranks 6 to 20: card-coloured disc, 2px ring in `--rank`, numeral in `-ink`.
  21 and over: card-coloured disc, 1px `--border` ring, numeral in `--foreground`, which is
  exactly the default styling of every other number on the page. The ordinal text sits beside
  it ("7th in your grade"). 28px in a line, 40px on a plate.
- **Plates (Where you stand):** the rank numeral in Fraunces in `text-rank-ink`, the badge
  beside it, and a 3px top rule in `--rank` for tiers 1 to 20. Neutral plates have the normal
  `--rule` top rule.
- **Ledger rows:** rows are not rank-coloured. Points stay `--gilt-ink`. Only rows that show a
  rank (for example a rank on an event) get the badge. Gilt is a brand colour for points and
  must never be used for rank text, so the balance and rank 1 gold are never confused: gilt
  text is deep ochre (hue 36), rank-1 gold fills are bright yellow (hue 51) and always have a
  numeral inside.
- **Hierarchy:** the balance stays the brightest element. Rank is never larger than the balance.
- **Dashboards, parent, teacher, admin:** same tokens and attribute, via the surface's own
  classes: the metal/gradient treatments on the public dashboards may be built from `--rank`
  with `color-mix(in srgb, hsl(var(--rank)) 70%, white)`, but the base is always the token.

### R5. Crimson versus the burgundy brand primary: resolved by moving the brand

6th to 10th crimson (349 80% 35%) and my burgundy primary (350 58% 28%) are the same hue, 7
points of lightness and 22 points of saturation apart. A burgundy tab bar next to a crimson rank
badge would make "red" ambiguous between "brand" and "rank 6 to 10". The tier hue is fixed, so
the brand moves. Decision: **primary becomes ink sapphire**, a hue no tier uses (teal at 180 and
purple at 300 are both at least 35 degrees away, and sapphire was already in the original
Victorian palette).

Changes to 3.1 (both modes defined):
- `--primary`: light 215 55% 24% (about #1B3B5F), dark 215 48% 36%.
- `--primary-foreground`: light 42 48% 97%, dark 42 48% 96%. Contrast about 11:1 and about 7:1.
- `--ring`: light 215 60% 34%, dark unchanged (43 72% 62%).
- `--info` stays distinct enough in use (it is feedback, never a tab or fill); no change.
- New `--seal`: light 8 50% 26%, dark 8 46% 34%, a browner oxblood than crimson (hue 8 versus
  349, darker, less saturated). Used only for the decorative wax seal (always `aria-hidden`, never
  adjacent to a rank badge); the seal keeps its red character because a seal is the Victorian
  object. Add `--seal` to both modes and map it.
- Concept art: the tab fill and the focus ring in `docs/design/concepts/*` show burgundy. They
  are superseded: tabs and primary buttons are sapphire. The seal, flourish, frame and gilt balance
  stand as reviewed.
- "Burgundy text" rules in 3.1 are moot; ink sapphire as text on paper is about 11:1.
- `--warning` (amber 36 90% 40%) is also near rank-1 gold; warning is only ever an icon plus text
  on a feedback strip, never beside a rank. Rule added.

### R6. Privacy and stigma check on the tier boundaries

The privacy ruling still applies: no styling that marks a rank as low.
- Rank 21 and over is the default style, not a stigma style. It has no grey, dimming, opacity,
  strikethrough, smaller size or lighter weight. The old `rankToColor` returned `#FFFFFF` for
  21+ in the dashboards file (invisible on light surfaces) and `rankToBackgroundColor` returned
  black; both are stigmatising or broken and are deleted. The new `none` tier is literally
  `--foreground` on `--secondary`.
- The boundary is not a visible cliff: the disc keeps the same size and shape across all tiers;
  only the ring and fill change. Rank 20 (green ring) to 21 (neutral ring) is the same change as
  4 to 5.
- For most schools the majority is in the neutral tier. That is the point: neutral is the
  normal state and colour marks distinction. A mid-pack student sees ordinary type, not a
  "lesser" colour.
- Colour is derived only from a rank that is already displayed, so it discloses nothing the
  numeral does not. Nothing may be coloured by rank where the numeral is not shown (for example a
  bar, row tint or avatar ring on its own).
- Rank colour must not be applied to: points totals, percentiles, "rank change" (up or down),
  grade letters, or negative events. Movement down is shown neutrally, never in crimson.
- No red/crimson fill is used for any "worse" signal anywhere; destructive and warning tokens
  stay for actions and system messages.

### R7. Migration of current call sites (builds on `rankTier` plus the tokens)

There are two divergent implementations today, which is itself a defect: `types/domain.ts:706`
returns darker strings (`#E6C200`, ..., `#444444` beyond 20), `app/dataClasses.ts:894` returns
`Color` objects with the older brighter hex and white beyond 20. The first feeds the student
surface, the second the dashboards.
`rankToDarkColor` (`types/domain.ts` about line 750) is broken: it compares against the old
hex values (`#FFD700`, `#C0C0C0`, ...), but `rankToColor` now returns different hex, so it
never matches and always returns `#333333`. It has no callers and is deleted.

| Site | Today | Migration |
|---|---|---|
| `types/domain.ts` `rankToColor`, `rankToBackgroundColor`, `rankToColorWithOpacity`, `rankToDarkColor` | four hex helpers (one broken, one returns black for 21+, one string-concats an alpha byte) | Delete all four after the call sites below move. `rankTier` lives in `lib/rankTier.ts`. |
| `app/dataClasses.ts` `rankToColor`, `rankToBackgroundColor`, `rankToTextGradient` | `Color` objects, white for 21+; the gradient helper is a stub of bare expression statements that returns nothing | Delete. Keep `metalStyle`, `metalTextShadow`, `shinyBackgroundStyle` only if still used, and change them to accept a CSS colour string such as `hsl(var(--rank))`. |
| `app/student/page.tsx` (lines about 69, 205, 212: `themeColor`, two inline `style={{color: rankToColor(...)}}`) and the nearby-row colouring | inline hex per rank | `data-rank-tier` plus `text-rank-ink` / `RankBadge`. Remove `themeColor`. The nearby rows are removed by the UX plan anyway. |
| `app/student/RecentEventsWithRankings.tsx` (about line 120) | inline `rankToColor` on the rank/points | Rank text uses `text-rank-ink`; the points amount uses `--gilt-ink`. Do not colour points by rank. |
| `app/dashboard/featured/screens/AnimatedFeatured.tsx` (spotlight borderLeft about line 98, grade tiles `--rank-color` about line 126) | `rankToColor(...).hex()` into inline styles and a `--rank-color` custom property | `data-rank-tier` on the element; `featured.css` reads `hsl(var(--rank))`; the existing `--rank-color` custom property is renamed to the global `--rank`. |
| `app/dashboard/featured/screens/ScrollingLeaderboard.tsx` (row render about line 65) | rank <= 3 gets special classes, plus `rankToColor` | Row gets `data-rank-tier`; the top-3 special-casing becomes tier styling for all tiers. |
| `app/dashboard/featured/screens/TopStudentsByGroup.tsx` (about line 75) | `metalStyle(rankToColor(i+1))` | `metalStyle` from tokens, `index + 1` is the rank. |
| `app/dashboard/mobile/page.tsx` (about lines 47 to 60 and 174 to 187) | `Color` `.darken(0.5/0.25)` for text and borders | Replace the colour math with `-ink` / `-foreground` / border `--rank`. |
| `app/dashboard/topCards/page.tsx` (about line 140) | `Color(...).lighten(0.5)` | Use `--rank-foreground` (text on a tier-filled card) and verify it per mode; no lighten maths. |

After migration `chroma`/`color` imports may become unused in those files; the implementer
removes them if so. The implementation (call sites, `lib/rankTier.ts`, deletes) is
senior-developer/developer work; the tokens, tailwind mapping and `data-rank-tier` CSS are
designer work (Phase 0). Public-dashboard files are in other agents' parallel edits; sequence
after those land.

### R8. Accessibility

Contrast figures are in R2 and must be re-measured per pair in both modes, including
`-foreground` on fill and `-ink` on `--card`, `--background` and `--secondary`. Tier is never
the only signal: every colour comes with the numeral and an ordinal in text. Rank-tier colours
are not used where the numeral is missing. Colour-blind check: pairs that confuse under
common deficiencies are crimson and green (6 to 10 versus 11 to 20) and bronze and green;
these are separated by the numeral and by the badge style (filled versus ringed would not help
there, so the numeral carries it), and a simulator pass is a QA item. Reduced motion is
unaffected (no animation is attached to tiers).

### R9. Release level and changelog

Styling only, PATCH, alongside the remake. Add one `Changed` line: rank colours are now
the same on every screen and readable in light and dark. Deleting dead colour helpers is internal.
Do not file anything under `Removed`.

### R10. Hand-offs

- **privacy-boundary:** (1) confirm that colouring a rank that is already shown discloses
  nothing new, and that the neutral 21+ treatment (plain default, same size and weight) satisfies
  "no special styling that marks a rank as low", including on a student's own screen and on the
  parent screen for multiple children; (2) confirm that a coloured tier 1 to 20 beside a plain
  21+ is acceptable on the public dashboards when the cut exceeds 20 (large schools); (3) confirm
  rank-change and percentile stay uncoloured (R6).
- **senior-developer:** `lib/rankTier.ts`, the call-site migration in R7, delete the dead helpers
  (the broken `rankToDarkColor`, the stub `rankToTextGradient`), remove unused colour libraries
  afterwards.
- **designer (me):** Phase 0 additions: 24 rank variables per mode, `--seal`, new `--primary`
  and `--ring` values, `rank` colour in tailwind, `[data-rank-tier]` blocks. Replaces
  `--medal-*` in Phase 0.
- **qa:** measure every pair in R2; colour-blind simulation of tiers; check that nothing but a
  displayed numeral carries tier colour.

## Phase 0-1 implementation record (2026-10-14)

Built: tokens, `.theme-victorian` scope, `[data-rank-tier]` blocks and the `rank`, `gilt`, `rule`,
`seal` colours, `shadow-seal` and `font-display` in `app/globals.css` and `tailwind.config.js`;
`app/student/victorian.css` (about 190 lines, tokens only); `app/student/ui.tsx` (`Plate`, `Frame`,
`SectionTitle`, `LedgerRow`, `RankBadge`, `WaxSeal`, `GradeBadge`, `Flourish`). Not yet imported by
any screen. The `--medal-*` tokens were never created (replaced by the rank family). Not built
(other owners): `lib/rankTier.ts`, call-site migration, the Fraunces `next/font` load and
`--font-display` (Phase 2, student layout; Georgia until then), deleting the old CSS.

Deviations from the text above, all forced by measurement:
- `--destructive` victorian dark 0 62% 55% to 0 72% 64% (text on card was 3.7:1).
- Ringed rank badges (6 to 20) and the plate top rule are drawn in `--rank-ink`, not `--rank`: the
  dark crimson and green fills were 2.6:1 and 2.8:1 against the card. Same hue, mode-tuned.
- Dark `--primary` stays 215 48% 36% (label passes). Dark primary is never used as text.
- Neutral tier is declared on `:root, .theme-victorian, [data-rank-tier="none"]` as `var(--secondary)`
  and `var(--foreground)` so it follows the scope it sits in (a var() on `:root` alone would resolve
  to the global secondary). Note: an unattributed element inside a tiered parent inherits that
  tier's `--rank`; set `data-rank-tier` on the badge/plate only, never on a wrapper.
- Global (`:root`/`.dark`) values for `--gilt*`, `--rule`, `--seal`, `--rank-*` are the same
  family; `--rule` is hue-shifted to the wave-1 blue-grey (214 20% 80% / 217 20% 26%).
- Wave-1 pairs that fail and were left alone (not part of this pass): global light `--border` on
  card (1.3:1, hairline only, `--input` is the control edge), global dark `--destructive` on card
  (1.8:1, it is a fill). Flag for qa.

### Contrast measurements

Produced by `node scripts/contrast-tokens.mjs --md` (reads `app/globals.css`; exits 1 on any
failure, so qa can re-run it). WCAG 2.x, text 4.5:1, UI edges 3:1. 192 pairs, 0 failing.
Global contexts gate only the new families (gilt, seal, rank).

#### global light

| Foreground | on | Min | Measured | Result |
|---|---|---|---|---|
| `gilt-foreground` | `gilt` | 4.5:1 | 7.32:1 | pass |
| `gilt-ink` | `card` | 4.5:1 | 7.29:1 | pass |
| `gilt-ink` | `background` | 4.5:1 | 6.96:1 | pass |
| `gilt-ink` | `secondary` | 4.5:1 | 6.66:1 | pass |
| `seal-foreground` | `seal` | 4.5:1 | 10.55:1 | pass |
| `rank-1-foreground` | `rank-1` | 4.5:1 | 9.59:1 | pass |
| `rank-1-ink` | `card` | 4.5:1 | 6.66:1 | pass |
| `rank-1-ink` | `background` | 4.5:1 | 6.36:1 | pass |
| `rank-1-ink` | `secondary` | 4.5:1 | 6.08:1 | pass |
| `rank-2-foreground` | `rank-2` | 4.5:1 | 4.96:1 | pass |
| `rank-2-ink` | `card` | 4.5:1 | 7.50:1 | pass |
| `rank-2-ink` | `background` | 4.5:1 | 7.17:1 | pass |
| `rank-2-ink` | `secondary` | 4.5:1 | 6.85:1 | pass |
| `rank-3-foreground` | `rank-3` | 4.5:1 | 5.30:1 | pass |
| `rank-3-ink` | `card` | 4.5:1 | 7.19:1 | pass |
| `rank-3-ink` | `background` | 4.5:1 | 6.86:1 | pass |
| `rank-3-ink` | `secondary` | 4.5:1 | 6.57:1 | pass |
| `rank-4-foreground` | `rank-4` | 4.5:1 | 11.87:1 | pass |
| `rank-4-ink` | `card` | 4.5:1 | 12.50:1 | pass |
| `rank-4-ink` | `background` | 4.5:1 | 11.94:1 | pass |
| `rank-4-ink` | `secondary` | 4.5:1 | 11.42:1 | pass |
| `rank-5-foreground` | `rank-5` | 4.5:1 | 6.00:1 | pass |
| `rank-5-ink` | `card` | 4.5:1 | 6.33:1 | pass |
| `rank-5-ink` | `background` | 4.5:1 | 6.04:1 | pass |
| `rank-5-ink` | `secondary` | 4.5:1 | 5.78:1 | pass |
| `rank-top10-foreground` | `rank-top10` | 4.5:1 | 7.58:1 | pass |
| `rank-top10-ink` | `card` | 4.5:1 | 7.98:1 | pass |
| `rank-top10-ink` | `background` | 4.5:1 | 7.62:1 | pass |
| `rank-top10-ink` | `secondary` | 4.5:1 | 7.29:1 | pass |
| `rank-top20-foreground` | `rank-top20` | 4.5:1 | 4.69:1 | pass |
| `rank-top20-ink` | `card` | 4.5:1 | 6.58:1 | pass |
| `rank-top20-ink` | `background` | 4.5:1 | 6.28:1 | pass |
| `rank-top20-ink` | `secondary` | 4.5:1 | 6.01:1 | pass |

#### global dark

| Foreground | on | Min | Measured | Result |
|---|---|---|---|---|
| `gilt-foreground` | `gilt` | 4.5:1 | 8.95:1 | pass |
| `gilt-ink` | `card` | 4.5:1 | 10.71:1 | pass |
| `gilt-ink` | `background` | 4.5:1 | 11.72:1 | pass |
| `gilt-ink` | `secondary` | 4.5:1 | 8.57:1 | pass |
| `seal-foreground` | `seal` | 4.5:1 | 7.74:1 | pass |
| `rank-1-foreground` | `rank-1` | 4.5:1 | 13.24:1 | pass |
| `rank-1-ink` | `card` | 4.5:1 | 13.19:1 | pass |
| `rank-1-ink` | `background` | 4.5:1 | 14.43:1 | pass |
| `rank-1-ink` | `secondary` | 4.5:1 | 10.55:1 | pass |
| `rank-2-foreground` | `rank-2` | 4.5:1 | 7.35:1 | pass |
| `rank-2-ink` | `card` | 4.5:1 | 8.99:1 | pass |
| `rank-2-ink` | `background` | 4.5:1 | 9.83:1 | pass |
| `rank-2-ink` | `secondary` | 4.5:1 | 7.18:1 | pass |
| `rank-3-foreground` | `rank-3` | 4.5:1 | 5.38:1 | pass |
| `rank-3-ink` | `card` | 4.5:1 | 6.80:1 | pass |
| `rank-3-ink` | `background` | 4.5:1 | 7.44:1 | pass |
| `rank-3-ink` | `secondary` | 4.5:1 | 5.43:1 | pass |
| `rank-4-foreground` | `rank-4` | 4.5:1 | 6.80:1 | pass |
| `rank-4-ink` | `card` | 4.5:1 | 8.53:1 | pass |
| `rank-4-ink` | `background` | 4.5:1 | 9.33:1 | pass |
| `rank-4-ink` | `secondary` | 4.5:1 | 6.82:1 | pass |
| `rank-5-foreground` | `rank-5` | 4.5:1 | 4.69:1 | pass |
| `rank-5-ink` | `card` | 4.5:1 | 9.49:1 | pass |
| `rank-5-ink` | `background` | 4.5:1 | 10.38:1 | pass |
| `rank-5-ink` | `secondary` | 4.5:1 | 7.59:1 | pass |
| `rank-top10-foreground` | `rank-top10` | 4.5:1 | 5.79:1 | pass |
| `rank-top10-ink` | `card` | 4.5:1 | 6.98:1 | pass |
| `rank-top10-ink` | `background` | 4.5:1 | 7.64:1 | pass |
| `rank-top10-ink` | `secondary` | 4.5:1 | 5.58:1 | pass |
| `rank-top20-foreground` | `rank-top20` | 4.5:1 | 5.33:1 | pass |
| `rank-top20-ink` | `card` | 4.5:1 | 8.90:1 | pass |
| `rank-top20-ink` | `background` | 4.5:1 | 9.74:1 | pass |
| `rank-top20-ink` | `secondary` | 4.5:1 | 7.12:1 | pass |

#### victorian light

| Foreground | on | Min | Measured | Result |
|---|---|---|---|---|
| `foreground` | `background` | 4.5:1 | 15.08:1 | pass |
| `muted-foreground` | `background` | 4.5:1 | 6.54:1 | pass |
| `foreground` | `card` | 4.5:1 | 16.00:1 | pass |
| `muted-foreground` | `card` | 4.5:1 | 6.94:1 | pass |
| `foreground` | `secondary` | 4.5:1 | 13.53:1 | pass |
| `muted-foreground` | `secondary` | 4.5:1 | 5.87:1 | pass |
| `foreground` | `muted` | 4.5:1 | 13.78:1 | pass |
| `muted-foreground` | `muted` | 4.5:1 | 5.98:1 | pass |
| `foreground` | `accent` | 4.5:1 | 13.02:1 | pass |
| `muted-foreground` | `accent` | 4.5:1 | 5.65:1 | pass |
| `card-foreground` | `card` | 4.5:1 | 16.00:1 | pass |
| `popover-foreground` | `popover` | 4.5:1 | 16.00:1 | pass |
| `primary-foreground` | `primary` | 4.5:1 | 11.26:1 | pass |
| `secondary-foreground` | `secondary` | 4.5:1 | 12.73:1 | pass |
| `accent-foreground` | `accent` | 4.5:1 | 13.02:1 | pass |
| `destructive-foreground` | `destructive` | 4.5:1 | 7.20:1 | pass |
| `success-foreground` | `success` | 4.5:1 | 8.05:1 | pass |
| `warning-foreground` | `warning` | 4.5:1 | 4.73:1 | pass |
| `info-foreground` | `info` | 4.5:1 | 9.02:1 | pass |
| `destructive` | `card` | 4.5:1 | 7.33:1 | pass |
| `success` | `card` | 4.5:1 | 8.19:1 | pass |
| `info` | `card` | 4.5:1 | 9.18:1 | pass |
| `primary` | `card` | 4.5:1 | 11.46:1 | pass |
| `primary` | `background` | 4.5:1 | 10.79:1 | pass |
| `border` | `card` | 3:1 | 3.67:1 | pass |
| `border` | `background` | 3:1 | 3.45:1 | pass |
| `input` | `card` | 3:1 | 3.67:1 | pass |
| `ring` | `card` | 3:1 | 8.01:1 | pass |
| `ring` | `background` | 3:1 | 7.55:1 | pass |
| `gilt-foreground` | `gilt` | 4.5:1 | 7.32:1 | pass |
| `gilt-ink` | `card` | 4.5:1 | 7.04:1 | pass |
| `gilt-ink` | `background` | 4.5:1 | 6.64:1 | pass |
| `gilt-ink` | `secondary` | 4.5:1 | 5.96:1 | pass |
| `seal-foreground` | `seal` | 4.5:1 | 10.55:1 | pass |
| `rank-1-foreground` | `rank-1` | 4.5:1 | 9.59:1 | pass |
| `rank-1-ink` | `card` | 4.5:1 | 6.43:1 | pass |
| `rank-1-ink` | `background` | 4.5:1 | 6.06:1 | pass |
| `rank-1-ink` | `secondary` | 4.5:1 | 5.44:1 | pass |
| `rank-2-foreground` | `rank-2` | 4.5:1 | 4.96:1 | pass |
| `rank-2-ink` | `card` | 4.5:1 | 7.25:1 | pass |
| `rank-2-ink` | `background` | 4.5:1 | 6.83:1 | pass |
| `rank-2-ink` | `secondary` | 4.5:1 | 6.13:1 | pass |
| `rank-3-foreground` | `rank-3` | 4.5:1 | 5.30:1 | pass |
| `rank-3-ink` | `card` | 4.5:1 | 6.94:1 | pass |
| `rank-3-ink` | `background` | 4.5:1 | 6.54:1 | pass |
| `rank-3-ink` | `secondary` | 4.5:1 | 5.87:1 | pass |
| `rank-4-foreground` | `rank-4` | 4.5:1 | 11.87:1 | pass |
| `rank-4-ink` | `card` | 4.5:1 | 12.08:1 | pass |
| `rank-4-ink` | `background` | 4.5:1 | 11.38:1 | pass |
| `rank-4-ink` | `secondary` | 4.5:1 | 10.21:1 | pass |
| `rank-5-foreground` | `rank-5` | 4.5:1 | 6.00:1 | pass |
| `rank-5-ink` | `card` | 4.5:1 | 6.11:1 | pass |
| `rank-5-ink` | `background` | 4.5:1 | 5.76:1 | pass |
| `rank-5-ink` | `secondary` | 4.5:1 | 5.17:1 | pass |
| `rank-top10-foreground` | `rank-top10` | 4.5:1 | 7.58:1 | pass |
| `rank-top10-ink` | `card` | 4.5:1 | 7.71:1 | pass |
| `rank-top10-ink` | `background` | 4.5:1 | 7.27:1 | pass |
| `rank-top10-ink` | `secondary` | 4.5:1 | 6.52:1 | pass |
| `rank-top20-foreground` | `rank-top20` | 4.5:1 | 4.69:1 | pass |
| `rank-top20-ink` | `card` | 4.5:1 | 6.36:1 | pass |
| `rank-top20-ink` | `background` | 4.5:1 | 5.99:1 | pass |
| `rank-top20-ink` | `secondary` | 4.5:1 | 5.37:1 | pass |

#### victorian dark

| Foreground | on | Min | Measured | Result |
|---|---|---|---|---|
| `foreground` | `background` | 4.5:1 | 15.68:1 | pass |
| `muted-foreground` | `background` | 4.5:1 | 9.05:1 | pass |
| `foreground` | `card` | 4.5:1 | 14.13:1 | pass |
| `muted-foreground` | `card` | 4.5:1 | 8.16:1 | pass |
| `foreground` | `secondary` | 4.5:1 | 12.02:1 | pass |
| `muted-foreground` | `secondary` | 4.5:1 | 6.94:1 | pass |
| `foreground` | `muted` | 4.5:1 | 12.45:1 | pass |
| `muted-foreground` | `muted` | 4.5:1 | 7.19:1 | pass |
| `foreground` | `accent` | 4.5:1 | 10.76:1 | pass |
| `muted-foreground` | `accent` | 4.5:1 | 6.21:1 | pass |
| `card-foreground` | `card` | 4.5:1 | 14.13:1 | pass |
| `popover-foreground` | `popover` | 4.5:1 | 14.13:1 | pass |
| `primary-foreground` | `primary` | 4.5:1 | 7.09:1 | pass |
| `secondary-foreground` | `secondary` | 4.5:1 | 12.02:1 | pass |
| `accent-foreground` | `accent` | 4.5:1 | 10.76:1 | pass |
| `destructive-foreground` | `destructive` | 4.5:1 | 5.44:1 | pass |
| `success-foreground` | `success` | 4.5:1 | 7.46:1 | pass |
| `warning-foreground` | `warning` | 4.5:1 | 9.29:1 | pass |
| `info-foreground` | `info` | 4.5:1 | 7.62:1 | pass |
| `destructive` | `card` | 4.5:1 | 4.90:1 | pass |
| `success` | `card` | 4.5:1 | 6.72:1 | pass |
| `info` | `card` | 4.5:1 | 6.86:1 | pass |
| `border` | `card` | 3:1 | 4.00:1 | pass |
| `border` | `background` | 3:1 | 4.44:1 | pass |
| `input` | `card` | 3:1 | 4.00:1 | pass |
| `ring` | `card` | 3:1 | 9.17:1 | pass |
| `ring` | `background` | 3:1 | 10.18:1 | pass |
| `gilt-foreground` | `gilt` | 4.5:1 | 8.95:1 | pass |
| `gilt-ink` | `card` | 4.5:1 | 9.69:1 | pass |
| `gilt-ink` | `background` | 4.5:1 | 10.76:1 | pass |
| `gilt-ink` | `secondary` | 4.5:1 | 8.25:1 | pass |
| `seal-foreground` | `seal` | 4.5:1 | 7.74:1 | pass |
| `rank-1-foreground` | `rank-1` | 4.5:1 | 13.24:1 | pass |
| `rank-1-ink` | `card` | 4.5:1 | 11.94:1 | pass |
| `rank-1-ink` | `background` | 4.5:1 | 13.24:1 | pass |
| `rank-1-ink` | `secondary` | 4.5:1 | 10.15:1 | pass |
| `rank-2-foreground` | `rank-2` | 4.5:1 | 7.35:1 | pass |
| `rank-2-ink` | `card` | 4.5:1 | 8.13:1 | pass |
| `rank-2-ink` | `background` | 4.5:1 | 9.02:1 | pass |
| `rank-2-ink` | `secondary` | 4.5:1 | 6.92:1 | pass |
| `rank-3-foreground` | `rank-3` | 4.5:1 | 5.38:1 | pass |
| `rank-3-ink` | `card` | 4.5:1 | 6.15:1 | pass |
| `rank-3-ink` | `background` | 4.5:1 | 6.82:1 | pass |
| `rank-3-ink` | `secondary` | 4.5:1 | 5.23:1 | pass |
| `rank-4-foreground` | `rank-4` | 4.5:1 | 6.80:1 | pass |
| `rank-4-ink` | `card` | 4.5:1 | 7.71:1 | pass |
| `rank-4-ink` | `background` | 4.5:1 | 8.56:1 | pass |
| `rank-4-ink` | `secondary` | 4.5:1 | 6.56:1 | pass |
| `rank-5-foreground` | `rank-5` | 4.5:1 | 4.69:1 | pass |
| `rank-5-ink` | `card` | 4.5:1 | 8.59:1 | pass |
| `rank-5-ink` | `background` | 4.5:1 | 9.53:1 | pass |
| `rank-5-ink` | `secondary` | 4.5:1 | 7.30:1 | pass |
| `rank-top10-foreground` | `rank-top10` | 4.5:1 | 5.79:1 | pass |
| `rank-top10-ink` | `card` | 4.5:1 | 6.31:1 | pass |
| `rank-top10-ink` | `background` | 4.5:1 | 7.01:1 | pass |
| `rank-top10-ink` | `secondary` | 4.5:1 | 5.37:1 | pass |
| `rank-top20-foreground` | `rank-top20` | 4.5:1 | 5.33:1 | pass |
| `rank-top20-ink` | `card` | 4.5:1 | 8.05:1 | pass |
| `rank-top20-ink` | `background` | 4.5:1 | 8.94:1 | pass |
| `rank-top20-ink` | `secondary` | 4.5:1 | 6.85:1 | pass |
