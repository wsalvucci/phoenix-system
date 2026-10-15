# A8. Scene banner header (optional)

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

## This request

- **File and usage:** `public/display/banner-header-dark.webp`, `public/display/banner-header-light.webp`. An optional slim decorative band behind the header (title and divider), for the fixed Hall of Honor only. If A1 and A4 look right without it, skip it.
- **Dimensions:** 1920x240 at 1080p; @2x 3840x480; portrait companion 1080x240 (@2x 2160x480).
- **Tiles:** horizontal seamless (left edge matches right edge) so it can stretch to ultrawide.
- **Transparency:** opaque bottom edge fading to alpha over the last 24 px.
- **Variants:** dark and light.
- **Palette:** dark #191410 to #251D18 with gilt #D6B151 pinstripe at 20 percent; light #F7F4ED to #FCFBF7 with gilt #D6A529 pinstripe at 30 percent.
- **Format:** WebP lossy q90 (alpha needs lossless; use lossless if the fade is kept).
- **Text safe area:** the whole band is a gentle flat gradient; title text at 72 px sits left aligned inside an inset of 4u and must measure 7:1 against the worst pixel in that area (#F1EDE4 on dark, #271C16 on light). The art agent reports the measurement.
