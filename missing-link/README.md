# The Missing Link: animated research cover

The supplied research-report artwork (`assets/source.png`, 1536 × 1024) brought to life as a 16 s editorial motion graphic.

| Output | Size | |
| --- | --- | --- |
| `out/missing-link-4x5.mp4` | 1080 × 1350, 30 fps, 16 s | LinkedIn 4:5 (primary) |
| `out/missing-link-3x2.mp4` | 1536 × 1024, 30 fps, 16 s | The artwork's native size, 1:1 pixels (sharpest text) |
| `out/final-frame-4x5.png` | 1080 × 1350 | Last frame of the 4:5 video |

## The artwork is locked

Nothing is redrawn, re-typeset or regenerated. At load the engine splits the source into its own connected pieces of ink. These are glyphs, words, rules, donut rings, dots, table rows and tiles. Each piece goes to the element whose rect (`src/config.js`) holds its centre. Every animation moves, masks or fades those exact source pixels over the artwork's flat paper colour (#F6F5F0).

When every element has finished, the composed page is **pixel-identical to the source**. `node scripts/render.mjs --verify` checks this: 0 differing pixels, 0 unassigned pieces. Every export runs the check first and refuses to render if it fails. In 4:5 the full artwork is fitted to the width and sits on the same paper, so nothing is cropped.

## Timeline

| Time | What happens |
| --- | --- |
| 0.0–1.5 | The whole page shows as a faint plate (12 %). The orange rules ink in and a ~1.5 % push-in begins |
| 1.45–2.55 | The graph / by datavruti mark prints in. THE MISSING LINK fades up and its own underlines draw |
| 2.0–4.1 | RESEARCH REPORT, then the headline rises line by line out of its baseline. Then the standfirst |
| 3.1–4.8 | **402**: each digit rolls up out of its own baseline, then DATA SCIENTIST / CANDIDATES |
| 4.3–6.4 | MARKET REALITY with its short rule, then Your · resume · has a · credibility · problem |
| 5.2–6.9 | The camera eases down onto the six findings |
| 6.5–12.4 | Findings 01 → 06, staggered 0.75 s apart. Each runs number → headline → (only) → statistic → caption → visual evidence → explanation |
| 12.2–12.9 | Source line and footer |
| 12.0–13.5 | The camera pulls back to the full page |
| 13.5–16.0 | Hold on the finished page |

Visual evidence per finding: **01** shields fade in and the bars wipe in. **02** the single orange half-dot shows first, then the 49 grey dots fill in. **03 / 05** the grey track settles, then the terracotta arc sweeps clockwise from 12 o'clock to its exact drawn extent. **04** the CLASSROOM VS. PROD rows appear one by one. **06** the six round-number tiles are set down one at a time.

## Preview and export

```bash
npx --yes serve -l 5173 .           # open http://localhost:5173 (4:5 / 3:2 switch in the player)
node scripts/render.mjs             # out/missing-link-4x5.mp4
node scripts/render.mjs --format landscape   # out/missing-link-3x2.mp4
node scripts/render.mjs --stills 3,7,9.5,16  # PNG stills
node scripts/render.mjs --verify    # final page == source?
```

You need Node 18+, ffmpeg and Playwright's Chromium (a global Playwright install works).

## Notes

- **402 doesn't count through intermediate values.** A true 0 → 402 counter would need digits (1, 3) and numbers that don't exist in the artwork, set in a substitute font. Each real digit rolls into place instead, which keeps the counter feel without any re-typesetting. The percentages rise in the same way.
- There's no audio. The brief made it optional, and synthetic "paper" sounds would cheapen it.
- The H.264 encode (4:2:0 chroma) softens thin orange type a little. The rendered frames themselves are exact.
