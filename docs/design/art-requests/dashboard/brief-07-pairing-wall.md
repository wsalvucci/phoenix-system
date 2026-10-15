# Brief 7. Pairing wall

School rewards app "Phoenix" — hallway TV dashboards ("Honor Board" look).

## Rules for every concept in this set

- **Placeholder data.** Obvious fake names in rank order 1 to 10: Ada Example, Ben Sample, Cy Placeholder, Dee Example, Eli Sample, Fay Placeholder, Gus Example, Hal Sample, Ivy Placeholder, Jo Example. Grades are digits 9 to 12. Points are digits with a thousands comma: 1,240 / 1,185 / 1,102 / 968 / 931 / 874 / 820 / 777 / 705 / 660. School name "Example High School". No real person, school, logo, mascot or brand. No lorem ipsum.
- **Palette: warm gaslight and warm paper, never blue-black or cool white.** Hex values are computed from the HSL tokens (parlor warm values for surfaces, `globals.css` for gilt, seal and rank). Dark: stage #191410, card #251D18, rule #463D35 (decorative only), UI edge #897A6C, foreground (cream ink) #F1EDE4, secondary text #BFB5A6, gilt fill #D6B151, gilt text #E5C36C, seal #7F392F with seal numeral #FAF7F0. Light: stage #F7F4ED, card #FCFBF7, rule #D7CAB7 (decorative only), UI edge #94806B, foreground (iron-gall ink) #271C16, secondary text #64554A, gilt fill #D6A529 (ornament only), gilt text #794D0C, seal #632A21 with seal numeral #FBF9F4. Do not use #020817, #0E1525, #F8FAFC or #FFFFFF as surfaces, and do not invent colors.
- **Rank medallion fills** (dark / light), numeral color in brackets: rank 1 #FFD91A / #E6C300 (#191410 dark, #271C16 light); rank 2 #9FA5AD / #868D98 (same); rank 3 #C67839 / #975926 (#191410 dark, #FBF9F4 light); rank 4 #853285 / #5C0F5C (#F6F4EE dark, #FBF9F4 light); rank 5 #157979 / #006B6B (same as rank 4); ranks 6 to 10 #B81E3A / #A1122C (same as rank 4). Each medallion has a 3 px ring in its ink color. Dark rings: 1 #FFD91A, 2 #B0B6BF, 3 #D68D51, 4 #E198E1, 5 #3BCECE, 6-10 #F8778D. Light rings: 1 #7A5600, 2 #4E555F, 3 #804A1E, 4 #5C0F5C, 5 #006B6B, 6-10 #A1122C. **Rank color appears only on the medallion (fill, numeral, ring). Points are always gilt text (#E5C36C dark, #794D0C light); names are always the foreground ink.** No row tint, bar, plate edge or glow in a rank color.
- **Typography: Fraunces 600 for titles, names, points and all numerals (lining, tabular figures, `SOFT` 0, `WONK` 0, optical size at its display end); Geist 400 and 600 for chips, labels and body.** No Playfair, no Didone, no hairline strokes, no other weights. Show type at the px sizes given for the canvas.
- **Ornament.** Restrained: one gilt corner-bracket frame, one thin double gilt divider under the title, flat wax-seal medallions for rank (72 px maximum, flat fill, one ring, no laurel, no bevel), no glow anywhere. No filigree borders, scrollwork fills, or stacked drop shadows.
- **Avoid.** Neon, cyan sci-fi, glassmorphism, rainbow gradients, confetti, trophy clip art, cartoon characters, fireworks, stock photos, emoji, text on busy backgrounds, text under 28 px at 1920x1080, lists that fade out, anything implying a bottom of the list, counts ("of 600"), arrows or "up/down", "new" badges, small-print footers, team panels, "Moving up" modules, and red anywhere but the rank 6 to 10 medallion.

## This request

- **Subject and purpose:** the kiosk's unpaired state at `/display`, readable by the approving staff member from 3 m.
- **Size and aspect:** 1920x1080 and 1080x1920, plus a small "Connected" artboard.
- **Mode:** dark; a light variant of the landscape one.
- **Content:** wordmark "Phoenix" top left in Fraunces 600 (plain text, no logo supplied); code "1234-5678" centerd in 160 px tabular Fraunces 600 inside a gilt bracket plate; host line "phoenix.example" at 40 px; one instruction line at 36 px ("On your phone or computer, open Phoenix, choose Displays, and enter this code."); a 3 px gilt expiry line about 70% remaining at the very bottom. Confirmation: "Connected" in Fraunces 600 at 120 px, #E5C36C.
- **Palette, typography, ornament, placeholders:** general rules; digits only for the code.
- **Avoid:** general list; school name or logo, student names, countdown numbers, a QR code (undecided), spinner clip art.
