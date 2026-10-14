# A5. Leader plate backing

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

## This request

- **File and usage:** `public/display/plate-leader-dark.webp` and `public/display/plate-leader-light.webp`. The background of the rank 1 plate: a very subtle engraved-plate surface with a faint gilt top-edge highlight.
- **Dimensions:** 1280x480 (the plate at 640x240 CSS px, 2x); a second size 960x400 for portrait is optional.
- **Tiles:** no (single plate, edge-aware to a 9-slice with 64 px corners, so it can stretch).
- **Transparency:** yes, rounded corners at `--radius * 2` in the art with an alpha edge; or opaque rectangle if CSS clips it.
- **Variants:** dark and light.
- **Palette:** dark: base #251D18, highlight #D6B151 at 30 percent on the top 4 px only; light: base #FCFBF7, highlight #D6A529 at 40 percent on the top 4 px only.
- **Format:** WebP lossless with alpha.
- **Text safe area:** the inner rectangle inset 48 px (at 1280 wide) on all sides is a flat color with at most 2 percent variation. Text sits there: name at 64 px and points at 72 px, rank-ink on base. The art agent states the measured contrast for #F1EDE4 (names) and #E5C36C (points) on the dark base, and #271C16 (names) and #794D0C (points) on the light base.
