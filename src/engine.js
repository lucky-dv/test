/*
 * Resume fracture → vortex → message
 *
 * A deterministic, time-addressable renderer: renderFrame(t) draws the exact
 * frame for time t, so the preview can scrub freely and the exporter can
 * render frame-by-frame with sub-frame motion blur.
 *
 * Pipeline
 *   1. The supplied resume is drawn 1:1 (scaled to fit) – nothing is redrawn.
 *   2. The resume is cut into Voronoi shards. Points are seeded in mirrored
 *      pairs along a few meandering radial lines so the primary cracks are
 *      real shard boundaries, and the cells get smaller towards the centre
 *      (like an impact in glass).
 *   3. A Dijkstra pass over the shard-edge graph, starting at the centre,
 *      gives each crack segment the moment the fracture front reaches it.
 *      Radial edges are "cheap", so long cracks shoot out first and the
 *      in-between network fills in afterwards.
 *   4. Every shard / paper fleck is a body with a closed-form trajectory:
 *      loosen → drift with inertia and friction → logarithmic-spiral infall
 *      that accelerates as the radius shrinks.
 */
(function () {
  'use strict';

  const C = window.MOTION_CONFIG;
  const T = C.timing;
  const P = C.palette;
  const W = C.width, H = C.height, CX = W / 2, CY = H / 2;

  // ------------------------------------------------------------------ utils
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
  const easeOutCubic = k => 1 - Math.pow(1 - k, 3);
  const easeOutQuart = k => 1 - Math.pow(1 - k, 4);
  const easeInCubic = k => k * k * k;
  const TAU = Math.PI * 2;

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Smooth band-limited "tremor" in [-1, 1].
  function tremor(t, p) {
    return 0.5 * Math.sin(TAU * 11.3 * t + p) +
           0.3 * Math.sin(TAU * 17.9 * t + p * 1.7) +
           0.2 * Math.sin(TAU * 7.1 * t + p * 2.3);
  }
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const CHAR = hexToRgb(P.charcoal);
  const charA = a => `rgba(${CHAR[0]},${CHAR[1]},${CHAR[2]},${a})`;

  // ------------------------------------------------------------------ state
  let img, paper, paperData, RW, RH, RX, RY, OX, OY;
  let shards = [], dust = [], edges = [];
  let ready = false;

  const canvas = document.getElementById('c');
  canvas.width = W; canvas.height = H;
  const out = canvas.getContext('2d');

  // Work surface (motion-blur samples are rendered here, then averaged).
  const work = document.createElement('canvas');
  work.width = W; work.height = H;
  const wctx = work.getContext('2d', { willReadFrequently: true });

  // Half-resolution shadow buffer.
  const shadow = document.createElement('canvas');
  shadow.width = W / 2; shadow.height = H / 2;
  const sctx = shadow.getContext('2d');

  // ------------------------------------------------------------------ setup
  function loadImage(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  }

  async function init() {
    img = await loadImage(C.resumeSrc);

    // Fit the resume, snapped to whole pixels so frame 0 is drawn 1:1.
    const tr = Object.assign({ left: 0, right: 0, top: 0, bottom: 0 }, C.sourceTrim);
    const SX = tr.left, SY = tr.top;
    const SW = img.naturalWidth - tr.left - tr.right, SH = img.naturalHeight - tr.top - tr.bottom;
    const aspect = SW / SH;
    if (C.resumeFit === 'cover') {           // full-bleed: no background, no border
      const s = Math.max(W / SW, H / SH);
      RW = Math.round(SW * s); RH = Math.round(SH * s);
    } else {
      RH = Math.round(H * C.resumeFit);
      RW = Math.round(RH * aspect);
    }
    RX = Math.round((W - RW) / 2);
    RY = Math.round((H - RH) * (C.resumeFit === 'cover' ? C.coverAnchorY ?? 0.5 : 0.5));
    OX = CX - RX; OY = CY - RY; // composition centre in paper coordinates

    paper = document.createElement('canvas');
    paper.width = RW; paper.height = RH;
    const pctx = paper.getContext('2d', { willReadFrequently: true });
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = 'high';
    // Crop first (so resampling never sees the trimmed border), then scale.
    const crop = document.createElement('canvas');
    crop.width = SW; crop.height = SH;
    crop.getContext('2d').drawImage(img, SX, SY, SW, SH, 0, 0, SW, SH);
    pctx.drawImage(crop, 0, 0, RW, RH);
    paperData = pctx.getImageData(0, 0, RW, RH).data;

    buildFracture();
    buildBodies();
    ready = true;
  }

  // ------------------------------------------------------------------ fracture
  function buildFracture() {
    const F = C.fracture;
    const rand = rng(F.seed);
    const rMax = Math.hypot(Math.max(OX, RW - OX), Math.max(OY, RH - OY));
    const base = Math.sqrt(RW * RH / F.shardCount) * 1.12;
    const spacing = r => base / (1 + (F.centreDensity - 1) * Math.exp(-Math.pow(r / 240, 2)));

    const pts = [];
    const rayPairs = new Set();
    const inside = (x, y) => x > 2 && x < RW - 2 && y > 2 && y < RH - 2;

    // Primary cracks: mirrored point pairs along meandering radial lines.
    for (let k = 0; k < F.radialCracks; k++) {
      let ang = (k / F.radialCracks) * TAU + (rand() - 0.5) * 0.45;
      let r = 14 + rand() * 10;
      let x = OX + Math.cos(ang) * r, y = OY + Math.sin(ang) * r;
      while (r < rMax + 40) {
        const sp = spacing(r);
        const d = sp * (0.42 + rand() * 0.12);
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        const a = [x + nx * d, y + ny * d], b = [x - nx * d, y - ny * d];
        if (inside(a[0], a[1]) && inside(b[0], b[1])) {
          rayPairs.add(pts.length + '|' + (pts.length + 1));
          pts.push(a, b);
        } else if (inside(a[0], a[1])) pts.push(a);
        else if (inside(b[0], b[1])) pts.push(b);
        const step = sp * (0.95 + rand() * 0.3);
        ang += (rand() - 0.5) * 0.22;
        x += Math.cos(ang) * step; y += Math.sin(ang) * step;
        r = Math.hypot(x - OX, y - OY);
      }
    }
    const nRay = pts.length;

    // Fill: dart throwing with a centre-weighted minimum distance.
    for (let tries = 0; tries < 60000 && pts.length < F.shardCount + nRay * 0.5; tries++) {
      const x = 2 + rand() * (RW - 4), y = 2 + rand() * (RH - 4);
      const sp = spacing(Math.hypot(x - OX, y - OY)) * 0.86;
      let ok = true;
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i][0] - x, dy = pts[i][1] - y;
        if (dx * dx + dy * dy < sp * sp * (i < nRay ? 0.62 : 1)) { ok = false; break; }
      }
      if (ok) pts.push([x, y]);
    }

    const vor = d3.Delaunay.from(pts).voronoi([0, 0, RW, RH]);

    // Shared vertices + edges.
    const vIndex = new Map(), verts = [];
    const vid = (x, y) => {
      const key = Math.round(x * 64) + ',' + Math.round(y * 64);
      let id = vIndex.get(key);
      if (id === undefined) { id = verts.length; verts.push({ x, y, adj: [] }); vIndex.set(key, id); }
      return id;
    };
    const eIndex = new Map(), E = [];
    const cells = [];
    for (let i = 0; i < pts.length; i++) {
      const poly = vor.cellPolygon(i);
      if (!poly || poly.length < 4) continue;
      poly.pop();
      const ids = poly.map(p => vid(p[0], p[1]));
      const cell = { site: i, poly, ids, edges: [] };
      for (let j = 0; j < ids.length; j++) {
        const a = ids[j], b = ids[(j + 1) % ids.length];
        if (a === b) continue;
        const key = a < b ? a + '_' + b : b + '_' + a;
        let e = eIndex.get(key);
        if (e === undefined) {
          e = E.length;
          E.push({ a: Math.min(a, b), b: Math.max(a, b), cells: [] });
          eIndex.set(key, e);
        }
        E[e].cells.push(i);
        cell.edges.push(e);
      }
      cells.push(cell);
    }

    // Crack graph: interior edges only. Radial edges are cheap → fast cracks.
    for (let e = 0; e < E.length; e++) {
      const ed = E[e];
      ed.interior = ed.cells.length === 2;
      const [c0, c1] = ed.cells;
      ed.primary = ed.interior &&
        (rayPairs.has(c0 + '|' + c1) || rayPairs.has(c1 + '|' + c0));
      const va = verts[ed.a], vb = verts[ed.b];
      ed.len = Math.hypot(va.x - vb.x, va.y - vb.y);
      if (!ed.interior) continue;
      const cost = ed.len * (ed.primary ? 1 : 7 + rand() * 9);
      va.adj.push([ed.b, cost, e]);
      vb.adj.push([ed.a, cost, e]);
    }

    // Dijkstra from the vertex nearest the centre.
    const n = verts.length;
    const dist = new Float64Array(n).fill(Infinity);
    const parentEdge = new Int32Array(n).fill(-1);
    const done = new Uint8Array(n);
    let src = 0, best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!verts[i].adj.length) continue;
      const d = Math.hypot(verts[i].x - OX, verts[i].y - OY);
      if (d < best) { best = d; src = i; }
    }
    dist[src] = 0;
    for (let it = 0; it < n; it++) {
      let u = -1, du = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < du) { du = dist[i]; u = i; }
      if (u < 0) break;
      done[u] = 1;
      for (const [v, c, e] of verts[u].adj) {
        if (du + c < dist[v]) { dist[v] = du + c; parentEdge[v] = e; }
      }
    }

    // Map graph distance → time.
    const rayD = [];
    for (const ed of E) if (ed.primary) rayD.push(dist[ed.a], dist[ed.b]);
    rayD.sort((a, b) => a - b);
    const Tray = rayD[Math.floor(rayD.length * 0.96)] || 1;
    let Tmax = 0;
    for (let i = 0; i < n; i++) if (isFinite(dist[i])) Tmax = Math.max(Tmax, dist[i]);
    const s0 = T.crackStart + 0.04;
    const vTime = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const d = dist[i];
      if (!isFinite(d)) vTime[i] = T.secondaryCracksDone;
      else if (d <= Tray) vTime[i] = s0 + (T.primaryCracksDone - s0) * Math.pow(d / Tray, 0.62);
      else vTime[i] = T.primaryCracksDone +
        (T.secondaryCracksDone - T.primaryCracksDone) * Math.pow((d - Tray) / (Tmax - Tray), 0.8);
    }

    // Crack segments: oriented from the end the front reaches first.
    edges = E.map((ed, e) => {
      let a = ed.a, b = ed.b;
      if (vTime[b] < vTime[a]) [a, b] = [b, a];
      const va = verts[a], vb = verts[b];
      let t0, t1;
      const tree = parentEdge[b] === e;
      if (tree) { t0 = vTime[a]; t1 = Math.max(vTime[b], t0 + 0.02); }
      else {
        t0 = Math.min(vTime[b] + 0.08 + rand() * 0.35, T.secondaryCracksDone + 0.1);
        t1 = t0 + Math.max(0.05, ed.len / 700);
      }
      // Secondary network: held back (bar a small cobweb at the centre and a
      // few early offshoots) and swept outward during shot 3.
      if (!ed.primary) {
        const r = Math.hypot((va.x + vb.x) / 2 - OX, (va.y + vb.y) / 2 - OY);
        const early = r < 70 || (tree && rand() < 0.12);
        if (!early) {
          const sweep = lerp(T.fractureStart - 0.3, T.secondaryCracksDone,
                             Math.pow(clamp(r / rMax), 0.9)) + rand() * 0.15;
          const d = Math.max(t1 - t0, ed.len / 700);
          t0 = Math.max(t0, sweep); t1 = t0 + d;
        }
      }
      return { ax: va.x, ay: va.y, bx: vb.x, by: vb.y, t0, t1,
               primary: ed.primary, interior: ed.interior,
               k: ed.primary ? 0.85 + rand() * 0.15 : 0.35 + rand() * 0.65 };
    });

    // Shards.
    shards = cells.map(cell => {
      const poly = cell.poly;
      // Area-weighted centroid.
      let A = 0, cx = 0, cy = 0;
      for (let j = 0; j < poly.length; j++) {
        const [x0, y0] = poly[j], [x1, y1] = poly[(j + 1) % poly.length];
        const f = x0 * y1 - x1 * y0;
        A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
      }
      A /= 2; cx /= 6 * A; cy /= 6 * A;
      // Dilate ~0.8px so neighbouring shards overlap and no seams show.
      const dil = poly.map(([x, y]) => {
        const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1;
        return [x + dx / l * 0.8, y + dy / l * 0.8];
      });
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of dil) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      x0 = Math.floor(x0) - 1; y0 = Math.floor(y0) - 1; x1 = Math.ceil(x1) + 1; y1 = Math.ceil(y1) + 1;
      const tex = document.createElement('canvas');
      tex.width = Math.max(1, x1 - x0); tex.height = Math.max(1, y1 - y0);
      const tctx = tex.getContext('2d');
      tctx.translate(-x0, -y0);
      tctx.beginPath();
      dil.forEach(([x, y], j) => j ? tctx.lineTo(x, y) : tctx.moveTo(x, y));
      tctx.closePath();
      tctx.clip();
      tctx.drawImage(paper, 0, 0);

      const path = new Path2D();
      dil.forEach(([x, y], j) => j ? path.lineTo(x - cx, y - cy) : path.moveTo(x - cx, y - cy));
      path.closePath();

      const myEdges = cell.edges.map(e => edges[e]).filter(e => e.interior);
      const crackT = Math.min(...cell.ids.map(i => vTime[i]));
      const crackDone = Math.max(T.fractureStart, ...myEdges.map(e => e.t1));
      return { cx, cy, area: Math.abs(A), tex, tx: x0 - cx, ty: y0 - cy, path, edges: myEdges,
               crackT, crackDone, poly };
    });
  }

  // ------------------------------------------------------------------ bodies
  function buildBodies() {
    const rand = rng(C.fracture.seed * 31 + 5);
    const rMax = Math.hypot(Math.max(OX, RW - OX), Math.max(OY, RH - OY));
    const span = T.releaseEnd - T.releaseStart;

    for (const s of shards) {
      const dx = s.cx - OX, dy = s.cy - OY, r = Math.hypot(dx, dy) || 1;
      const k = Math.pow(r / rMax, 0.85);
      s.tr = clamp(T.releaseStart + span * k + (rand() - 0.5) * 0.24,
                   Math.max(T.releaseStart, s.crackDone + 0.04), T.releaseEnd);
      const spread = (rand() - 0.5) * 0.9;
      const ang = Math.atan2(dy, dx) + spread;
      const small = clamp(1 - Math.sqrt(s.area) / 90);
      s.dirx = Math.cos(ang); s.diry = Math.sin(ang);
      s.D = (5 + rand() * 18) * (0.7 + small * 0.9);
      s.sag = 4 + rand() * 10;
      s.rotV = (rand() - 0.5) * 0.5 * (0.6 + small);
      s.axis = rand() * Math.PI;
      s.phiMax = (rand() < 0.5 ? -1 : 1) * (0.1 + rand() * 0.38);
      s.facet = (rand() - 0.5) * 0.09;    // tiny pre-release tilt (light catch)
      s.ph = rand() * TAU;
      s.spin = (rand() - 0.5) * 3.2;
      s.tumble = (rand() < 0.5 ? -1 : 1) * (2.2 + rand() * 5.5);
      s.kind = 0;
    }

    // Paper flecks: born on a shard's fracture edge when that shard lets go.
    const withEdges = shards.filter(s => s.edges.length);
    for (let i = 0; i < C.fracture.dustCount; i++) {
      const s = withEdges[Math.floor(rand() * withEdges.length)];
      const e = s.edges[Math.floor(rand() * s.edges.length)];
      const u = rand();
      const x = lerp(e.ax, e.bx, u), y = lerp(e.ay, e.by, u);
      const px = clamp(Math.round(x), 0, RW - 1), py = clamp(Math.round(y), 0, RH - 1);
      const o = (py * RW + px) * 4;
      const dx = x - OX, dy = y - OY;
      const ang = Math.atan2(dy, dx) + (rand() - 0.5) * 1.6;
      dust.push({
        kind: 1, cx: x, cy: y,
        col: `rgb(${paperData[o]},${paperData[o + 1]},${paperData[o + 2]})`,
        size: 1.3 + rand() * 2.6,
        tr: s.tr + rand() * 0.25,
        dirx: Math.cos(ang), diry: Math.sin(ang),
        D: 14 + rand() * 46, sag: 18 + rand() * 30,
        rotV: (rand() - 0.5) * 6, axis: rand() * Math.PI, phiMax: 0, facet: 0,
        ph: rand() * TAU, spin: (rand() - 0.5) * 10, tumble: 0,
      });
    }

    // Vortex schedule: centre first, corners last; everyone gone by vortexEnd.
    const all = shards.concat(dust);
    let rv = 0;
    for (const b of all) {
      const p = preState(b, T.vortexStart);
      b.r48 = Math.hypot(p.x - CX, p.y - CY);
      rv = Math.max(rv, b.r48);
    }
    for (const b of all) {
      b.vs = T.vortexStart + T.vortexStagger * Math.pow(b.r48 / rv, 1.1) + (rand() - 0.3) * 0.08;
      b.vs = Math.max(T.vortexStart, b.vs);
      b.vd = Math.max(0.45, T.vortexEnd - b.vs - rand() * 0.12);
      const p = preState(b, b.vs);
      b.sx = p.x; b.sy = p.y; b.srot = p.rot; b.sphi = p.phi;
      b.rs = Math.max(1, Math.hypot(p.x - CX, p.y - CY));
      b.th = Math.atan2(p.y - CY, p.x - CX);
    }
  }

  // Position before the vortex takes over (world coordinates).
  function preState(b, t) {
    let x = RX + b.cx, y = RY + b.cy, rot = 0, phi = 0;
    if (b.kind === 0 && t > T.fractureStart) {
      // Tension: a sub-pixel tremor, and hairline gaps opening along cracks.
      const tens = smooth(T.fractureStart, T.fractureStart + 0.5, t) * (1 - smooth(b.tr, b.tr + 0.3, t));
      x += tremor(t, b.ph) * 0.9 * tens;
      y += tremor(t, b.ph + 2.1) * 0.9 * tens;
      const open = smooth(b.crackT, b.tr, t) * 1.6;
      x += b.dirx * open; y += b.diry * open;
      phi = b.facet * smooth(b.crackT, b.crackT + 0.4, t);
    }
    if (t > b.tr) {
      const tau = t - b.tr;
      const f = 1 - Math.exp(-tau / 0.55);          // inertia + friction
      x += b.dirx * b.D * f;
      y += b.diry * b.D * f + b.sag * tau * tau;
      rot += b.rotV * (1 - Math.exp(-tau / 0.9));
      phi += b.phiMax * (1 - Math.exp(-tau / 0.6));
    }
    if (t > T.vortexStart) {
      // The pull switches on: a short, sudden tug toward the centre.
      const g = smooth(T.vortexStart, T.vortexStart + 0.2, t);
      const dx = CX - x, dy = CY - y, l = Math.hypot(dx, dy) || 1;
      const amt = Math.min(l * 0.06, 16) * g;
      x += dx / l * amt; y += dy / l * amt;
    }
    return { x, y, rot, phi, scale: 1, alpha: 1, dark: 0 };
  }

  const scaleAt = r => 0.05 + 0.95 * smooth(0, 340, r);
  const alphaAt = r => smooth(2, 24, r);

  function bodyState(b, t) {
    if (t < b.vs) return preState(b, t);
    const u = clamp((t - b.vs) / b.vd);
    const e = Math.pow(u, 2.4);                     // accelerating infall
    const r = b.rs * (1 - e);
    const c = 16;
    const dTh = C.vortex.direction * C.vortex.spiralTightness * Math.log((b.rs + c) / (r + c));
    const th = b.th + dTh;
    return {
      x: CX + r * Math.cos(th),
      y: CY + r * Math.sin(th),
      rot: b.srot + dTh * 0.9 + b.spin * e,
      phi: b.sphi + b.tumble * e,
      scale: scaleAt(r) / scaleAt(b.rs),
      alpha: u >= 1 ? 0 : clamp(alphaAt(r) / Math.max(1e-3, alphaAt(b.rs))),
      dark: (1 - smooth(0, 430, r)) * 0.92 * smooth(0, 0.3, u),
    };
  }

  // ------------------------------------------------------------------ camera
  // Push-in: speed eases up from rest, then settles to ~40 % after shot 1
  // (no kinks). Integrated once, scaled so shot 1 ends at +pushInAmount.
  const ZOOM_DT = 1 / 240, zoomTable = (() => {
    const n = Math.ceil(C.duration / ZOOM_DT) + 2, z = new Float64Array(n);
    const v = t => (1 - Math.exp(-t / 0.3)) *
      (t <= T.pushInEnd ? 1 : 0.4 + 0.6 * Math.exp(-(t - T.pushInEnd) / 0.5));
    for (let i = 1; i < n; i++) z[i] = z[i - 1] + v((i - 0.5) * ZOOM_DT) * ZOOM_DT;
    const k = T.pushInAmount / z[Math.round(T.pushInEnd / ZOOM_DT)];
    return z.map(x => x * k);
  })();
  const zoomAt = t => {
    const f = clamp(t, 0, C.duration) / ZOOM_DT, i = Math.floor(f);
    return lerp(zoomTable[i], zoomTable[i + 1], f - i);
  };

  function camera(t) {
    // Slow push-in that eases in from rest, then a pull toward the core.
    let s = 1 + zoomAt(t);
    s += 0.07 * easeInCubic(clamp((t - T.vortexStart) / (T.cut - T.vortexStart)));
    // Micro-vibration under pressure, fading once the sheet has broken.
    const v = smooth(T.crackStart + 0.1, T.fractureStart, t) * (1 - smooth(T.releaseStart, T.vortexStart, t));
    const vx = tremor(t, 0.7) * 1.3 * v, vy = tremor(t, 2.9) * 1.3 * v;
    const vr = tremor(t, 4.4) * 0.05 * v;
    return new DOMMatrix().translate(CX + vx, CY + vy).rotate(vr).scale(s).translate(-CX, -CY);
  }

  // ------------------------------------------------------------------ drawing
  // Crack strength buckets: [primary, minK, maxK)
  const GROUPS = [[true, 0, 2], [false, 0, 0.55], [false, 0.55, 0.8], [false, 0.8, 2]];

  function crackStyle(t) {
    const k = smooth(T.crackStart, T.secondaryCracksDone, t);
    return { a: lerp(0.4, 0.82, k), wp: lerp(0.8, 1.45, k), ws: lerp(0.55, 1.0, k) };
  }

  function strokeCracks(ctx, list, t, ox, oy, alphaMul) {
    const st = crackStyle(t);
    for (const pass of [0, 1]) {               // 0: paper ridge highlight, 1: crack
      for (const [prim, lo, hi] of GROUPS) {
        ctx.beginPath();
        let any = false;
        for (const e of list) {
          if (e.primary !== prim || e.k < lo || e.k >= hi || t <= e.t0) continue;
          const p = clamp((t - e.t0) / (e.t1 - e.t0));
          const o = pass ? 0 : 0.9;
          ctx.moveTo(e.ax - ox + o, e.ay - oy + o);
          ctx.lineTo(lerp(e.ax, e.bx, p) - ox + o, lerp(e.ay, e.by, p) - oy + o);
          any = true;
        }
        if (!any) continue;
        const k = (lo + Math.min(hi, 1)) / 2;
        ctx.lineWidth = (prim ? st.wp : st.ws) * (0.7 + 0.3 * k);
        ctx.strokeStyle = pass
          ? `rgba(28,26,24,${st.a * alphaMul * k})`
          : `rgba(255,255,255,${0.5 * st.a * alphaMul * k})`;
        ctx.stroke();
      }
    }
  }

  // Lambert shading for a shard tilted by phi around an in-plane axis.
  const L = (() => { const v = [-0.35, -0.55, 0.76]; const l = Math.hypot(...v); return v.map(c => c / l); })();
  function shade(axis, phi) {
    const sp = Math.sin(phi), cp = Math.cos(phi);
    let nx = Math.sin(axis) * sp, ny = -Math.cos(axis) * sp, nz = cp;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    return (nx * L[0] + ny * L[1] + nz * L[2]) / L[2];  // 1 = flat
  }

  function drawScene(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';

    if (t >= T.cut) { ctx.fillStyle = P.charcoal; ctx.fillRect(0, 0, W, H); return; }

    // Background.
    ctx.fillStyle = P.background;
    ctx.fillRect(0, 0, W, H);
    // Depth: the backdrop falls off to near-black at the centre.
    const lift = ctx.createRadialGradient(CX, CY, 0, CX, CY, H * 0.62);
    lift.addColorStop(0, 'rgba(0,0,0,0.6)');
    lift.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lift;
    ctx.fillRect(0, 0, W, H);

    // The core: a charcoal well that opens when the pull begins.
    const vk = clamp((t - T.vortexStart) / (T.cut - T.vortexStart));
    let coreFade = 0;
    if (vk > 0) {
      coreFade = vk;
      const R = 20 + C.vortex.coreMaxRadius * Math.pow(vk, 0.85) * smooth(0, 0.06, vk);
      const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
      g.addColorStop(0, charA(1));
      g.addColorStop(0.28, charA(0.98));
      g.addColorStop(0.55, charA(0.62));
      g.addColorStop(0.8, charA(0.18));
      g.addColorStop(1, charA(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = charA(0.5 * vk * vk);
      ctx.fillRect(0, 0, W, H);
    }

    const cam = camera(t);
    const intact = t < T.fractureStart;

    // ---- shadows (half-res, blurred)
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, W / 2, H / 2);
    sctx.setTransform(new DOMMatrix().scale(0.5).multiply(cam));
    sctx.fillStyle = '#000';
    const states = intact ? null : shards.map(s => bodyState(s, t));
    if (intact) sctx.fillRect(RX, RY, RW, RH);
    else {
      shards.forEach((s, i) => {
        const st = states[i];
        if (st.alpha <= 0.01) return;
        sctx.save();
        sctx.globalAlpha = st.alpha * (1 - st.dark);
        sctx.translate(st.x, st.y); sctx.rotate(st.rot);
        sctx.rotate(s.axis); sctx.scale(Math.cos(st.phi) * st.scale, st.scale); sctx.rotate(-s.axis);
        sctx.fill(s.path);
        sctx.restore();
      });
    }
    const shA = 1 - coreFade;
    ctx.save();
    ctx.globalAlpha = 0.2 * shA; ctx.filter = 'blur(14px)';
    ctx.drawImage(shadow, 0, 16, W, H);
    ctx.globalAlpha = 0.12 * shA; ctx.filter = 'blur(2px)';
    ctx.drawImage(shadow, 0, 3, W, H);
    ctx.restore();

    ctx.setTransform(cam);

    // ---- paper
    if (intact) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(paper, RX, RY);
      if (t > T.crackStart) {
        ctx.save(); ctx.translate(RX, RY);
        strokeCracks(ctx, edges, t, 0, 0, 1);
        ctx.restore();
      }
      return;
    }

    // ---- shards
    const pairA = 1 - Math.sqrt(1 - crackStyle(t).a); // each edge is drawn by both neighbours
    shards.forEach((s, i) => {
      const st = states[i];
      if (st.alpha <= 0.01) return;
      const cp = Math.cos(st.phi);
      ctx.save();
      ctx.globalAlpha = st.alpha;
      ctx.translate(st.x, st.y);
      ctx.rotate(st.rot);
      ctx.rotate(s.axis); ctx.scale(cp * st.scale, st.scale); ctx.rotate(-s.axis);
      if (cp >= 0) ctx.drawImage(s.tex, s.tx, s.ty);
      else { ctx.fillStyle = P.paperBack; ctx.fill(s.path); }   // back of the sheet
      const sh = shade(s.axis, st.phi);
      if (sh < 1) { ctx.fillStyle = `rgba(0,0,0,${clamp((1 - sh) * 0.5, 0, 0.32)})`; ctx.fill(s.path); }
      else if (sh > 1) { ctx.fillStyle = `rgba(255,255,255,${clamp((sh - 1) * 0.6, 0, 0.2)})`; ctx.fill(s.path); }
      if (st.dark > 0.005) { ctx.fillStyle = charA(st.dark); ctx.fill(s.path); }
      if (s.edges.length) {
        const loose = smooth(s.tr, s.tr + 0.6, t);
        const a = lerp(pairA / crackStyle(t).a, 0.35, loose) * (1 - st.dark);
        strokeCracks(ctx, s.edges, t, s.cx, s.cy, a);
      }
      ctx.restore();
    });

    // ---- paper flecks
    for (const d of dust) {
      if (t < d.tr) continue;
      const st = bodyState(d, t);
      if (st.alpha <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = st.alpha * smooth(d.tr, d.tr + 0.08, t);
      ctx.translate(st.x, st.y); ctx.rotate(st.rot + d.ph);
      const z = d.size * st.scale;
      ctx.fillStyle = d.col;
      ctx.beginPath();
      ctx.moveTo(-z * 0.6, -z * 0.4); ctx.lineTo(z * 0.7, -z * 0.2); ctx.lineTo(-z * 0.1, z * 0.6);
      ctx.closePath(); ctx.fill();
      if (st.dark > 0.005) { ctx.fillStyle = charA(st.dark); ctx.fill(); }
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ text
  const el = id => document.getElementById(id);
  function setupCopy() {
    el('l1').innerHTML = C.copy.line1;
    el('l2').innerHTML = C.copy.line2;
    el('ctaLead').textContent = C.copy.ctaLead;
    el('ctaUrlText').textContent = C.copy.ctaUrl;
    el('logo').style.setProperty('--logo', `url("${C.copy.logoSrc}")`);
    el('tagline').textContent = C.copy.tagline;
  }
  function reveal(node, t, t0, dist) {
    const k = clamp((t - t0) / T.textInDuration);
    const e = easeOutQuart(k);
    node.style.opacity = easeOutCubic(k).toFixed(4);
    node.style.transform = `translate3d(0, ${((1 - e) * dist).toFixed(2)}px, 0)`;
  }
  function drawText(t) {
    const card = el('card');
    const on = t >= T.cut;
    card.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    reveal(el('l1'), t, T.line1In, 26);
    const rk = easeOutQuart(clamp((t - T.line1In - 0.35) / 0.7));
    el('rule').style.transform = `scaleX(${rk.toFixed(4)})`;
    reveal(el('l2'), t, T.line2In, 18);
    reveal(el('cta'), t, T.ctaIn, 14);
    const uk = easeOutQuart(clamp((t - T.ctaIn - 0.3) / 0.6));
    el('ctaLine').style.transform = `scaleX(${uk.toFixed(4)})`;
    reveal(el('logo'), t, T.logoIn, 12);
    reveal(el('tagline'), t, T.taglineIn, 10);
  }

  // ------------------------------------------------------------------ frame
  let acc = null;
  function renderFrame(t, opts = {}) {
    if (!ready) return;
    t = clamp(t, 0, C.duration);
    const samples = opts.motionBlur && t >= T.fractureStart && t < T.cut ? C.motionBlurSamples : 1;
    if (samples === 1) {
      drawScene(out, t);
    } else {
      const dt = C.shutter / C.fps;
      if (!acc) acc = new Float32Array(W * H * 4);
      acc.fill(0);
      for (let i = 0; i < samples; i++) {
        const ts = Math.min(t - dt / 2 + dt * (i + 0.5) / samples, T.cut - 1e-4);
        drawScene(wctx, ts);
        const d = wctx.getImageData(0, 0, W, H).data;
        for (let j = 0; j < d.length; j++) acc[j] += d[j];
      }
      const img = out.createImageData(W, H);
      const inv = 1 / samples;
      for (let j = 0; j < acc.length; j++) img.data[j] = acc[j] * inv + 0.5;
      out.putImageData(img, 0, 0);
    }
    drawText(t);
  }

  window.Motion = {
    config: C,
    init: async () => {
      setupCopy();
      await Promise.all([document.fonts.ready, loadImage(C.copy.logoSrc), init()]);
    },
    renderFrame,
    shotAt: t => t < T.crackStart ? 'Shot 1 · Resume' : t < T.fractureStart ? 'Shot 2 · Pressure'
      : t < T.vortexStart ? 'Shot 3 · Cracking' : t < T.cut ? 'Shot 4 · Vortex' : 'Shot 5 · Message',
    stats: () => ({ shards: shards.length, dust: dust.length, edges: edges.length, resume: [RW, RH, RX, RY] }),
  };
})();
