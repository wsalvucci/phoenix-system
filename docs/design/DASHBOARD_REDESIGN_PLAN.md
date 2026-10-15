# Dashboard and paired-display redesign: plan

Author: designer. Status: PLAN ONLY, no code or styles changed. Date: 2026-10-14.
Scope: `app/dashboard/` (hub `page.tsx`, `featured`, `global`, `mobile`, `topCards`, `feature` redirect) and the paired-display experience under `app/display/` (`KioskPairing`, `pair`).

Binding inputs, in order of precedence: `docs/DATA_DISCLOSURE.md` (DISPLAY tier section 4, section 7.5, section 10.10 D8/D9/D10, section 10.14 D17, section 10.15 P-1/P-2), standing decision #5 (rank color identity), then this plan. Where this plan and the disclosure document disagree, the disclosure document wins.

## 1. Direction

**A sibling of the Victorian parlor, called the Honor Board.** Same vocabulary, different register. The student surface is a parlor read at arm's length: plates, seals, gilt hairlines, fine ornament. A hallway wall is read from 10 to 30 feet, by a crowd, in passing. So it keeps the family resemblance (gilt rule, wax-seal rank medallion, engraved-plate rows, serif display numerals, one corner-bracket frame) at three times the scale and a tenth of the ornament, with no hairlines thinner than 3 px at 1080p and nothing busy behind text. Think "school honors board in the entrance hall, lit at night", not "the parlor itself".

Why a sibling and not the parlor verbatim: parlor detail (1 px rules, 12 to 14 px small caps, textured plates) is illegible across a corridor and shimmers on a TV. Why not a separate look: a student sees their own name in gold on their phone and then on the wall; that recognition is the reward.

Decisions:

1. **Dark is the default for walls, and it is the parlor's dark: warm gaslight, never blue-black.** Light is a supported option and is warm paper, not cool white. Hallway TVs are emissive; a white field at 1080p glares and burns in. Both modes use only tokens and both must pass contrast (section 4.3). The wall owns its mode as a device setting, independent of `ThemeProvider`, because a paired device has no user theme. Implementation: a wrapper class (`.honor-board`) that applies the `.dark` (or light) variables. **Token status, checked against `app/globals.css`:** `--gilt*`, `--seal*` and `--rank-*` are already correct, but `--background`, `--card`, `--foreground`, `--muted-foreground`, `--border` and `--rule` still hold the wave-1 slate/blue-black values (dark `--background` 222.2 84% 4.9%). The parlor plan (`VICTORIAN_REMAKE_PLAN.md` token table) retunes these to warm values. The wall adopts those same warm values and defines no palette of its own. If the remake's token change has landed, the wall just uses the tokens; if not, Phase 0 lands that one token change (shared with the remake, identical values) rather than a wall-only override. Blue-black was not a deliberate choice for TVs: warm near-black is also kinder on a hallway wall at night and keeps gilt and cream ink in one room with the phone.
2. **Tokens, not hex.** The current display uses a private palette in `featured.css` / `global.css` (`#f4f6fc`, `#9caec8`, `#bbf775` mint, `#20322d`, `#18253b`, `#354966`, aurora blobs). All of it is retired. Surfaces use `--background`, `--card`, `--border`, `--rule`, `--foreground`, `--muted-foreground`; ornament uses `--gilt`, `--gilt-ink`, `--seal`; rank identity uses `--rank-1..5`, `--rank-top10` with their `-foreground` and `-ink` partners. Mint is dropped: gilt is the one celebratory color, so the brightest thing is the leader.
3. **Rank color identity (standing decision #5).** Tier comes only from `displayRankTier(rank)` (`lib/rankTier.ts`). Color sits only on the rank medallion (fill, numeral and a ring), which always prints the numeral it comes from. **Points are never rank-colored: they are `--gilt-ink` on every row and plate, and names stay `--foreground`** (parlor rank section: "Ledger rows are not rank-colored. Points stay `--gilt-ink`"; rank color must not be applied to points totals). No row tint, bar, plate edge or glow takes a rank color. Gilt text is deep ochre (hue 36) and rank-1 gold is a bright yellow fill (hue 51) with a numeral always inside, so they are not confused. One deliberate difference from the student card, where the balance is the brightest element and rank is never larger than it: on a leaderboard the rank organizes the page, and the medallion is one fixed 72 px size on every row and plate (see the medallion rule below), so it is never larger than the points figure and points remain the brightest text. Tied students share a rank and so a tier. Per D9 a wall only shows tiers `1`, `2`, `3`, `4`, `5`, `top10`; `top20` and `none` have no wall rendering. A row with rank above 10 renders nothing and is logged (a cut violation, not a styling case).
4. **Celebrate, never shame.** No "bottom", no "rest of the school", no counts, no "N shown", no "of N", no ghost rows, no rank-movement arrows (D10), no "Moving up", no team panels. Copy is about what students did, never who is missing. An empty board is "Your story starts here", not "No data".
5. **One board per scene.** Each `DisplayBoard` renders alone as its own scene (section 3.3 rule 6 of the disclosure document). No scene joins two boards or shows cohorts side by side; the legibility floor leaves no room for a second panel at corridor distance.
6. **No scrolling lists.** The cut caps every board at 10 rows and 10 rows fit a 1080p screen at corridor sizes. The auto-scrolling `ScrollingLeaderboard` (pinned leader plus moving track) is a legibility defect: nobody reads a moving list from across a hall. It is replaced by a static ten-row ledger with a short entrance stagger.
7. **Real assets where they beat CSS.** A small set of production assets (a subtle stage texture, the frame brackets, the seal medallion artwork, the divider, a laurel mark) are commissioned from the art agent (section 10) so the wall does not rely on layered CSS gradients. Text always stays live; assets contain no text and no student data.

### Elevation and shape
- Radius: `--radius` (0.5rem) for plates and rows, `calc(var(--radius) * 2)` for the scene frame; medallions are circles. No other radii.
- Elevation, two levels only: rows are flat on `--card` with a 2 px `--rule` bottom border; the leader plate and scene frame use `--shadow-2` (in dark, plus a 1 px `--gilt` inner line since shadows vanish on near-black). No `--shadow-3` on walls.
- Ornament budget per scene: one frame, one divider under the title, one medallion per row. Nothing else.

### Medallion rule (owner decision, binding)
The seal looked right at phone size and gaudy at 112 to 144 px, where the bevel, scallop, ring and laurel all become visible at once and compete with the name and the points. Decision: **the medallion is one size on every wall surface, 72 px at 1080p (6.7u), podium and podium cards included. Rank 1 to 3 emphasis is carried by the plate, the name and the gilt edge, never by a bigger seal.** Specifically:
- **Size:** 72 px (6.7u), 40 px numeral, 3 px `--rank-N-ink` ring. Phone stays 36 px. No other medallion size exists on a wall (the old 112 and 144 px are retired).
- **Style at wall size: flat.** Flat `--rank-N` fill, one ring, live numeral. No laurel, no bevel or gloss gradient, no drop shadow, no glow, no second inner ring. The scalloped outline of `seal-ring.svg` may stay because it reads as a seal at 72 px, but the artwork must be redrawn with one ring at a 3 px weight (asset 3b). The concept sheets' glossy, laurel-wreathed, beveled medals are rejected as a style reference; the flat discs in the Brief 5 storyboard are the target.
- **Glow is dropped.** No glow on the medallion, the leader plate or the stage. The asset `glow-leader.webp` is retired. The leader is made the brightest thing by plate size, name size and the gilt edge.
- **Emphasis ladder (1080p):**

| | Rank 1 plate | Rank 2 and 3 plates | Ledger row (4 to 10) |
|---|---|---|---|
| Height | 25u | 21u | 9u |
| Medallion | 72 px | 72 px | 72 px |
| Name (Fraunces 600) | 64 px | 52 px | 44 px |
| Points (gilt ink) | 72 px | 60 px | 48 px |
| Edge | 3 px `--gilt` top edge plus gilt sweep at entrance | 2 px `--rule` bottom border | 2 px `--rule` bottom border |
| Surface | leader plate backing (A5) | `--card` | `--card` |

In portrait and on podium cards the same ladder applies with the same sizes. Rank 1 still reads first because it is the tallest plate with the largest name and the only gilt edge.

## 2. Screen inventory and what each is for

All lists come from `getDisplayBoards(schoolId, timeframeId)` (SQL `display_cut`, one call per cohort) and `DisplayStudentRow` (`key`, `rank`, `firstName`, `lastName`, `grade`, `totalPoints`). `DisplayBoards` also gives `timeframes`, `upcomingEvents` (name, date, maxPoints) and per-board `title`/`color`. The redesign needs no other data.

| Route | Today | Purpose after redesign | Who looks at it |
|---|---|---|---|
| `/display` (`KioskPairing`) | Plain code screen | **Pairing wall.** Shows the code for staff to approve; also the re-pair state after revocation. Readable at 10 ft because the approver stands at the TV. | Staff, once |
| `/dashboard` (hub) | Tile list | **Launcher for staff only.** A paired kiosk should not stop here but enter Featured (hand-off H2). Tiles become four scene cards with real thumbnails. | Staff |
| `/dashboard/featured` | Aurora, spotlight, scrolling leaderboard, category and grade cards, settings panel | **The rotating wall.** Default for every hallway TV. | Everyone in the hallway |
| `/dashboard/global` | Overall board with scroll, metal headings, `N shown` | **The fixed Hall of Honor.** One scene, never rotates: overall top ten, big, for a lobby. Same scene component as Featured's Overall scene. | Visitors, lobby |
| `/dashboard/topCards` | Top-student cards, pinned item, framer-motion | **The podium wall.** Large cards for ranks 1 to 3 (ties share a step) plus a compact ledger for 4 to 10; portrait-first, for a trophy case. | Corridor, trophy case |
| `/dashboard/mobile` | Quicksand/Azeret fonts, metal gradient headings | **Phone view** of the same boards: single column of board sections, for a QR scan. Follows the device light/dark. | Parents, students |
| `/dashboard/feature` | Redirect | Unchanged. | n/a |

### Scenes inside the Featured rotation
Order from `buildSlides` (overall, point groups, grades), unchanged in logic:

1. **Overall: "The Honor Roll".** Top ten of `overall`, always first. Subtitle is the timeframe name.
2. **Category boards**, one scene per `pointGroups[]` entry ("Category leaders"). Board `color` appears only as a small chip beside the title, never as row color; rank color owns the rows.
3. **Grade boards**, one per `grades[]` entry ("Grade 9 standouts", subtitle "Your classmates. Their achievements.").
4. **Spotlight** (optional, one per cycle): the existing spotlight, drawn from `overall.rows` only, as one large plate. Adds no data.
5. **Coming up**: `upcomingEvents` (name, date, "up to N points"), soonest first, max 4. Metadata only. Omitted when empty.

A scene exists only if its data exists. A cohort too small to publish gets no scene, heading, rotation slot or placeholder (section 7.5).

## 3. Layout

Design unit `--u` = 1/100 of the short design edge: 10.8 px at 1920x1080 and at 1080x1920. Landscape `--u: 1vh`; portrait (`orientation: portrait`) `--u: 1vw`. All wall sizes are in `u`; 4K is exactly 2x, 720p is 2/3x. Do not trust the root font size on kiosks.

### 3.1 Landscape TV, 1920x1080 (tolerate 16:10 and ultrawide by letterboxing content to 16:9; the stage fills the rest)
- Safe area 4u (about 43 px) on every side; TV overscan is real.
- Header band 11u: left, board title (serif display) with the gilt divider under it; right, school name, timeframe, clock (30 s tick as today), and a tiny paused/offline mark that never overlaps rows.
- Body 78u, two columns 36% / 64%:
  - Left, "the podium": ranks 1 to 3 as stacked plates (25u, 21u, 21u, 2u gaps), rank 1 largest; ties put several students on one step sharing the medallion color.
  - Right, "the ledger": ranks 4 to 10, each row 9u, medallion, name, grade chip, points at the right edge. If ranks 1 to 3 are not all present the podium shrinks; with fewer than 4 rows the ledger is omitted and the podium centers.
- Footer 3u: the progress line only.

### 3.2 Portrait TV, 1080x1920
Single column: header (9u), podium as a vertical stack of three plates (rank 1 on top, largest), ledger of ranks 4 to 10 (row 8u), progress line at the bottom. Medallion and type are the same pixel sizes as landscape, so the floors in section 4 are identical.

### 3.3 Other sizes
- 1366x768 / 1280x720: supported, not ideal; the 28 px floor becomes 18.7 px. Anything below 18 px at 720p (clock, progress) must be non-informational.
- 4K: exact 2x, no new layout.
- Below 700 px wide is the `mobile` page, not a shrunk wall. The current `max-width:1000px` `height:auto` path in `featured.css` is dropped.
- Nothing requires pointer input to read; no controls are drawn over a scene.

## 4. Legibility at distance

### 4.1 Wall type floors (1080p; scale with `u`)
Rule of thumb: 1 mm of letter height buys about 300 mm of quick-read distance. A 55-inch 1080p panel has about 0.63 mm pitch, so a 44 px name is about 28 mm tall: readable at roughly 8 m (26 ft).

| Role | Min at 1080p | Weight | Notes |
|---|---|---|---|
| Board title | 72 px (6.7u) | Fraunces 600 | one line; may shrink to 56 px, never a third line |
| Rank 1 name | 64 px | Fraunces 600 | leader plate |
| Rank 2 and 3 names | 52 px | Fraunces 600 | |
| Rank 4 to 10 names | 44 px | Fraunces 600 | same face as ranks 1 to 3, so a name never changes typeface when it changes rank |
| Points | 48 px ledger, 60 px rank 2 and 3, 72 px rank 1 | Fraunces 600, `--gilt-ink`, lining tabular figures | `formatPoints`; columns align; never rank-colored |
| Medallion numeral | 40 px in a 72 px circle, every row and plate (never larger) | Fraunces 600, lining | `--rank-N-foreground` on `--rank-N`, 3 px ring in `--rank-N-ink` |
| Grade chip, timeframe, school name | 28 px | Geist 600 | absolute floor for any word meant to be read |
| Clock, paused/offline marks | 24 px | Geist 600 | non-essential, never the only carrier of meaning |
| Progress line | 3 px | n/a | decorative |

**No informative text under 28 px at 1080p; nothing at all under 24 px.** Today's CSS goes down to `.56em` of a 13 px base (about 7 px) in `team-card-row small`; that class goes away with team panels.

Typefaces follow the parlor: **Fraunces** (display, weight 600 only, `SOFT` 0, `WONK` 0, optical size at its display end, lining and tabular figures) and **Geist** (400 and 600) for chips and labels; no 500, 700 or 800 anywhere. Distance-legibility reason to keep Fraunces rather than a Didone: its thick/thin contrast is moderate and its strokes are sturdy, whereas hairline Didone strokes vanish on a TV at 8 m. Fraunces is loaded for the student layout only today, so the dashboard and display layouts need the same `next/font` load (Phase 0). Playfair is not used.

Names: first and last both shown (full last name allowed on DISPLAY, section 7.5). Ledger names are one line, truncated with an ellipsis at the end of the last name, never the first; the podium may wrap to two lines.

### 4.2 Phone floors
Body 17 px, names 18 px semi-bold, points 20 px tabular, board titles 24 px, labels 14 px minimum. Single column, no horizontal scroll, safe-area insets respected.

### 4.3 Contrast
Measured from the HSL values (parlor warm values for surfaces, `globals.css` for gilt, seal and rank). All wall text is 24 px or larger, so it counts as large text: the target is 4.5:1 for every wall text and 7:1 where a token pair allows it (names, titles). UI edges and medallion rings at least 3:1.

| Pair | Dark | Light |
|---|---|---|
| `--foreground` on `--card` / on `--background` | 14.1 / 15.7 | 16.0 / 15.1 |
| `--muted-foreground` on `--card` | 8.2 | 6.9 |
| `--gilt-ink` (points) on `--card` / on `--background` | 9.7 / 10.8 | 7.0 / 6.6 |
| `--border` on `--card` | 4.0 | 3.7 |
| `--seal-foreground` on `--seal` | 7.7 | 10.6 |
| `--gilt` on `--background` (ornament only, never text) | 9.0 | 2.1 |

Rank medallion, numeral on fill / `--rank-N-ink` ring on `--card`:

| Tier | Dark | Light |
|---|---|---|
| 1 | 13.2 / 11.9 | 9.6 / 6.4 |
| 2 | 7.4 / 8.1 | 5.0 / 7.2 |
| 3 | 5.4 / 6.1 | 5.3 / 6.9 |
| 4 | 6.8 / 7.7 | 11.9 / 12.1 |
| 5 | 4.7 / 8.6 | 6.0 / 6.1 |
| 6 to 10 | 5.8 / 6.3 | 7.6 / 7.7 |

Consequences:
- Every pair clears 4.5:1. The pairs under 7:1 (light `--gilt-ink` 6.6 to 7.0, light `--muted-foreground` 6.9, several medallion numerals at 4.7 to 7.4) are acceptable only because they are 24 px or larger. Do not use them below 24 px.
- **Medallion fills alone do not reach 3:1 against the card in several tiers** (dark tiers 4, 5 and 6 to 10 are 2.2, 3.2 and 2.6; light tier 1 is 1.7). The medallion edge is therefore carried by the 3 px `--rank-N-ink` ring (6.1 or more everywhere above), and the numeral always prints. Shape and color are never the only signal.
- `--gilt` is ornament only. Light-mode gilt on the stage is 2.1:1, fine for a decorative frame and divider, but no gilt-filled shape carries meaning and no text uses `--gilt`.
- Surface hex for review: dark stage #191410, card #251D18; light stage #F7F4ED, card #FCFBF7. Rows use `--card`, the stage uses `--background`.
- Implementation re-measures with a tool on the final surfaces and records the numbers in the PR.
- **Textures and artwork behind text** (section 10): text sits on opaque row and plate surfaces; any text over an asset region keeps 4.5:1 (7:1 for names) against the worst pixel. Textures vary by at most plus or minus 3 percent luminance. Measurement is part of acceptance for every asset.

## 5. Motion and rotation

Ease-out. 150 to 250 ms for state changes; scene changes may reach 400 ms because the whole screen is the object. Decorative motion honors `prefers-reduced-motion`. Motion is feedback and celebration, not wallpaper.

- **Dwell:** default 20 s (as today), configurable 12 to 60 s. Minimum 12 s so a ten-row ledger can be read by someone who just walked up.
- **Scene transition:** outgoing fades out 200 ms; incoming fades in 300 ms ease-out with the title rising 1.5u; overlap allowed. No slides, wipes, flips or zooms; large lateral motion distracts walkers and reads as an error.
- **Row entrance:** 40 ms stagger, 180 ms each (1u rise plus fade), total at most 480 ms. Podium plates enter first, rank 1 last (the reveal).
- **Celebration:** one 1.2 s gilt sweep across the leader plate's top edge at scene entrance (transform only); the leader plate carries the only gilt edge. No glow, no confetti, no looping sparkle behind text.
- **Live update:** keep the realtime `sync` broadcast and the 60 s refetch. Do not diff rows: row `key` is `${cohortKey}:${index}`, positional rather than an identity, and comparing names across payloads would derive rank change, which D10 denies. Feedback is a 600 ms gilt shimmer along the divider. New data swaps in at the next scene boundary, never mid-scene, so a ledger never reshuffles in view.
- **Progress:** 3 px gilt line fills across the dwell. Paused shows a "Paused" mark (24 px).
- **Sparkle:** `app/student/SparkleBackground.tsx` is a student asset and is not reused. The wall has no ambient animated layer (the glow idea is dropped); the stage texture is static.
- **Reduced motion:** entrances, sweep, shimmer and burn-in drift are off; scenes change instantly. Rotation continues (it is content) at the configured dwell. Keep the existing blanket `@media (prefers-reduced-motion)` rule as a safety net; the `motion` path uses `useReducedMotion`.
- **Visibility:** rotation pauses while `document.hidden` (kept) and resumes without replaying entrances.
- **Burn-in:** header band and frame brackets drift 1u every 10 minutes (transform, only when motion is allowed). A TV running all day with a static frame retains images.

## 6. Empty, small-school and error states

All states keep the frame, header and gilt rule so the wall never looks broken. None shows a student count, a missing-student count or a cohort size.

| State | Condition | What shows |
|---|---|---|
| No active timeframe | `timeframeId === null` | One scene: "A new term is about to begin." plus school name. No timeframe label. |
| Nothing published | `overall.rows` empty and no other boards | "Your story starts here." with "Student achievements will appear as points are earned." (today's fallback copy). A static, numberless seal. Rotation off. |
| Small school, overall only | `grades[]` and `pointGroups[]` empty | One scene, no rotation, no progress line, no hint that other boards exist. |
| Short board | 1 to 9 rows | Render only those rows; blank space, not placeholders or dashes. Rows center vertically. |
| Ties at the cut | fewer rows because a band was dropped whole | Same as a short board; never explained. |
| Cohort too small to publish | board absent from `grades[]`/`pointGroups[]` | No scene, no heading, no slot. Absence is invisible. |
| No upcoming events | empty array | Scene omitted. |
| Loading | first fetch | "Great things are happening." (existing copy) in the frame. |
| Offline or error | `query.isError` with stale data | Keep the last good data; quiet "Reconnecting" mark (24 px) in the header. With no data: "We'll be right back." (existing copy). Never blank or red. |
| Pairing revoked | layout redirect to `/display` | Pairing wall with a fresh code, automatic, no keyboard (as `KioskPairing` already does). |

Non-ranking small-cohort celebrations (section 7.5 "recommended, not required") are out of scope; see B5.

### Pairing wall
- Code in tabular serif at 160 px, grouped `XXXX-XXXX` (existing `formatCode`), centerd in a bracket frame; host line at 40 px; one instruction line at 36 px. Copy needs ux-optimizer sign-off (H1).
- The unauthenticated screen shows no school name, logo or student data; the product name only.
- Expired code: crossfade to the new code with a 600 ms divider reset. No countdown number; a quiet 3 px expiry line only.
- Paired: "Connected" in gilt, held 1.2 s, then the Featured wall enters.
- Error copy stays; layout only.

## 7. Per-screen phases

Each phase ships on its own and is checked in light and dark at 1920x1080, 1080x1920, 1280x720 and (phone page) 390x844. `npx tsc --noEmit` every phase; `npm run build` when a client boundary moves.

**Phase 0. Tokens, assets, shared primitives** (no route changes)
- Add the `.honor-board` scope and the `--u` unit in `app/dashboard/honor-board.css`.
- Candidate new token, only if a real gap shows: `--stage` (a step deeper than `--background` in dark, equal in light). `--gilt-glow` is not needed. It goes in `:root` and `.dark` and into `tailwind.config.js`.
- Integrate the delivered assets from section 10 under `public/display/`, as `next/image` or CSS `mask-image` (for the single-color shapes, so they take token colors and need no dark variant).
- Shared components under `components/display/`: `Medallion`, `LedgerRow`, `PodiumPlate`, `SceneFrame` (header, bracket frame, progress line, burn-in drift), `BoardScene`.
- Contrast table for the six tiers in both modes.

**Phase 1. Pairing wall** (`app/display/KioskPairing.tsx`, `/display/pair`): visuals only. Lowest risk, proves the type scale.

**Phase 2. Featured wall** (`featured/page.tsx`, `AnimatedFeatured.tsx`; `displayData.ts` order unchanged): scene engine with dwell, transitions, reduced motion, drift, paused/offline marks; settings panel off-screen (H3). Main phase.

**Phase 3. Global Hall of Honor** (`global/page.tsx`, `global.css`): single `BoardScene` of `overall`; removes `N shown` and the "Leader pinned" footer; retires the hex palette in `featured.css` / `global.css` and `ScrollingLeaderboard`.

**Phase 4. Top cards podium** (`topCards/page.tsx`): podium cards plus ledger, portrait-first; drop pinned-item measuring and `framer-motion` in favor of `motion` v11.

**Phase 5. Phone view** (`mobile/page.tsx`): drop Quicksand and Azeret Mono, use Geist plus Fraunces; token colors; follows device mode.

**Phase 6. Hub** (`dashboard/page.tsx`): four scene cards; the "different school shown" notice keeps naming only the school shown.

**Phase 7. QA** on a real TV or fullscreen 1080p browser, a portrait panel, a 720p panel, a phone, and Chromium with reduced motion. Report which of these were not physically confirmed.

Cross-cutting: type is Fraunces 600 plus Geist, as the student surface. `next/font` loads Fraunces in the student layout only today; Phase 0 adds the same load (same CSS variables, `font-display` in Tailwind) to the dashboard and display layouts. Do not ship the wall on a fallback serif.

## 8. Hand-offs

### To ux-optimizer (structure, copy, behavior; not changed here)
- **H1. Pairing copy and flow.** Instruction wording, whether to add a QR code, the "Connected" text.
- **H2. Where a paired kiosk lands.** `/display` redirects to `/dashboard`, the staff hub; a kiosk with no input cannot pick a tile. Proposed: paired devices go straight to a default scene (Featured), the hub is for signed-in staff. Changes routing; needs B2.
- **H3. Settings panel.** Dwell, fullscreen and timeframe are an on-screen pointer panel. A hallway TV has no pointer. Move to staff-side device settings or URL parameters.
- **H4. Removed content.** "N shown" in the global header, "Leader pinned. Standings scroll automatically.", and any team or "Moving up" remnants in `AnimatedFeatured`/`featured.css`. The count is a denominator-adjacent figure (disclosure section 3.3 rule 3).
- **H5. Whether Spotlight and Coming-up scenes stay**; each changes what is shown.
- **H6. Phone view board-jump chips.**

### To backend (data; each needs a privacy-boundary check)
- **B1. No new data for the core redesign.** Every scene renders from `DisplayBoards` as typed. No field is added to a DISPLAY payload without a fresh ruling.
- **B2. Per-device default scene, dwell and mode** (supports H2/H3): presentation-only settings on the display device. Check: settable only by staff of the school (D17), readable through the display credential without widening the payload.
- **B3. Optional rounded school population.** Allowed by section 7.5 (round down to 100, suppress below 200, school-wide only). Recommendation: do not build; the no-counts rule is simpler to defend. If built, check the rounding and threshold server-side.
- **B4. Point-group `color`** is user-entered. Confirm it is validated as hex; the wall derives a readable chip text color from it.
- **B5. Non-ranking small-cohort celebrations**: out of scope; needs a ruling on participation counts above `MIN_COHORT_FOR_AGGREGATE`.
- **B6. Existing gap:** disclosure section 11.4 #23 (D17 conditions 3 to 5 still in TypeScript) should be closed before kiosks roll out widely.

### Privacy-boundary checklist, run every phase before merge
1. Component props are `DisplayBoards`/`DisplayBoard`/`DisplayStudentRow`/`DisplayEvent` only.
2. The only numbers rendered are `rank`, `totalPoints`, `grade`, `maxPoints` and dates. No `.length` of any list reaches the DOM, including `aria-label`, `title`, `alt` and `data-*`.
3. Row `key` is a React key only, never visible.
4. No rank above 10 renders; no `top20`/`none` styling is reachable.
5. Screenshots and art use placeholder data only (section 10.7).
6. No rank delta, arrow, "up", "down", "new" or "since" wording.
7. Pairing screen has no school-identifying text.
8. Assets contain no text or student data.

## 9. Concept art requests

Relay each brief verbatim. These rules apply to all briefs.

- **Placeholder data.** Obvious fake names in rank order 1 to 10: Ada Example, Ben Sample, Cy Placeholder, Dee Example, Eli Sample, Fay Placeholder, Gus Example, Hal Sample, Ivy Placeholder, Jo Example. Grades are digits 9 to 12. Points are digits with a thousands comma: 1,240 / 1,185 / 1,102 / 968 / 931 / 874 / 820 / 777 / 705 / 660. School name "Example High School". No real person, school, logo, mascot or brand. No lorem ipsum.
- **Palette: warm gaslight and warm paper, never blue-black or cool white.** Hex values are computed from the HSL tokens (parlor warm values for surfaces, `globals.css` for gilt, seal and rank). Dark: stage #191410, card #251D18, rule #463D35 (decorative only), UI edge #897A6C, foreground (cream ink) #F1EDE4, secondary text #BFB5A6, gilt fill #D6B151, gilt text #E5C36C, seal #7F392F with seal numeral #FAF7F0. Light: stage #F7F4ED, card #FCFBF7, rule #D7CAB7 (decorative only), UI edge #94806B, foreground (iron-gall ink) #271C16, secondary text #64554A, gilt fill #D6A529 (ornament only), gilt text #794D0C, seal #632A21 with seal numeral #FBF9F4. Do not use #020817, #0E1525, #F8FAFC or #FFFFFF as surfaces, and do not invent colors.
- **Rank medallion fills** (dark / light), numeral color in brackets: rank 1 #FFD91A / #E6C300 (#191410 dark, #271C16 light); rank 2 #9FA5AD / #868D98 (same); rank 3 #C67839 / #975926 (#191410 dark, #FBF9F4 light); rank 4 #853285 / #5C0F5C (#F6F4EE dark, #FBF9F4 light); rank 5 #157979 / #006B6B (same as rank 4); ranks 6 to 10 #B81E3A / #A1122C (same as rank 4). Each medallion has a 3 px ring in its ink color. Dark rings: 1 #FFD91A, 2 #B0B6BF, 3 #D68D51, 4 #E198E1, 5 #3BCECE, 6-10 #F8778D. Light rings: 1 #7A5600, 2 #4E555F, 3 #804A1E, 4 #5C0F5C, 5 #006B6B, 6-10 #A1122C. **Rank color appears only on the medallion (fill, numeral, ring). Points are always gilt text (#E5C36C dark, #794D0C light); names are always the foreground ink.** No row tint, bar, plate edge or glow in a rank color.
- **Typography: Fraunces 600 for titles, names, points and all numerals (lining, tabular figures, `SOFT` 0, `WONK` 0, optical size at its display end); Geist 400 and 600 for chips, labels and body.** No Playfair, no Didone, no hairline strokes, no other weights. Show type at the px sizes given for the canvas.
- **Ornament.** Restrained: one gilt corner-bracket frame, one thin double gilt divider under the title, flat wax-seal medallions for rank (72 px maximum, flat fill, one ring, no laurel, no bevel), no glow anywhere. No filigree borders, scrollwork fills, or stacked drop shadows.
- **Avoid.** Neon, cyan sci-fi, glassmorphism, rainbow gradients, confetti, trophy clip art, cartoon characters, fireworks, stock photos, emoji, text on busy backgrounds, text under 28 px at 1920x1080, lists that fade out, anything implying a bottom of the list, counts ("of 600"), arrows or "up/down", "new" badges, small-print footers, team panels, "Moving up" modules, and red anywhere but the rank 6 to 10 medallion.

### Brief 1. Overall Hall of Honor, landscape, dark
- **Subject and purpose:** main wall scene for `/dashboard/global` and Featured's first scene: overall top ten. Establishes the whole look; hero image for the owner.
- **Size and aspect:** 1920x1080 (16:9); export 3840x2160 if possible.
- **Mode:** dark.
- **Content:** title "The Honor Roll", under it "Spring Term". Header right: "Example High School" and clock "10:42". Left 36%: podium plates for ranks 1 to 3 stacked, rank 1 plate 25u tall with the 3 px gilt top edge (72 px medallion, 64 px name, 72 px points), 2 and 3 plates 21u tall (72 px medallion, 52 px name, 60 px points). The medallion is the same 72 px on all ten rows; rank 1 stands out by plate, name and gilt edge, not seal size. Right 64%: ranks 4 to 10 as ledger rows 98 px tall: medallion, name (44 px), grade chip "Grade 11" (28 px), points (48 px) at the right edge. Gilt progress line along the bottom, about 40% filled.
- **Palette:** dark set and medallion fills as above. Names #F1EDE4; points #E5C36C on every row; only the medallion carries rank color.
- **Typography / ornament:** general rules, plus a 2 px gilt top edge on the leader plate.
- **Placeholders:** ranks 1 to 10 from the list.
- **Avoid:** general list; also scroll bars, a pinned-leader strip, "N shown", shine on non-leader rows, any medallion above 72 px, laurel or bevel on the medallions, glow around the leader.

### Brief 2. Overall Hall of Honor, landscape, light
- **Subject and purpose:** same scene in light mode, to validate token pairs and offer a bright-lobby option.
- **Size and aspect:** 1920x1080.
- **Mode:** light.
- **Content, type, ornament, placeholders:** identical to Brief 1 with the light palette. Rows #FCFBF7 on a #F7F4ED stage with #D7CAB7 decorative rules; names #271C16; points #794D0C; rank 1 medallion #E6C300 with #271C16 numeral and a #7A5600 ring. Report the measured contrast of every text pair against the targets in plan section 4.3.
- **Avoid:** general list; pale gold text on paper, washed-out gray rank 2 text, pure-white or cool gray-white backgrounds (the stage is warm paper #F7F4ED).

### Brief 3. Overall board, portrait, dark and light
- **Subject and purpose:** the board for a portrait panel (corridor kiosk, trophy case), dark beside light.
- **Size and aspect:** 1080x1920, two artboards.
- **Mode:** both.
- **Content:** header (title, school, clock), three stacked podium plates (rank 1 on top, largest), ranks 4 to 10 as 86 px ledger rows, progress line at the bottom. Same px type and medallion sizes as Brief 1 (72 px medallion everywhere, plates 25u / 21u / 21u). Show the name "Cy Placeholder-Example" truncated with an ellipsis on one ledger row to demonstrate the rule.
- **Palette, typography, ornament, placeholders:** general rules and Brief 1.
- **Avoid:** general list; shrinking type to fit, cropped ranks, scroll cues, medallions larger than 72 px, laurel wreaths, a rank 1 medallion in any color but #FFD91A (dark) or #E6C300 (light).

### Brief 4. Category board and grade board, landscape, dark
- **Subject and purpose:** one point-group scene ("Citizenship" with a small chip) and one grade scene ("Grade 9 standouts", subtitle "Your classmates. Their achievements."), to show the chip and the short-board rule.
- **Size and aspect:** 1920x1080, two artboards.
- **Mode:** dark.
- **Content:** the category board shows 10 rows. The grade board shows 4 rows: ranks 1, 2, 3, 3 (the two rank-3 students share a rank and medallion color), rows centerd, remaining space calm and blank, no placeholders and no "more". Chip fill #157979 (a placeholder category color), 28 px label in #F6F4EE.
- **Palette, typography, ornament, placeholders:** general rules.
- **Avoid:** general list; dashes or ghost rows, "4 of 4", coloring rows by category color.

### Brief 5. Rotation storyboard
- **Subject and purpose:** show one full Featured cycle and the transition language so the owner approves the motion before build.
- **Size and aspect:** one 3840x2400 board, 6 frames in a 3x2 grid (each 1920x1080 scaled), captions outside the frames in a neutral sans. Optional second board in portrait, 3 frames.
- **Mode:** dark.
- **Frames:** 1) Overall at the first 300 ms of entrance (podium in, ledger half staggered); 2) Overall at rest; 3) mid-transition, two ghosted layers showing the 200 ms out and 300 ms in overlap; 4) Category board at rest; 5) Spotlight: one large plate "Ada Example, Grade 12, 1,240"; 6) Coming up with "Example Quiz Night", "Example Sports Day", "Example Book Fair", dates as digits "03/14", each "up to 50 points".
- **Annotations:** stagger order, gilt sweep on the leader plate, progress line position, time stamps 0 s, 20 s, 40 s.
- **Palette, typography, ornament, placeholders:** general rules.
- **Avoid:** general list; any slide, wipe, flip or zoom (the transition is a fade and a 1.5u rise), countdown numbers.

### Brief 6. Empty, new-term, small-school and reconnecting states
- **Subject and purpose:** four graceful states so the wall never looks broken: "Your story starts here", "A new term is about to begin", a small school with three students, and "Reconnecting".
- **Size and aspect:** 1920x1080, four artboards, plus a 1080x1920 version of the first.
- **Mode:** dark for all, plus a light version of the first.
- **Content:** same frame, header and divider as Brief 1. Center: a large static wax-seal with no number (a plain flame glyph), heading at 96 px Fraunces 600, sub-line at 40 px sans ("Student achievements will appear as points are earned."). The small-school artboard shows three podium plates centerd, no ledger, no progress line. The reconnecting artboard keeps the last board visible with a quiet 24 px "Reconnecting" mark in the header.
- **Palette, typography, ornament, placeholders:** general rules; small-school uses the first three names.
- **Avoid:** general list; sad faces, gray "no data" icons, the words "empty", "no results", "none", the digit "0", error red, blank ledger rows, any hint that other students exist.

### Brief 7. Pairing wall
- **Subject and purpose:** the kiosk's unpaired state at `/display`, readable by the approving staff member from 3 m.
- **Size and aspect:** 1920x1080 and 1080x1920, plus a small "Connected" artboard.
- **Mode:** dark; a light variant of the landscape one.
- **Content:** wordmark "Phoenix" top left in Fraunces 600 (plain text, no logo supplied); code "1234-5678" centerd in 160 px tabular Fraunces 600 inside a gilt bracket plate; host line "phoenix.example" at 40 px; one instruction line at 36 px ("On your phone or computer, open Phoenix, choose Displays, and enter this code."); a 3 px gilt expiry line about 70% remaining at the very bottom. Confirmation: "Connected" in Fraunces 600 at 120 px, #E5C36C.
- **Palette, typography, ornament, placeholders:** general rules; digits only for the code.
- **Avoid:** general list; school name or logo, student names, countdown numbers, a QR code (undecided), spinner clip art.

### Brief 8. Podium cards (Top cards), portrait and landscape, dark
- **Subject and purpose:** `/dashboard/topCards` as a trophy-case podium wall.
- **Size and aspect:** 1080x1920 (primary) and 1920x1080.
- **Mode:** dark.
- **Content:** rank 1 card raised on top (880 px wide in portrait, medallion 72 px (same as every other card), name 72 px Fraunces 600, "Grade 12" chip, points 96 px); ranks 2 and 3 at 760 px (medallion 72 px, name 56 px, points 72 px); ledger below, ranks 4 to 10 at 80 px rows. Card edges 2 px #897A6C, a 2 px gilt top edge (#D6B151) on rank 1 only, cards on #251D18, points in #E5C36C (never rank-colored), medallions per the rank list.
- **Palette, typography, ornament, placeholders:** general rules.
- **Avoid:** general list; painted pedestal steps with numerals, trophies, ribbons, laurel, any medallion above 72 px, a numeral printed twice on one row, seven-across vertical cards.

### Brief 9. Phone view, light and dark
- **Subject and purpose:** `/dashboard/mobile`, seen after a QR scan.
- **Size and aspect:** 390x844, four artboards (light and dark, top of page and scrolled to a second board).
- **Mode:** both.
- **Content:** sticky header with "Example High School" and a timeframe select showing "Spring Term" (44 px tall); a section per board with a 24 px Fraunces 600 title and a 2 px gilt rule; overall shows 10 rows at 64 px: medallion 36 px, name 18 px semi-bold, grade 14 px, points 20 px tabular at the right; a board-jump chip row ("Overall", "Citizenship", "Grade 9"). Body 17 px, labels at least 14 px.
- **Palette, typography, ornament, placeholders:** general rules; the corner-bracket frame is dropped on phone, the divider stays.
- **Avoid:** general list; horizontal scroll, bottom tab bars, hamburger menus, cards within cards, text under 14 px.

### Brief 10. Hub scene cards, light and dark
- **Subject and purpose:** the staff `/dashboard` hub as four scene cards with real thumbnails.
- **Size and aspect:** 1440x900 desktop, light and dark; plus 390x844 mobile in dark.
- **Mode:** both.
- **Content:** heading "Displays" (Fraunces 600, 40 px) with the school name; 2x2 cards (Featured board, Whole-school board, Top cards, Phone view), each with a 16:9 thumbnail (from Briefs 1, 4, 8, 9; blocks are fine if not final), a 20 px title and a 16 px description line. Featured and Whole-school are larger with a gilt top edge; the other two are quiet. A secondary text link "Pair a screen" at the bottom.
- **Palette, typography, ornament, placeholders:** general rules and app tokens; this is a normal app screen so body sizes follow the app, not the wall.
- **Avoid:** general list; charts, stat tiles, metrics of any kind, student names.

Priority if fewer are wanted: 1, 5, 6, 7, then 3, 8, 9, 2, 4, 10.

## 10. Asset requests

The art agent can deliver production assets. These replace CSS gradients and unicode ornaments where a real asset looks better and costs less to render on a weak kiosk GPU. Rules for all assets:

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

### A1. Stage texture
- **File and usage:** `public/display/stage-dark.webp`, `public/display/stage-light.webp`. Full-bleed `background-image` on the scene stage, behind the header band and in the margins around the ledger. Not behind row text.
- **Dimensions:** 1024x1024 tile; @2x 2048x2048.
- **Tiles seamlessly:** yes, both axes, verified by a 3x3 repeat preview.
- **Transparency:** none (opaque).
- **Variants:** dark and light.
- **Palette:** dark base #191410 with a variation range of #191410 to #1F1915; light base #F7F4ED with a range of #F1EDE4 to #F7F4ED. A faint paper or cloth grain, warm-neutral, no figures, no gold in the tile, no blue cast.
- **Format:** WebP lossy q90.
- **Text safe area:** the whole tile is safe for text at 7:1 by the luminance limit above; still, keep text on opaque rows.

### A2. Corner bracket frame
- **File and usage:** `public/display/frame-corner.svg`. One corner (top-left) of the gilt bracket frame; CSS mirrors it to the other three corners. Used by `SceneFrame` on walls and the pairing plate.
- **Dimensions:** 256x256 viewBox; renders at 12u (about 130 px at 1080p); @2x not needed (vector).
- **Tiles:** no.
- **Transparency:** yes.
- **Variants:** none; a single flat shape drawn in `currentColor` (filled by CSS with `--gilt`).
- **Palette:** `currentColor` (shown against #D6B151 dark and #D6A529 light for review).
- **Format:** SVG, single path, stroke weight 6 px at 256 (3 px at 1080p render minimum), no gradients.
- **Text safe area:** the interior square from 64 px to 256 px on both axes is clear of ornament; text never overlaps the bracket.

### A3. Rank seal medallion artwork
- **File and usage:** `public/display/seal-ring.svg` (the scalloped wax-seal outline and inner ring) and `public/display/seal-flame.svg` (the numberless glyph for empty states). `Medallion` fills the shape with `--rank-N` and prints the numeral as live text.
- **Dimensions:** 256x256 viewBox; renders at 72 px on every wall surface (ledger, podium, podium cards) and 36 px on the phone. Nothing larger.
- **Tiles:** no.
- **Transparency:** yes.
- **Variants:** none; flat shapes using `currentColor` for the fill and a separate inner ring path with `fill: none; stroke: currentColor` so CSS can set the ring to `--rank-N-foreground` at 50 percent.
- **Palette:** `currentColor`; review sheet shows all six tier fills from the rank list in both modes.
- **Format:** SVG.
- **Text safe area:** the central circle of 150 px diameter (at 256) is clear for a 1 to 2 digit numeral; nothing inside it.

### A4. Double gilt divider
- **File and usage:** `public/display/divider-double.svg`. The rule under every board title; also the shimmer carrier for live updates.
- **Dimensions:** 1600x24 viewBox, stretched horizontally to the title width with end caps preserved (supplied as three SVGs, `divider-left.svg`, `divider-mid.svg` (tileable horizontally, 64x24), `divider-right.svg`, or a 9-slice-ready single file; the art agent chooses and documents).
- **Tiles:** the middle piece tiles seamlessly on the x axis.
- **Transparency:** yes.
- **Variants:** none; `currentColor`.
- **Palette:** `currentColor` (shown at #D6B151 and #D6A529).
- **Format:** SVG.
- **Text safe area:** the title sits above with at least 24 px clear; no text overlap.

### A5. Leader plate backing
- **File and usage:** `public/display/plate-leader-dark.webp` and `public/display/plate-leader-light.webp`. The background of the rank 1 plate: a very subtle engraved-plate surface with a faint gilt top-edge highlight.
- **Dimensions:** 1280x480 (the plate at 640x240 CSS px, 2x); a second size 960x400 for portrait is optional.
- **Tiles:** no (single plate, edge-aware to a 9-slice with 64 px corners, so it can stretch).
- **Transparency:** yes, rounded corners at `--radius * 2` in the art with an alpha edge; or opaque rectangle if CSS clips it.
- **Variants:** dark and light.
- **Palette:** dark: base #251D18, highlight #D6B151 at 30 percent on the top 4 px only; light: base #FCFBF7, highlight #D6A529 at 40 percent on the top 4 px only.
- **Format:** WebP lossless with alpha.
- **Text safe area:** the inner rectangle inset 48 px (at 1280 wide) on all sides is a flat color with at most 2 percent variation. Text sits there: name at 64 px and points at 72 px, rank-ink on base. The art agent states the measured contrast for #F1EDE4 (names) and #E5C36C (points) on the dark base, and #271C16 (names) and #794D0C (points) on the light base.

### A6. Glow behind the leader (RETIRED: glow dropped, see medallion rule)
- **File and usage:** `public/display/glow-leader.webp`. A radial warm halo placed behind the rank 1 plate; CSS animates its opacity (60 s breathing, off under reduced motion). It must never sit behind text; it is behind the plate, which is opaque.
- **Dimensions:** 1600x1600; @2x not needed (low frequency).
- **Tiles:** no.
- **Transparency:** yes, alpha falls to 0 well before the edges.
- **Variants:** dark only (in light mode the glow is not shown).
- **Palette:** center #D6B151 at 28 percent alpha falling to 0.
- **Format:** WebP lossless with alpha, no banding (dithered).
- **Text safe area:** none; no text on it.

### A7. Laurel mark (empty state and podium accent)
- **File and usage:** `public/display/laurel.svg`. A restrained pair of laurel sprigs, used at most once per scene in the empty and new-term states and at small scale beside the rank 1 plate title. Never larger than the rank 1 medallion on a populated board.
- **Dimensions:** 512x256 viewBox.
- **Tiles:** no. **Transparency:** yes.
- **Variants:** none; `currentColor`.
- **Palette:** `currentColor` (review at #D6B151 and #D6A529).
- **Format:** SVG, single color, no gradients.
- **Text safe area:** the central 160x160 area is clear; the empty-state heading sits below it, not inside.

### A8. Scene banner header (optional)
- **File and usage:** `public/display/banner-header-dark.webp`, `public/display/banner-header-light.webp`. An optional slim decorative band behind the header (title and divider), for the fixed Hall of Honor only. If A1 and A4 look right without it, skip it.
- **Dimensions:** 1920x240 at 1080p; @2x 3840x480; portrait companion 1080x240 (@2x 2160x480).
- **Tiles:** horizontal seamless (left edge matches right edge) so it can stretch to ultrawide.
- **Transparency:** opaque bottom edge fading to alpha over the last 24 px.
- **Variants:** dark and light.
- **Palette:** dark #191410 to #251D18 with gilt #D6B151 pinstripe at 20 percent; light #F7F4ED to #FCFBF7 with gilt #D6A529 pinstripe at 30 percent.
- **Format:** WebP lossy q90 (alpha needs lossless; use lossless if the fade is kept).
- **Text safe area:** the whole band is a gentle flat gradient; title text at 72 px sits left aligned inside an inset of 4u and must measure 7:1 against the worst pixel in that area (#F1EDE4 on dark, #271C16 on light). The art agent reports the measurement.

### A9. Phone view header wash
- **File and usage:** `public/display/mobile-header-dark.webp` and `-light.webp`. A subtle wash behind the sticky phone header only.
- **Dimensions:** 390x120; @2x 780x240; @3x 1170x360.
- **Tiles:** horizontal seamless is not required.
- **Transparency:** opaque.
- **Variants:** dark and light.
- **Palette:** dark #251D18 to #191410; light #FCFBF7 to #F7F4ED; no gilt.
- **Format:** WebP lossy q90.
- **Text safe area:** entire area; a flat gradient with at most 2 percent luminance variation, so 17 px text reaches 4.5:1 and the school name (18 px semi-bold) reaches 7:1.

### A10. Sheet of asset review proofs
- **File and usage:** a single review sheet (not shipped): `asset-review.png` showing every asset in both modes on its real background with the sample text and the measured contrast figures written beside it (the one place text is allowed, since it is not shipped).
- **Dimensions:** 3840x2160.
- **Variants:** dark and light halves.

## Art review

Reviewed 2026-10-14: every concept PNG in `docs/design/concepts/`, the production assets in `public/display/` (opened and, for SVGs, read as source) and the art agent's two notes, against this plan and Briefs 1 to 10. Concepts are mood and layout references only; this plan's tables win wherever they differ.

### Adopted
- **Briefs 1 and 2 layout.** Header (title left, school name and clock right), 36/64 podium and ledger split, plates for ranks 1 to 3, ten rows, grade chips, gilt points, bottom progress line, the single corner-bracket frame and the double rule under the header. Both modes read as one family, warm paper in light.
- **Gilt top edge on the leader plate only.** Now the main rank 1 emphasis (see the medallion rule).
- **Brief 3 truncation demo.** One-line ledger name ending in an ellipsis, last name only.
- **Brief 4 grade board.** Two students sharing rank 3 with the same bronze medallion, rows centered, calm blank space, subtitle under the title. The small category chip beside the title.
- **Brief 5 storyboard** as the motion and scene spec (fade-and-rise, stagger, progress line, Spotlight and Coming-up scenes). Its flat-disc medallions are the target seal style at wall size.
- **Brief 6 states.** Seal with flame glyph above the message, centered heading and sub-line, flanking gilt rules, the three-plate small-school scene, light variant. Reconnecting keeps the last board visible.
- **Brief 7 pairing layout.** Code in a bracketed plate, host line, one instruction line, thin expiry line at about 70 percent, "Connected" in gilt. No school name, no QR code.
- **Brief 8 portrait card stack.** Rank 1 on top, 2 and 3 below, ledger under a divider.
- **Brief 9 phone view.** Sticky header with timeframe select, board-jump chip row with a filled active chip, 36 px medallions, grade column, points at the right.
- **Brief 10 hub layout.** 2x2 cards, gilt top edge on the two larger cards, "Pair a screen" link at the foot, Fraunces heading.

### Rejected or corrected
- **Medallion style and size (all concepts).** Large beveled, glossy, laurel-wreathed seals (Briefs 1, 2, 8) and 144 px cards are rejected. Corrected to 72 px flat discs everywhere (medallion rule above). Brief 1 and 2 numerals are fine; the laurel inside the seal, the specular gloss and the halo around the rank 1 plate are removed.
- **Glow.** Dropped everywhere, including the plate halo in Briefs 1 and 8.
- **Wrong rank colors.** Brief 3 (rank 1 red; ranks 4 to 10 plain gray circles), Brief 8 (rank 2 purple, rank 3 teal, rank 4 to 10 numerals doubled and a "9" shown at rank 10), Brief 9 (rank 2 red, 3 blue, 4 green, 5 purple, 6 to 10 bronze or gray). Standing decision #5 and the plan's fill list are the only source: 1 yellow, 2 silver, 3 bronze, 4 purple, 5 teal, 6 to 10 red.
- **Brief 1 and 2 typography.** The title is gradient gilt on dark (the title is `--foreground`; gilt belongs to points); the school name and clock are gilt (should be muted foreground and foreground); "SPRING TERM" and "POINTS" are tracked caps near 22 to 26 px, under the 28 px floor. Drop the "POINTS" label entirely (the figure is self-explanatory) and set the timeframe at 28 px Geist 600 without letter-spacing.
- **Brief 3 ornaments.** Italic "The" over a caps title, a diamond on the divider, laurel wreaths larger than the medallion, and small tracked caps for school name. One title style, plain double rule.
- **Brief 4 category board.** Bare numerals instead of medallions, a lit-wall backdrop and two framed panels per image. Every ranked row has a medallion; one scene per board; placeholder names drift from the list (Ben Example, Di Example).
- **Brief 6 additions.** Phoenix wing watermark behind text (new ornament, breaks the budget), an added "Phoenix Honor Board" header, a spinner icon on Reconnecting and its 16 px label (24 px floor, no spinner), laurels on the small medallions, a raised middle step in the small-school scene (use the same stacked plates or three equal plates).
- **Brief 7 faults.** Stand-in Arial for host and instruction lines (must be Geist), a plain rounded rectangle where the gilt corner-bracket frame belongs, and no outer scene frame. Layout otherwise good.
- **Brief 8 landscape.** Seven vertical ledger cards with the numeral above and inside the seal, tracked small caps "PHOENIX SCHOOL HONOR BOARD" title and gradient gilt, invented names. Portrait only is adopted.
- **Brief 9 faults.** Column header row at about 11 px (14 px minimum, or drop it), fleur-de-lis ornament (not in the asset set; use the double divider), invented names and scores.
- **Brief 10 thumbnails.** Photoreal oak honor boards with crests are not the product and would misrepresent the screens. Use real screenshots built from placeholder data, or flat block thumbnails. The description lines in the image are invented copy and need ux-optimizer.
- **Review sheet proofs.** `asset-review.png` shows the divider blank and the glow with an inverted alpha (see assets), so it proves nothing for those two.

### Production assets
| Asset | Verdict | Notes |
|---|---|---|
| `stage-dark.webp`, `stage-light.webp` | Pass | Faint grain, measured 14.9 / 14.2 for names, 10.2 / 6.2 for gilt text. Light gilt text on raw stage is 6.2, so points stay on opaque `--card` rows as planned. The review sheet exaggerates the pattern; the file is subtle. |
| `frame-corner.svg` | Pass | Single path, `currentColor`, double line at 6 of 256 (3 px at 130 px). Interior clear. |
| `seal-ring.svg` | Redo (3b) | Scallop is an irregular 36-point polygon, the second inner ring is 2 of 256 (about 0.6 px at 72 px, below the 3 px floor), and the 6 of 256 ring is half transparent. Redraw as the flat wall seal. |
| `seal-flame.svg` | Pass | Reads at empty-state size. Keep. |
| `divider-double.svg` | Redo (4b) | One SVG with `preserveAspectRatio="none"`: stretched end caps distort, stroke weight scales with width, and strokes are 2 of 24 (under 3 px at 1080p). It rendered blank on the proof sheet. Needs a 9-slice. |
| `plate-leader-dark.webp`, `plate-leader-light.webp` | Pass | Flat interior, measured 14.2 / 9.8 (dark) and 16.1 / 7.0 (light). The 3 px gilt top edge is set in CSS to meet the floor; the baked highlight is only a tint. |
| `glow-leader.webp` | Fail, retired | Alpha is near zero in the middle and gold at the square edges (a visible box). Not redone: the glow is dropped. Delete at integration. |
| `laurel.svg` | Pass, restricted | Strokes are 5 of 512, so use only at 520 px wide or more (empty and new-term states). Remove the "small scale beside the rank 1 plate" use from A7. |
| `banner-header-dark.webp`, `banner-header-light.webp` | Pass, not used | Optional A8. Stage plus divider is enough; do not integrate unless the Hall of Honor looks bare in QA. |
| `mobile-header-dark.webp`, `mobile-header-light.webp` | Pass | 1170x360, flat, measured 14.2 / 15.2. |
| `asset-review.png` | Redo with 3b and 4b | Add the corrected seal at 72 and 36 px in all six tiers, both modes, and a rendered divider. |

Follow-up requests: `docs/design/art-requests/dashboard/asset-03b-flat-wall-seal-72px.md` and `docs/design/art-requests/dashboard/asset-04b-divider-nine-slice.md`.

## 11. What this plan deliberately does not do
- No app code, styles, tokens or data change in this run.
- No structure change: removed content (H4), routing (H2) and settings location (H3) are flagged to ux-optimizer.
- Nothing here widens a DISPLAY payload. If the art or the owner asks for any figure not in `displayTypes.ts`, it goes to the disclosure authority first.

Release level implied once built: minor (new look for existing screens). H2 and H3 would be assessed separately and could raise it if routing changes are breaking.
