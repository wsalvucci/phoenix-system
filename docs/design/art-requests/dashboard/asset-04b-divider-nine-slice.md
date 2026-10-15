# A4b. Double gilt divider as three slices (redo of A4)

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports how the intended color reads on the real background. Ornament is never the only carrier of meaning.
- **Reduced motion and burn-in:** assets are static. Movement (shimmer, drift) is done in CSS.

## Why this redo

The delivered `divider-double.svg` is one 1600x24 file with `preserveAspectRatio="none"`. When it is stretched to a title width the end caps distort, the line weight changes with width, and the lines are 2 units tall, under the 3 px minimum at 1080p. It also rendered blank on the review sheet.

## This request

- **File and usage:** three files in `public/display/`: `divider-left.svg`, `divider-mid.svg`, `divider-right.svg`. The app places the left and right caps at the ends and repeats the middle piece on the x axis. Used under every board title, and as the carrier for the live-update shimmer. Delete `divider-double.svg` once these land.
- **Dimensions:** all three are 24 units tall. Caps are 48x24 viewBox; the middle is 64x24 viewBox. Rendered at 1 unit = 1 px at 1080p, so lines are real 3 px lines.
- **Design:** two parallel straight lines, each 3 units thick, with a 6 unit gap between them (line centers at y 7.5 and y 16.5). The left and right caps are mirror images and end in a small flat-cut chevron or a short vertical tick that joins both lines. No center ornament, no diamond, no fleuron.
- **Seamless middle:** the middle tile repeats on the x axis with no visible seam at 1x, 2x and 3x, and its lines meet the caps exactly.
- **Stroke handling:** no `preserveAspectRatio="none"`, no scaling dependence. Use filled rectangles or whole-unit strokes so edges stay crisp on a TV.
- **Tiles:** middle only, x axis. **Transparency:** yes. **Variants:** none.
- **Palette:** `currentColor` only; review at #D6B151 on #191410 and #D6A529 on #F7F4ED.
- **Format:** SVG, each under 500 bytes.
- **Text safe area:** the title sits above with at least 24 units clear. Nothing overlaps text.
- **Proof (to be added to `asset-review.png`):** an assembled 900 px and 1500 px wide divider in both modes, plus a 3x zoom of one seam and one cap. The previous proof showed the divider blank; the new proof must show it.
