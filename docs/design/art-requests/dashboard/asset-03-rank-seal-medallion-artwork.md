# A3. Rank seal medallion artwork

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

## This request

- **File and usage:** `public/display/seal-ring.svg` (the scalloped wax-seal outline and inner ring) and `public/display/seal-flame.svg` (the numberless glyph for empty states). `Medallion` fills the shape with `--rank-N` and prints the numeral as live text.
- **Dimensions:** 256x256 viewBox; renders at 72 px on every wall surface and 36 px on the phone. Nothing larger. SUPERSEDED for the seal ring by asset-03b.
- **Tiles:** no.
- **Transparency:** yes.
- **Variants:** none; flat shapes using `currentColor` for the fill and a separate inner ring path with `fill: none; stroke: currentColor` so CSS can set the ring to `--rank-N-foreground` at 50 percent.
- **Palette:** `currentColor`; review sheet shows all six tier fills from the rank list in both modes.
- **Format:** SVG.
- **Text safe area:** the central circle of 150 px diameter (at 256) is clear for a 1 to 2 digit numeral; nothing inside it.
