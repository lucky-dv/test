/*
 * Deterministic renderer for "The Missing Link" motion graphic.
 *
 * 1. Segmentation. Every pixel of the source that isn't the flat paper colour
 *    is labelled into 8-connected pieces (glyphs, words, rules, chart parts).
 *    Each piece goes to the element whose rect contains the piece's centre
 *    (the smallest rect wins). Each element becomes a layer: its own source
 *    pixels on a transparent background.
 * 2. Reveal. Per frame, every element draws a faint ghost of itself, then its
 *    reveal (fade, masked rise, feathered wipe, radial sweep...). At progress
 *    1 an element draws its layer unmasked at full opacity, so the fully
 *    revealed page is the source, pixel for pixel. `Motion.verify()` checks it.
 * 3. Camera. The composed page goes into the output frame through a slow
 *    virtual camera (zoom + pan) on the same flat paper.
 */
window.Motion = (() => {
  const C = window.MOTION_CONFIG;
  let W, H, srcData, art, actx, scratch, sctx, out, octx, fmt, layers = [], stats = {};

  // ------------------------------------------------------------------ easing
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const EASE = {
    linear: x => x,
    outCubic: x => 1 - Math.pow(1 - x, 3),
    outQuart: x => 1 - Math.pow(1 - x, 4),
    outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
    inOutCubic: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const DEFAULT_EASE = { fade: 'outCubic', rise: 'outCubic', roll: 'outExpo', wipe: 'outCubic',
    place: 'outCubic', donut: 'inOutCubic' };

  // ------------------------------------------------------------------ load
  const loadImage = s => new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = s;
  });
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  async function init(format = 'portrait') {
    fmt = C.formats[format] || C.formats.portrait;
    const img = await loadImage(C.src);
    W = img.naturalWidth; H = img.naturalHeight;
    const sc = canvas(W, H), sx = sc.getContext('2d', { willReadFrequently: true });
    sx.drawImage(img, 0, 0);
    srcData = sx.getImageData(0, 0, W, H);

    segment();

    art = canvas(W, H); actx = art.getContext('2d');
    scratch = canvas(W, H); sctx = scratch.getContext('2d');
    out = document.getElementById('c');
    out.width = fmt.width; out.height = fmt.height;
    octx = out.getContext('2d', { alpha: false });
    return fmt;
  }

  function segment() {
    const d = srcData.data, N = W * H, [pr, pg, pb] = C.paper;
    const ink = new Uint8Array(N);
    for (let i = 0, j = 0; i < N; i++, j += 4)
      ink[i] = (d[j] !== pr || d[j + 1] !== pg || d[j + 2] !== pb) ? 1 : 0;

    // 8-connected components
    const lab = new Int32Array(N), stack = new Int32Array(N);
    const comps = [];
    for (let i = 0; i < N; i++) {
      if (!ink[i] || lab[i]) continue;
      const id = comps.length + 1;
      let sp = 0, n = 0, sxs = 0, sys = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
      stack[sp++] = i; lab[i] = id;
      while (sp) {
        const p = stack[--sp], x = p % W, y = (p - x) / W;
        n++; sxs += x; sys += y;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= W) continue;
            const q = yy * W + xx;
            if (ink[q] && !lab[q]) { lab[q] = id; stack[sp++] = q; }
          }
        }
      }
      comps.push({ id, n, cx: sxs / n, cy: sys / n, x0, y0, x1: x1 + 1, y1: y1 + 1 });
    }

    // assign each component to an element rect holding its centre
    const els = C.elements;
    const area = r => (r[2] - r[0]) * (r[3] - r[1]);
    const owner = new Int16Array(comps.length + 1).fill(-1);
    const unassigned = [], spill = [];
    for (const c of comps) {
      // prefer rects that hold the whole piece (e.g. a donut ring whose centre
      // sits inside its label's rect), then the smallest
      let best = -1, bestScore = Infinity;
      els.forEach((e, k) => {
        const r = e.rect;
        if (!(c.cx >= r[0] && c.cx < r[2] && c.cy >= r[1] && c.cy < r[3])) return;
        const fits = c.x0 >= r[0] - 3 && c.y0 >= r[1] - 3 && c.x1 <= r[2] + 3 && c.y1 <= r[3] + 3;
        const score = area(r) + (fits ? 0 : 1e9);
        if (score < bestScore) { best = k; bestScore = score; }
      });
      owner[c.id] = best;
      if (best < 0) unassigned.push(c);
      else {
        const r = els[best].rect;
        if (c.x0 < r[0] - 3 || c.y0 < r[1] - 3 || c.x1 > r[2] + 3 || c.y1 > r[3] + 3)
          spill.push(`${els[best].id}: piece ${c.x0},${c.y0}–${c.x1},${c.y1} leaves rect`);
      }
    }

    // build one layer per element (bbox of its pixels, transparent elsewhere)
    const bb = els.map(() => [W, H, 0, 0]);
    for (let i = 0; i < N; i++) {
      const o = lab[i] ? owner[lab[i]] : -1; if (o < 0) continue;
      const x = i % W, y = (i - x) / W, b = bb[o];
      if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x + 1 > b[2]) b[2] = x + 1; if (y + 1 > b[3]) b[3] = y + 1;
    }
    layers = els.map((e, k) => {
      const [x0, y0, x1, y1] = bb[k];
      if (x1 <= x0) return { e, empty: true };
      const w = x1 - x0, h = y1 - y0;
      const mk = () => new ImageData(w, h);
      const full = mk(), acc = e.anim === 'donut' ? mk() : null, rest = e.anim === 'donut' ? mk() : null;
      let accMaxAngle = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * W + x; if (!lab[i] || owner[lab[i]] !== k) continue;
        const s = i * 4, t = ((y - y0) * w + (x - x0)) * 4;
        for (let c = 0; c < 4; c++) full.data[t + c] = d[s + c];
        if (acc) {
          // the terracotta arc vs the grey track, by hue
          const isAcc = d[s] - d[s + 2] > 24;
          const dst = isAcc ? acc : rest;
          for (let c = 0; c < 4; c++) dst.data[t + c] = d[s + c];
          if (isAcc) {
            let a = Math.atan2(y + 0.5 - e.cy, x + 0.5 - e.cx) + Math.PI / 2; // 0 at 12 o'clock, clockwise
            if (a < 0) a += Math.PI * 2;
            if (a < Math.PI * 1.98 && a > accMaxAngle) accMaxAngle = a;
          }
        }
      }
      const toCanvas = im => { const c = canvas(w, h); c.getContext('2d').putImageData(im, 0, 0); return c; };
      return { e, x: x0, y: y0, w, h, img: toCanvas(full),
        acc: acc && toCanvas(acc), rest: rest && toCanvas(rest), sweep: accMaxAngle + 0.04 };
    });

    const empty = layers.filter(l => l.empty).map(l => l.e.id);
    stats = { components: comps.length, elements: els.length, unassigned: unassigned.length, empty, spill };
    if (unassigned.length) console.warn('UNASSIGNED pieces:', unassigned.map(c => `${c.x0},${c.y0}–${c.x1},${c.y1}`).join(' | '));
    if (empty.length) console.warn('EMPTY elements:', empty.join(', '));
  }

  // ------------------------------------------------------------------ compose the page at time t
  function drawLayer(L, img, alpha, dx = 0, dy = 0) {
    if (alpha <= 0) return;
    actx.globalAlpha = Math.min(1, alpha);
    actx.drawImage(img, L.x + dx, L.y + dy);
  }

  function composeArt(t) {
    const [pr, pg, pb] = C.paper, g = C.ghost;
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.globalAlpha = 1;
    actx.fillStyle = `rgb(${pr},${pg},${pb})`;
    actx.fillRect(0, 0, W, H);

    for (const L of layers) {
      if (L.empty) continue;
      const e = L.e, p = clamp01((t - e.t) / e.d);
      if (p >= 1) { drawLayer(L, L.img, 1); continue; }          // finished → exact source
      if (p <= 0) { drawLayer(L, L.img, g); continue; }          // not started → ghost
      const k = EASE[e.ease || DEFAULT_EASE[e.anim]](p);

      switch (e.anim) {
        case 'fade':
          drawLayer(L, L.img, g); drawLayer(L, L.img, k);
          break;

        case 'rise':    // emerges upward, masked to its own box
        case 'roll': {  // odometer: rolls up the full height of its box
          const dist = e.anim === 'roll' ? L.h * 0.92 : (e.dist ?? 12);
          drawLayer(L, L.img, g * (1 - k));
          actx.save();
          if (e.clip !== false) { actx.beginPath(); actx.rect(L.x - 2, L.y - 2, L.w + 4, L.h + 4); actx.clip(); }
          drawLayer(L, L.img, e.anim === 'roll' ? clamp01(k * 1.6) : k, 0, dist * (1 - k));
          actx.restore();
          break;
        }

        case 'place':   // set down onto the page from just above
          drawLayer(L, L.img, g * (1 - k));
          drawLayer(L, L.img, k, 0, -(e.dist ?? 6) * (1 - k));
          break;

        case 'wipe': {  // feathered reveal along x or y, optional small rise
          const dist = e.dist || 0, dy = dist * (1 - k), f = e.feather ?? 30;
          drawLayer(L, L.img, dist ? g * (1 - k) : g);
          const len = e.dir === 'y' ? L.h : L.w, pos = k * (len + f);
          sctx.setTransform(1, 0, 0, 1, 0, 0);
          sctx.globalCompositeOperation = 'copy';
          sctx.globalAlpha = 1;
          sctx.drawImage(L.img, 0, 0);
          sctx.globalCompositeOperation = 'destination-in';
          const gr = e.dir === 'y' ? sctx.createLinearGradient(0, pos - f, 0, pos) : sctx.createLinearGradient(pos - f, 0, pos, 0);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          sctx.fillStyle = gr; sctx.fillRect(0, 0, L.w, L.h);
          sctx.globalCompositeOperation = 'source-over';
          actx.globalAlpha = e.fade ? Math.min(1, 0.25 + k * 0.9) : 1;
          actx.drawImage(scratch, 0, 0, L.w, L.h, L.x, L.y + dy, L.w, L.h);
          break;
        }

        case 'donut': { // grey track settles in, then the terracotta arc draws clockwise from 12 o'clock
          drawLayer(L, L.img, g);
          const kt = EASE.outCubic(clamp01(p / 0.35));
          drawLayer(L, L.rest, kt);
          const ka = EASE.inOutCubic(clamp01((p - 0.12) / 0.88));
          if (ka > 0) {
            actx.save();
            actx.beginPath();
            actx.moveTo(e.cx, e.cy);
            actx.arc(e.cx, e.cy, 200, -Math.PI / 2, -Math.PI / 2 + ka * L.sweep);
            actx.closePath(); actx.clip();
            drawLayer(L, L.acc, 1);
            actx.restore();
          }
          break;
        }
      }
    }
    actx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ camera
  // monotone cubic (Fritsch–Carlson) through the keys, per channel
  function camAt(t) {
    const K = C.camera, n = K.length;
    if (t <= K[0][0]) return K[0].slice(1);
    if (t >= K[n - 1][0]) return K[n - 1].slice(1);
    let i = 0; while (t > K[i + 1][0]) i++;
    const res = [];
    for (let ch = 1; ch <= 3; ch++) {
      const xs = K.map(k => k[0]), ys = K.map(k => k[ch]);
      const sl = (a) => (ys[a + 1] - ys[a]) / (xs[a + 1] - xs[a]);
      const tan = a => {
        if (a === 0 || a === n - 1) return 0;
        const s0 = sl(a - 1), s1 = sl(a);
        if (s0 * s1 <= 0) return 0;
        const h0 = xs[a] - xs[a - 1], h1 = xs[a + 1] - xs[a];
        const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
        return (w1 + w2) / (w1 / s0 + w2 / s1);
      };
      const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h;
      const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
      res.push(h00 * ys[i] + h10 * h * tan(i) + h01 * ys[i + 1] + h11 * h * tan(i + 1));
    }
    return res;
  }

  function renderFrame(t) {
    composeArt(t);
    const [z, cx0, cy0] = camAt(t);
    const base = Math.min(fmt.width / W, fmt.height / H), s = base * z;
    const vw = fmt.width / s, vh = fmt.height / s;
    const lim = (c, v, M) => { const lo = Math.min(v / 2, M - v / 2), hi = Math.max(v / 2, M - v / 2); return Math.max(lo, Math.min(hi, c)); };
    const cx = lim(cx0, vw, W), cy = lim(cy0, vh, H);
    const [pr, pg, pb] = C.paper;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.fillStyle = `rgb(${pr},${pg},${pb})`;
    octx.fillRect(0, 0, fmt.width, fmt.height);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    const tx = fmt.width / 2 - cx * s, ty = fmt.height / 2 - cy * s;
    if (Math.abs(s - 1) < 1e-9 && Number.isInteger(tx) && Number.isInteger(ty)) octx.drawImage(art, tx, ty);
    else octx.drawImage(art, tx, ty, W * s, H * s);
  }

  // The fully revealed page must equal the source exactly.
  function verify() {
    composeArt(C.duration);
    const a = actx.getImageData(0, 0, W, H).data, b = srcData.data;
    let diff = 0, max = 0;
    for (let i = 0; i < a.length; i += 4) {
      const m = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (m) { diff++; if (m > max) max = m; }
    }
    return { differingPixels: diff, maxChannelDiff: max, ...stats };
  }

  function shotAt(t) {
    let label = ''; for (const [s, l] of C.shots) if (t >= s) label = l; return label;
  }

  return { init, renderFrame, verify, shotAt, stats: () => stats };
})();
