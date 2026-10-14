# Dashboard and paired-display redesign: plan

Author: designer. Status: PLAN ONLY, no code or styles changed. Date: 2026-10-14.
Scope: `app/dashboard/` (hub `page.tsx`, `featured`, `global`, `mobile`, `topCards`, `feature` redirect) and the paired-display experience under `app/display/` (`KioskPairing`, `pair`).

Binding inputs, in order of precedence: `docs/DATA_DISCLOSURE.md` (DISPLAY tier section 4, section 7.5, section 10.10 D8/D9/D10, section 10.14 D17, section 10.15 P-1/P-2), standing decision #5 (rank colour identity), then this plan. Where this plan and the disclosure document disagree, the disclosure document wins.

## 1. Direction

**A sibling of the Victorian parlour, called the Honour Board.** Same vocabulary, different register. The student surface is a parlour read at arm's length: plates, seals, gilt hairlines, fine ornament. A hallway wall is read from 10 to 30 feet, by a crowd, in passing. So it keeps the family resemblance (gilt rule, wax-seal rank medallion, engraved-plate rows, serif display numerals, one corner-bracket frame) at three times the scale and a tenth of the ornament, with no hairlines thinner than 3 px at 1080p and nothing busy behind text. Think "school honours board in the entrance hall, lit at night", not "the parlour itself".

Why a sibling and not the parlour verbatim: parlour detail (1 px rules, 12 to 14 px small caps, textured plates) is illegible across a corridor and shimmers on a TV. Why not a separate look: a student sees their own name in gold on their phone and then on the wall; that recognition is the reward.

Decisions:

1. **Dark is the default for walls**, light is a supported option. Hallway TVs are emissive; a white field at 1080p glares and burns in. Both modes use only tokens and both must pass contrast (section 4.3). The wall owns its mode as a device setting, independent of `ThemeProvider`, because a paired device has no user theme. Implementation: a wrapper class (`.honour-board`) that applies the existing `.dark` variables; no second palette.
2. **Tokens, not hex.** The current display uses a private palette in `featured.css` / `global.css` (`#f4f6fc`, `#9caec8`, `#bbf775` mint, `#20322d`, `#18253b`, `#354966`, aurora blobs). All of it is retired. Surfaces use `--background`, `--card`, `--border`, `--rule`, `--foreground`, `--muted-foreground`; ornament uses `--gilt`, `--gilt-ink`, `--seal`; rank identity uses `--rank-1..5`, `--rank-top10` with their `-foreground` and `-ink` partners. Mint is dropped: gilt is the one celebratory colour, so the brightest thing is the leader.
3. **Rank colour identity (standing decision #5).** Tier comes only from `displayRankTier(rank)` (`lib/rankTier.ts`). Colour sits beside the numeral it comes from: the filled medallion and the points figure of that row. Names stay `--foreground`. Tied students share a rank and so a tier. Per D9 a wall only shows tiers `1`, `2`, `3`, `4`, `5`, `top10`; `top20` and `none` have no wall rendering. A row with rank above 10 renders nothing and is logged (a cut violation, not a styling case).
4. **Celebrate, never shame.** No "bottom", no "rest of the school", no counts, no "N shown", no "of N", no ghost rows, no rank-movement arrows (D10), no "Moving up", no team panels. Copy is about what students did, never who is missing. An empty board is "Your story starts here", not "No data".
5. **One board per scene.** Each `DisplayBoard` renders alone as its own scene (section 3.3 rule 6 of the disclosure document). No scene joins two boards or shows cohorts side by side; the legibility floor leaves no room for a second panel at corridor distance.
6. **No scrolling lists.** The cut caps every board at 10 rows and 10 rows fit a 1080p screen at corridor sizes. The auto-scrolling `ScrollingLeaderboard` (pinned leader plus moving track) is a legibility defect: nobody reads a moving list from across a hall. It is replaced by a static ten-row ledger with a short entrance stagger.
7. **Real assets where they beat CSS.** A small set of production assets (a subtle stage texture, the frame brackets, the seal medallion artwork, the divider, a laurel mark) are commissioned from the art agent (section 10) so the wall does not rely on layered CSS gradients. Text always stays live; assets contain no text and no student data.

### Elevation and shape
- Radius: `--radius` (0.5rem) for plates and rows, `calc(var(--radius) * 2)` for the scene frame; medallions are circles. No other radii.
- Elevation, two levels only: rows are flat on `--card` with a 2 px `--rule` bottom border; the leader plate and scene frame use `--shadow-2` (in dark, plus a 1 px `--gilt` inner line since shadows vanish on near-black). No `--shadow-3` on walls.
- Ornament budget per scene: one frame, one divider under the title, one medallion per row. Nothing else.

## 2. Screen inventory and what each is for

All lists come from `getDisplayBoards(schoolId, timeframeId)` (SQL `display_cut`, one call per cohort) and `DisplayStudentRow` (`key`, `rank`, `firstName`, `lastName`, `grade`, `totalPoints`). `DisplayBoards` also gives `timeframes`, `upcomingEvents` (name, date, maxPoints) and per-board `title`/`color`. The redesign needs no other data.

| Route | Today | Purpose after redesign | Who looks at it |
|---|---|---|---|
| `/display` (`KioskPairing`) | Plain code screen | **Pairing wall.** Shows the code for staff to approve; also the re-pair state after revocation. Readable at 10 ft because the approver stands at the TV. | Staff, once |
| `/dashboard` (hub) | Tile list | **Launcher for staff only.** A paired kiosk should not stop here but enter Featured (hand-off H2). Tiles become four scene cards with real thumbnails. | Staff |
| `/dashboard/featured` | Aurora, spotlight, scrolling leaderboard, category and grade cards, settings panel | **The rotating wall.** Default for every hallway TV. | Everyone in the hallway |
| `/dashboard/global` | Overall board with scroll, metal headings, `N shown` | **The fixed Hall of Honour.** One scene, never rotates: overall top ten, big, for a lobby. Same scene component as Featured's Overall scene. | Visitors, lobby |
| `/dashboard/topCards` | Top-student cards, pinned item, framer-motion | **The podium wall.** Large cards for ranks 1 to 3 (ties share a step) plus a compact ledger for 4 to 10; portrait-first, for a trophy case. | Corridor, trophy case |
| `/dashboard/mobile` | Quicksand/Azeret fonts, metal gradient headings | **Phone view** of the same boards: single column of board sections, for a QR scan. Follows the device light/dark. | Parents, students |
| `/dashboard/feature` | Redirect | Unchanged. | n/a |

### Scenes inside the Featured rotation
Order from `buildSlides` (overall, point groups, grades), unchanged in logic:

1. **Overall: "The Honour Roll".** Top ten of `overall`, always first. Subtitle is the timeframe name.
2. **Category boards**, one scene per `pointGroups[]` entry ("Category leaders"). Board `color` appears only as a small chip beside the title, never as row colour; rank colour owns the rows.
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
  - Left, "the podium": ranks 1 to 3 as stacked plates, rank 1 largest; ties put several students on one step sharing the medallion colour.
  - Right, "the ledger": ranks 4 to 10, each row 9u, medallion, name, grade chip, points at the right edge. If ranks 1 to 3 are not all present the podium shrinks; with fewer than 4 rows the ledger is omitted and the podium centres.
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
| Board title | 72 px (6.7u) | serif display 700 | one line; may shrink to 56 px, never a third line |
| Rank 1 name | 64 px | serif 700 | leader plate |
| Rank 2 and 3 names | 52 px | serif 600 | |
| Rank 4 to 10 names | 44 px | Geist 600 | |
| Points | 48 px ledger, 72 px podium | tabular 700 | `formatPoints`; tabular figures so columns align |
| Medallion numeral | 40 px in 72 px circle (ledger); 64 px in 112 px circle (podium) | 800 | `--rank-N-foreground` on `--rank-N` |
| Grade chip, timeframe, school name | 28 px | 500 | absolute floor for any word meant to be read |
| Clock, paused/offline marks | 24 px | 500 | non-essential, never the only carrier of meaning |
| Progress line | 3 px | n/a | decorative |

**No informative text under 28 px at 1080p; nothing at all under 24 px.** Today's CSS goes down to `.56em` of a 13 px base (about 7 px) in `team-card-row small`; that class goes away with team panels.

Names: first and last both shown (full last name allowed on DISPLAY, section 7.5). Ledger names are one line, truncated with an ellipsis at the end of the last name, never the first; the podium may wrap to two lines.

### 4.2 Phone floors
Body 17 px, names 18 px semi-bold, points 20 px tabular, board titles 24 px, labels 14 px minimum. Single column, no horizontal scroll, safe-area insets respected.

### 4.3 Contrast
- Wall text at least 7:1 on its surface; large type at least 4.5:1; UI borders at least 3:1.
- Rank numerals/points use `--rank-*-ink` on `--background`/`--card`; medallions use `-foreground` on the fill. Implementation must re-measure all six tiers in both modes against the actual surfaces and record the numbers in the PR. Watch items: `--rank-2` on light, `--rank-3-foreground` on its light fill, `--rank-top10-ink` on dark `--card`.
- Gilt (`--gilt`) is ornament only; gilt text uses `--gilt-ink`.
- Surfaces: dark `--background` #020817, `--card` #0E1525; light `--background` #F8FAFC, `--card` #FFFFFF. Rows use `--card`, the stage uses `--background`.
- **Textures and artwork behind text** (section 10): any text that sits over an image asset must be on a row/plate surface (`--card`, opaque) or over an asset region whose worst-case pixel luminance still gives 7:1 against the text colour. The stage texture is limited to plus or minus 3 percent luminance variation, and rows are opaque, so row text never sees texture. Measurement is part of acceptance for every asset.
- Colour is never the only carrier: the rank numeral is always printed in the medallion.

## 5. Motion and rotation

Ease-out. 150 to 250 ms for state changes; scene changes may reach 400 ms because the whole screen is the object. Decorative motion honours `prefers-reduced-motion`. Motion is feedback and celebration, not wallpaper.

- **Dwell:** default 20 s (as today), configurable 12 to 60 s. Minimum 12 s so a ten-row ledger can be read by someone who just walked up.
- **Scene transition:** outgoing fades out 200 ms; incoming fades in 300 ms ease-out with the title rising 1.5u; overlap allowed. No slides, wipes, flips or zooms; large lateral motion distracts walkers and reads as an error.
- **Row entrance:** 40 ms stagger, 180 ms each (1u rise plus fade), total at most 480 ms. Podium plates enter first, rank 1 last (the reveal).
- **Celebration:** one 1.2 s gilt sweep across the leader plate's top edge at scene entrance (transform only); rank 1 medallion has a soft static glow in dark. No confetti, no looping sparkle behind text.
- **Live update:** keep the realtime `sync` broadcast and the 60 s refetch. Do not diff rows: row `key` is `${cohortKey}:${index}`, positional rather than an identity, and comparing names across payloads would derive rank change, which D10 denies. Feedback is a 600 ms gilt shimmer along the divider. New data swaps in at the next scene boundary, never mid-scene, so a ledger never reshuffles in view.
- **Progress:** 3 px gilt line fills across the dwell. Paused shows a "Paused" mark (24 px).
- **Sparkle:** `app/student/SparkleBackground.tsx` is a student asset and is not reused. The wall's only ambient layer is a 60 s radial gilt glow behind the leader plate, static under reduced motion.
- **Reduced motion:** entrances, sweep, glow, shimmer and burn-in drift are off; scenes change instantly. Rotation continues (it is content) at the configured dwell. Keep the existing blanket `@media (prefers-reduced-motion)` rule as a safety net; the `motion` path uses `useReducedMotion`.
- **Visibility:** rotation pauses while `document.hidden` (kept) and resumes without replaying entrances.
- **Burn-in:** header band and frame brackets drift 1u every 10 minutes (transform, only when motion is allowed). A TV running all day with a static frame retains images.

## 6. Empty, small-school and error states

All states keep the frame, header and gilt rule so the wall never looks broken. None shows a student count, a missing-student count or a cohort size.

| State | Condition | What shows |
|---|---|---|
| No active timeframe | `timeframeId === null` | One scene: "A new term is about to begin." plus school name. No timeframe label. |
| Nothing published | `overall.rows` empty and no other boards | "Your story starts here." with "Student achievements will appear as points are earned." (today's fallback copy). A static, numberless seal. Rotation off. |
| Small school, overall only | `grades[]` and `pointGroups[]` empty | One scene, no rotation, no progress line, no hint that other boards exist. |
| Short board | 1 to 9 rows | Render only those rows; blank space, not placeholders or dashes. Rows centre vertically. |
| Ties at the cut | fewer rows because a band was dropped whole | Same as a short board; never explained. |
| Cohort too small to publish | board absent from `grades[]`/`pointGroups[]` | No scene, no heading, no slot. Absence is invisible. |
| No upcoming events | empty array | Scene omitted. |
| Loading | first fetch | "Great things are happening." (existing copy) in the frame. |
| Offline or error | `query.isError` with stale data | Keep the last good data; quiet "Reconnecting" mark (24 px) in the header. With no data: "We'll be right back." (existing copy). Never blank or red. |
| Pairing revoked | layout redirect to `/display` | Pairing wall with a fresh code, automatic, no keyboard (as `KioskPairing` already does). |

Non-ranking small-cohort celebrations (section 7.5 "recommended, not required") are out of scope; see B5.

### Pairing wall
- Code in tabular serif at 160 px, grouped `XXXX-XXXX` (existing `formatCode`), centred in a bracket frame; host line at 40 px; one instruction line at 36 px. Copy needs ux-optimizer sign-off (H1).
- The unauthenticated screen shows no school name, logo or student data; the product name only.
- Expired code: crossfade to the new code with a 600 ms divider reset. No countdown number; a quiet 3 px expiry line only.
- Paired: "Connected" in gilt, held 1.2 s, then the Featured wall enters.
- Error copy stays; layout only.

## 7. Per-screen phases

Each phase ships on its own and is checked in light and dark at 1920x1080, 1080x1920, 1280x720 and (phone page) 390x844. `npx tsc --noEmit` every phase; `npm run build` when a client boundary moves.

**Phase 0. Tokens, assets, shared primitives** (no route changes)
- Add the `.honour-board` scope and the `--u` unit in `app/dashboard/honour-board.css`.
- Candidate new tokens, only if a real gap shows: `--stage` (a step deeper than `--background` in dark, equal in light) and `--gilt-glow`. Both go in `:root` and `.dark` and into `tailwind.config.js`.
- Integrate the delivered assets from section 10 under `public/display/`, as `next/image` or CSS `mask-image` (for the single-colour shapes, so they take token colours and need no dark variant).
- Shared components under `components/display/`: `Medallion`, `LedgerRow`, `PodiumPlate`, `SceneFrame` (header, bracket frame, progress line, burn-in drift), `BoardScene`.
- Contrast table for the six tiers in both modes.

**Phase 1. Pairing wall** (`app/display/KioskPairing.tsx`, `/display/pair`): visuals only. Lowest risk, proves the type scale.

**Phase 2. Featured wall** (`featured/page.tsx`, `AnimatedFeatured.tsx`; `displayData.ts` order unchanged): scene engine with dwell, transitions, reduced motion, drift, paused/offline marks; settings panel off-screen (H3). Main phase.

**Phase 3. Global Hall of Honour** (`global/page.tsx`, `global.css`): single `BoardScene` of `overall`; removes `N shown` and the "Leader pinned" footer; retires the hex palette in `featured.css` / `global.css` and `ScrollingLeaderboard`.

**Phase 4. Top cards podium** (`topCards/page.tsx`): podium cards plus ledger, portrait-first; drop pinned-item measuring and `framer-motion` in favour of `motion` v11.

**Phase 5. Phone view** (`mobile/page.tsx`): drop Quicksand and Azeret Mono, use Geist plus the display serif; token colours; follows device mode.

**Phase 6. Hub** (`dashboard/page.tsx`): four scene cards; the "different school shown" notice keeps naming only the school shown.

**Phase 7. QA** on a real TV or fullscreen 1080p browser, a portrait panel, a 720p panel, a phone, and Chromium with reduced motion. Report which of these were not physically confirmed.

Cross-cutting: `Playfair Display` is declared in the Victorian CSS but never loaded. The wall needs a real self-hosted display serif via `next/font` with good tabular figures at 100+ px; use whatever the student surface settles on. Do not ship on the browser default serif.

## 8. Hand-offs

### To ux-optimizer (structure, copy, behaviour; not changed here)
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
- **B4. Point-group `color`** is user-entered. Confirm it is validated as hex; the wall derives a readable chip text colour from it.
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
- **Palette** (hex from the app tokens; do not invent colours). Dark: stage #020817, card #0E1525, rule #353F50, foreground #F8FAFC, muted text #94A3B8, gilt #D6B151, gilt text #E5C36C, seal #7F392F. Light: stage #F8FAFC, card #FFFFFF, rule #C2CBD6, foreground #020817, muted text #5A687D, gilt #D6A529, gilt text #794D0C, seal #632A21.
- **Rank medallion fills** (dark / light), numeral in brackets: rank 1 #FFD91A / #E6C300 (near-black); rank 2 #9FA5AD / #868D98 (near-black); rank 3 #C67839 / #975926 (near-black on dark, off-white on light); rank 4 #853285 / #5C0F5C (off-white); rank 5 #157979 / #006B6B (off-white); ranks 6 to 10 #B81E3A / #A1122C (off-white). Rank-coloured text on dark uses the lighter partners: 1 #FFD91A, 2 #B0B6BF, 3 #D68D51, 4 #E198E1, 5 #3BCECE, 6-10 #F8778D. Off-white is #F8FAFC; near-black is #191410.
- **Typography.** Display: a high-contrast Victorian/Didone-leaning serif (Playfair Display or similar), bold, for titles, rank 1 to 3 names and big numerals, with tabular lining figures for points and ranks. Chips and body: Geist or an Inter-like sans, 500 to 600. Show type at the px sizes given for the canvas.
- **Ornament.** Restrained: one gilt corner-bracket frame, one thin double gilt divider under the title, wax-seal medallions for rank, at most one soft radial gilt glow behind rank 1. No filigree borders, scrollwork fills, or stacked drop shadows.
- **Avoid.** Neon, cyan sci-fi, glassmorphism, rainbow gradients, confetti, trophy clip art, cartoon characters, fireworks, stock photos, emoji, text on busy backgrounds, text under 28 px at 1920x1080, lists that fade out, anything implying a bottom of the list, counts ("of 600"), arrows or "up/down", "new" badges, small-print footers, team panels, "Moving up" modules, and red anywhere but the rank 6 to 10 medallion.

### Brief 1. Overall Hall of Honour, landscape, dark
- **Subject and purpose:** main wall scene for `/dashboard/global` and Featured's first scene: overall top ten. Establishes the whole look; hero image for the owner.
- **Size and aspect:** 1920x1080 (16:9); export 3840x2160 if possible.
- **Mode:** dark.
- **Content:** title "The Honour Roll", under it "Spring Term". Header right: "Example High School" and clock "10:42". Left 36%: podium plates for ranks 1 to 3 stacked, rank 1 largest (112 px medallion, 64 px name, 72 px points), 2 and 3 smaller (name 52 px). Right 64%: ranks 4 to 10 as ledger rows 98 px tall: medallion, name (44 px), grade chip "Grade 11" (28 px), points (48 px) at the right edge. Gilt progress line along the bottom, about 40% filled.
- **Palette:** dark set and rank fills as above. Names #F8FAFC, not rank coloured; medallion and points carry rank colour.
- **Typography / ornament:** general rules, plus a 2 px gilt top edge on the leader plate.
- **Placeholders:** ranks 1 to 10 from the list.
- **Avoid:** general list; also scroll bars, a pinned-leader strip, "N shown", shine on non-leader rows.

### Brief 2. Overall Hall of Honour, landscape, light
- **Subject and purpose:** same scene in light mode, to validate token pairs and offer a bright-lobby option.
- **Size and aspect:** 1920x1080.
- **Mode:** light.
- **Content, type, ornament, placeholders:** identical to Brief 1 with the light palette. Rows #FFFFFF on a #F8FAFC stage with #C2CBD6 rules; gilt text #794D0C; rank 1 medallion #E6C300 with near-black numeral. Note any text that falls below 7:1.
- **Avoid:** general list; pale gold text on white, washed-out grey rank 2 text, pure-white full-bleed backgrounds.

### Brief 3. Overall board, portrait, dark and light
- **Subject and purpose:** the board for a portrait panel (corridor kiosk, trophy case), dark beside light.
- **Size and aspect:** 1080x1920, two artboards.
- **Mode:** both.
- **Content:** header (title, school, clock), three stacked podium plates (rank 1 on top, largest), ranks 4 to 10 as 86 px ledger rows, progress line at the bottom. Same px type sizes as Brief 1. Show the name "Cy Placeholder-Example" truncated with an ellipsis on one ledger row to demonstrate the rule.
- **Palette, typography, ornament, placeholders:** general rules and Brief 1.
- **Avoid:** general list; shrinking type to fit, cropped ranks, scroll cues.

### Brief 4. Category board and grade board, landscape, dark
- **Subject and purpose:** one point-group scene ("Citizenship" with a small chip) and one grade scene ("Grade 9 standouts", subtitle "Your classmates. Their achievements."), to show the chip and the short-board rule.
- **Size and aspect:** 1920x1080, two artboards.
- **Mode:** dark.
- **Content:** the category board shows 10 rows. The grade board shows 4 rows: ranks 1, 2, 3, 3 (the two rank-3 students share a rank and medallion colour), rows centred, remaining space calm and blank, no placeholders and no "more". Chip fill #3BCECE, 28 px label, text chosen for 4.5:1.
- **Palette, typography, ornament, placeholders:** general rules.
- **Avoid:** general list; dashes or ghost rows, "4 of 4", colouring rows by category colour.

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
- **Content:** same frame, header and divider as Brief 1. Centre: a large static wax-seal with no number (a plain flame glyph), heading at 96 px serif, sub-line at 40 px sans ("Student achievements will appear as points are earned."). The small-school artboard shows three podium plates centred, no ledger, no progress line. The reconnecting artboard keeps the last board visible with a quiet 24 px "Reconnecting" mark in the header.
- **Palette, typography, ornament, placeholders:** general rules; small-school uses the first three names.
- **Avoid:** general list; sad faces, grey "no data" icons, the words "empty", "no results", "none", the digit "0", error red, blank ledger rows, any hint that other students exist.

### Brief 7. Pairing wall
- **Subject and purpose:** the kiosk's unpaired state at `/display`, readable by the approving staff member from 3 m.
- **Size and aspect:** 1920x1080 and 1080x1920, plus a small "Connected" artboard.
- **Mode:** dark; a light variant of the landscape one.
- **Content:** wordmark "Phoenix" top left in the display serif (plain text, no logo supplied); code "1234-5678" centred in 160 px tabular serif inside a gilt bracket plate; host line "phoenix.example" at 40 px; one instruction line at 36 px ("On your phone or computer, open Phoenix, choose Displays, and enter this code."); a 3 px gilt expiry line about 70% remaining at the very bottom. Confirmation: "Connected" in gilt serif at 120 px.
- **Palette, typography, ornament, placeholders:** general rules; digits only for the code.
- **Avoid:** general list; school name or logo, student names, countdown numbers, a QR code (undecided), spinner clip art.

### Brief 8. Podium cards (Top cards), portrait and landscape, dark
- **Subject and purpose:** `/dashboard/topCards` as a trophy-case podium wall.
- **Size and aspect:** 1080x1920 (primary) and 1920x1080.
- **Mode:** dark.
- **Content:** rank 1 card raised on top (880 px wide in portrait, medallion 144 px, name 72 px serif, "Grade 12" chip, points 96 px); ranks 2 and 3 at 760 px (name 56 px, points 72 px); ledger below, ranks 4 to 10 at 80 px rows. Card edges 2 px #353F50, a 2 px gilt top edge on rank 1 only, cards on #0E1525.
- **Palette, typography, ornament, placeholders:** general rules.
- **Avoid:** general list; painted pedestal steps with numerals, trophies, ribbons, laurel larger than the medallion.

### Brief 9. Phone view, light and dark
- **Subject and purpose:** `/dashboard/mobile`, seen after a QR scan.
- **Size and aspect:** 390x844, four artboards (light and dark, top of page and scrolled to a second board).
- **Mode:** both.
- **Content:** sticky header with "Example High School" and a timeframe select showing "Spring Term" (44 px tall); a section per board with a 24 px serif title and a 2 px gilt rule; overall shows 10 rows at 64 px: medallion 36 px, name 18 px semi-bold, grade 14 px, points 20 px tabular at the right; a board-jump chip row ("Overall", "Citizenship", "Grade 9"). Body 17 px, labels at least 14 px.
- **Palette, typography, ornament, placeholders:** general rules; the corner-bracket frame is dropped on phone, the divider stays.
- **Avoid:** general list; horizontal scroll, bottom tab bars, hamburger menus, cards within cards, text under 14 px.

### Brief 10. Hub scene cards, light and dark
- **Subject and purpose:** the staff `/dashboard` hub as four scene cards with real thumbnails.
- **Size and aspect:** 1440x900 desktop, light and dark; plus 390x844 mobile in dark.
- **Mode:** both.
- **Content:** heading "Displays" (serif 40 px) with the school name; 2x2 cards (Featured board, Whole-school board, Top cards, Phone view), each with a 16:9 thumbnail (from Briefs 1, 4, 8, 9; blocks are fine if not final), a 20 px title and a 16 px description line. Featured and Whole-school are larger with a gilt top edge; the other two are quiet. A secondary text link "Pair a screen" at the bottom.
- **Palette, typography, ornament, placeholders:** general rules and app tokens; this is a normal app screen so body sizes follow the app, not the wall.
- **Avoid:** general list; charts, stat tiles, metrics of any kind, student names.

Priority if fewer are wanted: 1, 5, 6, 7, then 3, 8, 9, 2, 4, 10.

## 10. Asset requests

The art agent can deliver production assets. These replace CSS gradients and unicode ornaments where a real asset looks better and costs less to render on a weak kiosk GPU. Rules for all assets:

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-colour shapes are SVG** (so they take token colours via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are greyscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honour-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text colour against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text colour used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

### A1. Stage texture
- **File and usage:** `public/display/stage-dark.webp`, `public/display/stage-light.webp`. Full-bleed `background-image` on the scene stage, behind the header band and in the margins around the ledger. Not behind row text.
- **Dimensions:** 1024x1024 tile; @2x 2048x2048.
- **Tiles seamlessly:** yes, both axes, verified by a 3x3 repeat preview.
- **Transparency:** none (opaque).
- **Variants:** dark and light.
- **Palette:** dark base #020817 with a variation range of #020817 to #07102A; light base #F8FAFC with a range of #F2F5F9 to #F8FAFC. A faint hand-engraved cross-hatch or fine paper grain, no figures, no gold in the tile.
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
- **Dimensions:** 256x256 viewBox; renders at 72 px (ledger), 112 px (podium) and 144 px (podium cards, top cards).
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
- **Palette:** dark: base #0E1525, highlight #D6B151 at 30 percent on the top 4 px only; light: base #FFFFFF, highlight #D6A529 at 40 percent on the top 4 px only.
- **Format:** WebP lossless with alpha.
- **Text safe area:** the inner rectangle inset 48 px (at 1280 wide) on all sides is a flat colour with at most 2 percent variation. Text sits there: name at 64 px and points at 72 px, rank-ink on base. The art agent states the measured contrast for #F8FAFC on the dark base and #020817 on the light base.

### A6. Glow behind the leader
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
- **Format:** SVG, single colour, no gradients.
- **Text safe area:** the central 160x160 area is clear; the empty-state heading sits below it, not inside.

### A8. Scene banner header (optional)
- **File and usage:** `public/display/banner-header-dark.webp`, `public/display/banner-header-light.webp`. An optional slim decorative band behind the header (title and divider), for the fixed Hall of Honour only. If A1 and A4 look right without it, skip it.
- **Dimensions:** 1920x240 at 1080p; @2x 3840x480; portrait companion 1080x240 (@2x 2160x480).
- **Tiles:** horizontal seamless (left edge matches right edge) so it can stretch to ultrawide.
- **Transparency:** opaque bottom edge fading to alpha over the last 24 px.
- **Variants:** dark and light.
- **Palette:** dark #020817 to #0E1525 with gilt #D6B151 pinstripe at 20 percent; light #F8FAFC to #FFFFFF with gilt #D6A529 pinstripe at 30 percent.
- **Format:** WebP lossy q90 (alpha needs lossless; use lossless if the fade is kept).
- **Text safe area:** the whole band is a gentle flat gradient; title text at 72 px sits left aligned inside an inset of 4u and must measure 7:1 against the worst pixel in that area. The art agent reports the measurement.

### A9. Phone view header wash
- **File and usage:** `public/display/mobile-header-dark.webp` and `-light.webp`. A subtle wash behind the sticky phone header only.
- **Dimensions:** 390x120; @2x 780x240; @3x 1170x360.
- **Tiles:** horizontal seamless is not required.
- **Transparency:** opaque.
- **Variants:** dark and light.
- **Palette:** dark #0E1525 to #020817; light #FFFFFF to #F8FAFC; no gilt.
- **Format:** WebP lossy q90.
- **Text safe area:** entire area; a flat gradient with at most 2 percent luminance variation, so 17 px text reaches 4.5:1 and the school name (18 px semi-bold) reaches 7:1.

### A10. Sheet of asset review proofs
- **File and usage:** a single review sheet (not shipped): `asset-review.png` showing every asset in both modes on its real background with the sample text and the measured contrast figures written beside it (the one place text is allowed, since it is not shipped).
- **Dimensions:** 3840x2160.
- **Variants:** dark and light halves.

## 11. What this plan deliberately does not do
- No app code, styles, tokens or data change in this run.
- No structure change: removed content (H4), routing (H2) and settings location (H3) are flagged to ux-optimizer.
- Nothing here widens a DISPLAY payload. If the art or the owner asks for any figure not in `displayTypes.ts`, it goes to the disclosure authority first.

Release level implied once built: minor (new look for existing screens). H2 and H3 would be assessed separately and could raise it if routing changes are breaking.
