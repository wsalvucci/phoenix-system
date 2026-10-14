# Brief 10. Hub scene cards, light and dark

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every concept in this set

- **Placeholder data.** Obvious fake names in rank order 1 to 10: Ada Example, Ben Sample, Cy Placeholder, Dee Example, Eli Sample, Fay Placeholder, Gus Example, Hal Sample, Ivy Placeholder, Jo Example. Grades are digits 9 to 12. Points are digits with a thousands comma: 1,240 / 1,185 / 1,102 / 968 / 931 / 874 / 820 / 777 / 705 / 660. School name "Example High School". No real person, school, logo, mascot or brand. No lorem ipsum.
- **Palette: warm gaslight and warm paper, never blue-black or cool white.** Hex values are computed from the HSL tokens (parlor warm values for surfaces, `globals.css` for gilt, seal and rank). Dark: stage #191410, card #251D18, rule #463D35 (decorative only), UI edge #897A6C, foreground (cream ink) #F1EDE4, secondary text #BFB5A6, gilt fill #D6B151, gilt text #E5C36C, seal #7F392F with seal numeral #FAF7F0. Light: stage #F7F4ED, card #FCFBF7, rule #D7CAB7 (decorative only), UI edge #94806B, foreground (iron-gall ink) #271C16, secondary text #64554A, gilt fill #D6A529 (ornament only), gilt text #794D0C, seal #632A21 with seal numeral #FBF9F4. Do not use #020817, #0E1525, #F8FAFC or #FFFFFF as surfaces, and do not invent colors.
- **Rank medallion fills** (dark / light), numeral color in brackets: rank 1 #FFD91A / #E6C300 (#191410 dark, #271C16 light); rank 2 #9FA5AD / #868D98 (same); rank 3 #C67839 / #975926 (#191410 dark, #FBF9F4 light); rank 4 #853285 / #5C0F5C (#F6F4EE dark, #FBF9F4 light); rank 5 #157979 / #006B6B (same as rank 4); ranks 6 to 10 #B81E3A / #A1122C (same as rank 4). Each medallion has a 3 px ring in its ink color. Dark rings: 1 #FFD91A, 2 #B0B6BF, 3 #D68D51, 4 #E198E1, 5 #3BCECE, 6-10 #F8778D. Light rings: 1 #7A5600, 2 #4E555F, 3 #804A1E, 4 #5C0F5C, 5 #006B6B, 6-10 #A1122C. **Rank color appears only on the medallion (fill, numeral, ring). Points are always gilt text (#E5C36C dark, #794D0C light); names are always the foreground ink.** No row tint, bar, plate edge or glow in a rank color.
- **Typography: Fraunces 600 for titles, names, points and all numerals (lining, tabular figures, `SOFT` 0, `WONK` 0, optical size at its display end); Geist 400 and 600 for chips, labels and body.** No Playfair, no Didone, no hairline strokes, no other weights. Show type at the px sizes given for the canvas.
- **Ornament.** Restrained: one gilt corner-bracket frame, one thin double gilt divider under the title, wax-seal medallions for rank, at most one soft radial gilt glow behind rank 1. No filigree borders, scrollwork fills, or stacked drop shadows.
- **Avoid.** Neon, cyan sci-fi, glassmorphism, rainbow gradients, confetti, trophy clip art, cartoon characters, fireworks, stock photos, emoji, text on busy backgrounds, text under 28 px at 1920x1080, lists that fade out, anything implying a bottom of the list, counts ("of 600"), arrows or "up/down", "new" badges, small-print footers, team panels, "Moving up" modules, and red anywhere but the rank 6 to 10 medallion.

## This request

- **Subject and purpose:** the staff `/dashboard` hub as four scene cards with real thumbnails.
- **Size and aspect:** 1440x900 desktop, light and dark; plus 390x844 mobile in dark.
- **Mode:** both.
- **Content:** heading "Displays" (Fraunces 600, 40 px) with the school name; 2x2 cards (Featured board, Whole-school board, Top cards, Phone view), each with a 16:9 thumbnail (from Briefs 1, 4, 8, 9; blocks are fine if not final), a 20 px title and a 16 px description line. Featured and Whole-school are larger with a gilt top edge; the other two are quiet. A secondary text link "Pair a screen" at the bottom.
- **Palette, typography, ornament, placeholders:** general rules and app tokens; this is a normal app screen so body sizes follow the app, not the wall.
- **Avoid:** general list; charts, stat tiles, metrics of any kind, student names.

Priority if fewer are wanted: 1, 5, 6, 7, then 3, 8, 9, 2, 4, 10.
