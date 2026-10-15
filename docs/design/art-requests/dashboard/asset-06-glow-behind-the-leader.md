# A6. Glow behind the leader (RETIRED: the glow is dropped, do not produce or redo)

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every asset in this set

- **No text and no student data in any asset.** All wording stays live HTML so it stays accessible, searchable and translatable.
- **Flat single-color shapes are SVG** (so they take token colors via CSS `mask-image` or `currentColor`, need no light/dark variants, and scale to 4K). Raster only where a gradient or texture genuinely needs it.
- **Raster format:** WebP (lossless for alpha, quality 90 lossy for opaque textures), with a PNG fallback only if requested. Opaque textures are grayscale or tinted with token hex so the wall does not drift off palette.
- **Files** go to `public/display/` (frames, ornaments, textures) and are referenced from `honor-board.css`.
- **Contrast acceptance:** the art agent reports the minimum and maximum luminance of every texture and the contrast of the intended text color against the worst pixel. Any asset that sits behind text must give at least 7:1 for the text color used on it (4.5:1 for 72 px and larger text). Textures are limited to plus or minus 3 percent luminance variation, and the leader and ledger rows are opaque `--card` surfaces over them, so text never sits on texture directly.
- **Reduced motion and burn-in:** assets are static. Movement (drift, glow) is done in CSS.

## This request

- **File and usage:** `public/display/glow-leader.webp`. A radial warm halo placed behind the rank 1 plate; CSS animates its opacity (60 s breathing, off under reduced motion). It must never sit behind text; it is behind the plate, which is opaque.
- **Dimensions:** 1600x1600; @2x not needed (low frequency).
- **Tiles:** no.
- **Transparency:** yes, alpha falls to 0 well before the edges.
- **Variants:** dark only (in light mode the glow is not shown).
- **Palette:** center #D6B151 at 28 percent alpha falling to 0.
- **Format:** WebP lossless with alpha, no banding (dithered).
- **Text safe area:** none; no text on it.
