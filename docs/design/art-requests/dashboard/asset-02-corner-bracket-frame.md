# A2. Corner bracket frame

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

## This request

- **File and usage:** `public/display/frame-corner.svg`. One corner (top-left) of the gilt bracket frame; CSS mirrors it to the other three corners. Used by `SceneFrame` on walls and the pairing plate.
- **Dimensions:** 256x256 viewBox; renders at 12u (about 130 px at 1080p); @2x not needed (vector).
- **Tiles:** no.
- **Transparency:** yes.
- **Variants:** none; a single flat shape drawn in `currentColor` (filled by CSS with `--gilt`).
- **Palette:** `currentColor` (shown against #D6B151 dark and #D6A529 light for review).
- **Format:** SVG, single path, stroke weight 6 px at 256 (3 px at 1080p render minimum), no gradients.
- **Text safe area:** the interior square from 64 px to 256 px on both axes is clear of ornament; text never overlaps the bracket.
