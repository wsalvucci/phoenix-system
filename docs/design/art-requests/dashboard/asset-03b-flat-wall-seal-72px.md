# A3b. Flat wall seal (redo of A3 seal-ring.svg)

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift) is done in CSS. There is no glow on the wall.

## Why this redo

The owner found the seal gaudy at large sizes. We now cap every wall medallion at 72 px and draw it flat. The delivered `seal-ring.svg` has an irregular 36-point outline, a half-transparent outer ring, and a second inner ring only 2 units wide (about 0.6 px at 72 px, below the 3 px minimum line weight). Please redraw it. Do not change `seal-flame.svg`, which passes.

## This request

- **File and usage:** replace `public/display/seal-ring.svg`. The app fills the shape with a rank color and prints the numeral as live text on top.
- **Dimensions:** 256x256 viewBox. Rendered at 72 px on every wall surface and 36 px on the phone. Never larger.
- **Shape:** a flat disc with a gentle scalloped edge: 16 regular, rounded lobes, shallow (depth about 4 percent of the radius), smooth curves, no jagged points, no wax drips, no tails. It must still read as a seal at 36 px.
- **Layers, exactly two:** (1) the scalloped disc, `fill="currentColor"`; (2) one ring, a circle with `fill="none"` and `stroke="var(--seal-ring, currentColor)"`, stroke width 11 units (3 px at 72 px), full opacity, centered, with at least 14 units of fill showing between the ring and the scalloped edge. No second ring, no opacity tricks.
- **Forbidden:** gradients, bevel, gloss or highlight, drop shadow, glow, laurel, texture, any text or numeral.
- **Tiles:** no. **Transparency:** yes. **Variants:** none.
- **Text safe area:** the central circle of 150 units diameter is empty, for a 1 to 2 digit numeral at 40 px. The ring's inner radius must be at least 80 units.
- **Palette:** `currentColor` and `--seal-ring` only. For review, fill with the six rank fills (dark and light) from the brief palette and set the ring to the matching ink ring color.
- **Format:** SVG, hand-optimized, under 1 KB.
- **Proof (to be added to `asset-review.png`):** render the seal at 72 px and 36 px, for all six tiers (1, 2, 3, 4, 5, 6 to 10), in dark and light, with placeholder numerals "1" and "10" in Fraunces 600 at 40 px and 20 px. Mark any tier where the numeral or ring falls under the contrast figures in plan section 4.3.
