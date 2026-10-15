# A9. Phone view header wash

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

## This request

- **File and usage:** `public/display/mobile-header-dark.webp` and `-light.webp`. A subtle wash behind the sticky phone header only.
- **Dimensions:** 390x120; @2x 780x240; @3x 1170x360.
- **Tiles:** horizontal seamless is not required.
- **Transparency:** opaque.
- **Variants:** dark and light.
- **Palette:** dark #251D18 to #191410; light #FCFBF7 to #F7F4ED; no gilt.
- **Format:** WebP lossy q90.
- **Text safe area:** entire area; a flat gradient with at most 2 percent luminance variation, so 17 px text reaches 4.5:1 and the school name (18 px semi-bold) reaches 7:1.
