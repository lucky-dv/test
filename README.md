# Generic resumes crack under scrutiny

A 1080 × 1350 (4:5) LinkedIn motion graphic, about 9.6 s long. A real resume holds up for a moment, develops hairline cracks, breaks into roughly 580 shards cut from the resume itself, and gets pulled into a charcoal vortex. Then it cuts to a clean end card.

The supplied resume (`assets/resume.png`) is the only source image. The code doesn't redraw, retouch or regenerate it. It is scaled once to fit the frame and placed on whole pixels, so frame 0 shows the supplied image exactly. Every shard is a clipped piece of that same image, which is why text, rules and bits of the photo stay visible as it breaks apart.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Preview player: play/pause, scrub, frame-step (← →) and a motion-blur toggle |
| `src/config.js` | **All tunable values**: timing for each shot, shard count, vortex shape, palette, copy |
| `src/engine.js` | Deterministic renderer: fracture generation, crack propagation, shard physics, vortex |
| `scripts/render.mjs` | Headless exporter that writes an MP4 (H.264, BT.709) or PNG stills |
| `assets/` | Source resume and Inter (variable) font |
| `out/` | Rendered output |

## Preview

```bash
npm run preview          # then open http://localhost:5173
```

Any static server works. Opening the file directly with `file://` doesn't, because the engine reads the image's pixels.

## Export

```bash
npm run render           # out/resume-scrutiny.mp4  (30 fps, motion blur)
npm run render:60        # 60 fps version
npm run render:draft     # fast draft, no motion blur
npm run stills           # PNG stills at key moments
node scripts/render.mjs --stills 0,4.2,5.5   # any times you like
```

You need Node 18+, ffmpeg and Playwright's Chromium. The script uses a global Playwright install if the package isn't in the project. Set `CHROMIUM_PATH` to use a specific browser binary.

## Timeline (defaults, from `config.js → timing`)

| Shot | Time | What happens |
| --- | --- | --- |
| 1 · Resume | 0.0–2.0 | The resume as supplied, with a 2.5 % push-in that starts from rest |
| 2 · Pressure | 2.0–3.2 | Hairline cracks start at the centre. About nine primary cracks run to the paper edge. There is sub-pixel tremor and the text stays readable |
| 3 · Cracking | 3.2–4.8 | The secondary crack network spreads outward and hairline gaps open. Shards come loose from the centre outward and drift with inertia and friction. Paper flecks break off the fracture edges |
| 4 · Vortex | 4.8–6.3 | A short sudden pull, then every shard falls in on a logarithmic spiral. It speeds up as the radius shrinks, shards tumble to show the blank back of the paper, and they sink into a charcoal core |
| 5 · Message | 6.3–9.6 | Hard cut to charcoal. Headline at 6.5 s, supporting line at 7.35 s, CTA at 8.05 s |

To retime anything, change it in `config.js`. Crack growth, shard release order and the vortex schedule all follow from those values.

## How it works

1. **Fracture.** The resume is split into Voronoi cells. The seed points are placed in mirrored pairs along a few meandering radial lines, so the main cracks are real shard boundaries and not lines painted on top. The cells get smaller toward the centre, like an impact point in glass.
2. **Crack propagation.** A Dijkstra pass over the shard-edge graph starts from the centre. Radial edges are cheap to cross, so long cracks shoot out first. The rest of the network is held back and sweeps outward during shot 3. Each segment draws from the end the fracture front reaches first.
3. **Shards.** Each shard is a texture clipped from the resume and grown by 0.8 px so no seams show while the sheet is still whole. Shards that tilt are lit with simple Lambert shading. Shards that flip over show the plain back of the paper.
4. **Vortex.** Each shard follows `r = r₀(1 − u^2.4)` and `θ = θ₀ + k·ln((r₀+c)/(r+c))`. That is a spiral that tightens and speeds up as the shard nears the centre. It shrinks and darkens with depth.
5. **Motion blur.** The export averages several sub-frame renders (10 by default, 0.55 shutter) during shots 3–4.
6. **Type.** The end card is live HTML/CSS text in Inter (variable). It stays sharp at any resolution, and you can edit it in `config.js → copy`.

## Notes

- The supplied resume is 516 × 724 px. It is shown about 1.6× larger to fill the 4:5 frame, so it looks a little soft at full size. For a sharper result, swap in a higher-resolution export of the same resume at `assets/resume.png`. Nothing else needs to change.
- The fracture pattern comes from `fracture.seed`. Change the seed for a different, equally valid break pattern.
