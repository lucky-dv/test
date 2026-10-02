# Vikram Family Finance — architecture motion graphic

A ~96-second 1080p explainer, `vikram-family-finance.mp4`, showing how the product works:

1. **The hub**: one Mac at home holds every record, inside a Home Wi-Fi boundary.
2. **Members & devices**: family members are added around the family head; phones pair once with an encrypted link. A phone away from home waits, then catches up.
3. **Many ways in**: SMS from phones, Gmail through one guarded internet exit, statements, spreadsheets and manual entry. No phone-to-phone sync.
4. **Duplicates**: the same bank alert from two SMS and an email becomes one household event with three pieces of evidence.
5. **Reconciling**: the statement is the source of truth, uncertain matches wait for a person, and unknown accounts are never added silently.
6. **Family net worth**: one consolidated INR view for FY 2025–26, by asset class and by member, with every figure traceable to its source.

All names and amounts are illustrative.

## Files

- `index.html` + `anim.js`: the animation, drawn on a canvas by `render(t)`. Open `index.html` in a browser to watch it loop, or add `?t=42` to see one frame.
- `render.mjs`: steps through every frame in headless Chromium and encodes the MP4 with ffmpeg.
- `fonts/`: Inter and Fraunces (SIL Open Font License), bundled locally.

## Re-render

Requires Node 18+, Playwright (global install) and ffmpeg.

```sh
node render.mjs                    # full video -> vikram-family-finance.mp4
node render.mjs --stills 20,50,86  # preview frames -> stills/
```

Timings, captions and copy live near the top of each scene section in `anim.js` (`CAPS`, `CHAPTERS`, `MEMBERS`, `ASSETS`).
