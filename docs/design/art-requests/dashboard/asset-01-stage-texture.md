# A1. Stage texture

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

## This request

- **File and usage:** `public/display/stage-dark.webp`, `public/display/stage-light.webp`. Full-bleed `background-image` on the scene stage, behind the header band and in the margins around the ledger. Not behind row text.
- **Dimensions:** 1024x1024 tile; @2x 2048x2048.
- **Tiles seamlessly:** yes, both axes, verified by a 3x3 repeat preview.
- **Transparency:** none (opaque).
- **Variants:** dark and light.
- **Palette:** dark base #191410 with a variation range of #191410 to #1F1915; light base #F7F4ED with a range of #F1EDE4 to #F7F4ED. A faint paper or cloth grain, warm-neutral, no figures, no gold in the tile, no blue cast.
- **Format:** WebP lossy q90.
- **Text safe area:** the whole tile is safe for text at 7:1 by the luminance limit above; still, keep text on opaque rows.
