# A4. Double gilt divider

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

## This request

- **File and usage:** `public/display/divider-double.svg`. The rule under every board title; also the shimmer carrier for live updates.
- **Dimensions:** 1600x24 viewBox, stretched horizontally to the title width with end caps preserved (supplied as three SVGs, `divider-left.svg`, `divider-mid.svg` (tileable horizontally, 64x24), `divider-right.svg`, or a 9-slice-ready single file; the art agent chooses and documents).
- **Tiles:** the middle piece tiles seamlessly on the x axis.
- **Transparency:** yes.
- **Variants:** none; `currentColor`.
- **Palette:** `currentColor` (shown at #D6B151 and #D6A529).
- **Format:** SVG.
- **Text safe area:** the title sits above with at least 24 px clear; no text overlap.
