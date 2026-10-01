/*
 * The Missing Link: all tunable values for the motion graphic.
 *
 * The supplied artwork (assets/source.png, 1536 × 1024) is the only image.
 * Nothing is redrawn. At load the engine splits the artwork into its own
 * connected pieces of ink. Each piece belongs to the element whose `rect`
 * holds the piece's centre (the smallest rect wins). Every element is then
 * revealed by moving, masking or fading those exact source pixels. Once every
 * element has finished, the page is pixel-identical to the source.
 *
 * Coordinates are source pixels. Times are seconds.
 */
(function () {
  // ------------------------------------------------------------ helpers
  const els = [];
  const add = (id, rect, anim, t, d, opts = {}) => els.push({ id, rect, anim, t, d, ...opts });

  // One findings column. s = start time. Each column follows the same order:
  // number → headline → statistic → caption → visual evidence → explanation.
  function column(n, x0, x1, s, o = {}) {
    const c = 'f' + n + '.';
    add(c + 'num', [x0, 396, x1, 428], 'rise', s, 0.45, { dist: 6, clip: false });
    add(c + 'head', [x0, 428, x1, 480], 'wipe', s + 0.08, 0.65, { dir: 'y', feather: 26, dist: 5 });
    if (o.only) add(c + 'only', [x0, 483, x0 + 36, 503], 'fade', s + 0.34, 0.35);
    add(c + 'stat', [x0, 478, x1, 562], 'rise', s + 0.4, 0.75, { dist: 46, ease: 'outQuart' });
    add(c + 'cap', [x0, 565, x1, 650], 'wipe', s + 0.62, 0.55, { dir: 'y', feather: 22, dist: 4 });
    o.visual(s);
    add(c + 'expl', [x0, 804, x1, 930], 'wipe', s + (o.explAt || 1.15), 0.75, { dir: 'y', feather: 30, dist: 5 });
  }

  // ------------------------------------------------------------ 0.0 – 1.5  the page is ruled
  add('rule.top', [45, 64, 1495, 76], 'wipe', 0.15, 1.15, { dir: 'x', feather: 90, ease: 'inOutCubic' });
  add('rule.mid', [45, 379, 1495, 391], 'wipe', 0.35, 1.15, { dir: 'x', feather: 90, ease: 'inOutCubic' });
  add('rule.foot', [40, 949, 1490, 961], 'wipe', 0.55, 1.05, { dir: 'x', feather: 90, ease: 'inOutCubic' });
  add('rule.v402', [764, 94, 775, 372], 'wipe', 0.45, 0.9, { dir: 'y', feather: 40, ease: 'inOutCubic' });
  add('rule.vmr', [1116, 94, 1127, 372], 'wipe', 0.55, 0.9, { dir: 'y', feather: 40, ease: 'inOutCubic' });
  [267, 530, 768, 1018, 1259].forEach((x, i) =>
    add('rule.col' + (i + 1), [x - 4, 404, x + 7, 936], 'wipe', 0.62 + i * 0.07, 0.95,
      { dir: 'y', feather: 60, ease: 'inOutCubic' }));

  // ------------------------------------------------------------ 1.5 – 2.6  branding
  add('brand.graph', [48, 8, 166, 64], 'wipe', 1.45, 0.6, { dir: 'x', feather: 40, fade: true });
  add('brand.by', [166, 8, 284, 64], 'wipe', 1.68, 0.55, { dir: 'x', feather: 40, fade: true });
  add('link.text', [1216, 24, 1492, 46], 'fade', 1.65, 0.55);
  add('link.underline', [1216, 46, 1492, 59], 'wipe', 1.95, 0.6, { dir: 'x', feather: 24, ease: 'inOutCubic' });

  // ------------------------------------------------------------ 2.0 – 4.0  report title
  add('rr', [48, 94, 262, 117], 'wipe', 2.0, 0.6, { dir: 'x', feather: 40, fade: true });
  add('head.l1', [48, 119, 752, 183], 'rise', 2.25, 0.8, { dist: 24, ease: 'outQuart' });
  add('head.l2', [48, 183, 752, 249], 'rise', 2.5, 0.8, { dist: 24, ease: 'outQuart' });
  add('head.l3', [48, 249, 752, 318], 'rise', 2.75, 0.8, { dist: 24, ease: 'outQuart' });
  add('sub', [48, 320, 752, 379], 'wipe', 3.4, 0.7, { dir: 'y', feather: 22, dist: 5 });

  // ------------------------------------------------------------ 3.1 – 4.8  402
  // Each digit rolls up out of its own baseline, like an odometer settling.
  add('n402.4', [790, 136, 891, 274], 'roll', 3.1, 1.0);
  add('n402.0', [891, 136, 1003, 274], 'roll', 3.24, 1.0);
  add('n402.2', [1003, 136, 1096, 274], 'roll', 3.38, 1.0);
  add('n402.label1', [798, 275, 1032, 299], 'wipe', 4.05, 0.6, { dir: 'x', feather: 50, fade: true });
  add('n402.label2', [798, 299, 1032, 326], 'wipe', 4.17, 0.6, { dir: 'x', feather: 50, fade: true });

  // ------------------------------------------------------------ 4.3 – 6.1  market reality
  add('mr.label', [1156, 96, 1352, 117], 'wipe', 4.3, 0.55, { dir: 'x', feather: 40, fade: true });
  add('mr.rule', [1154, 123, 1226, 138], 'wipe', 4.45, 0.45, { dir: 'x', feather: 16, ease: 'inOutCubic' });
  add('mr.your', [1150, 138, 1365, 189], 'rise', 4.65, 0.7, { dist: 18, ease: 'outQuart' });
  add('mr.resume', [1150, 189, 1365, 229], 'rise', 4.87, 0.7, { dist: 18, ease: 'outQuart' });
  add('mr.hasa', [1150, 229, 1365, 277], 'rise', 5.09, 0.7, { dist: 18, ease: 'outQuart' });
  add('mr.cred', [1150, 277, 1365, 322], 'rise', 5.36, 0.75, { dist: 18, ease: 'outQuart' });
  add('mr.problem', [1150, 322, 1365, 381], 'rise', 5.62, 0.75, { dist: 18, ease: 'outQuart' });

  // ------------------------------------------------------------ 6.5 – 12.4  six findings
  // 01 · ownership bars
  column(1, 45, 265, 6.5, {
    only: true,
    visual: s => {
      add('f1.shield1', [48, 690, 80, 729], 'fade', s + 0.8, 0.35);
      add('f1.bar1', [80, 690, 111, 729], 'wipe', s + 0.88, 0.4, { dir: 'x', feather: 10 });
      add('f1.lab1', [111, 690, 160, 729], 'fade', s + 1.12, 0.35);
      add('f1.shield2', [48, 745, 80, 784], 'fade', s + 0.92, 0.35);
      add('f1.bar2', [80, 745, 214, 784], 'wipe', s + 1.0, 0.65, { dir: 'x', feather: 24, ease: 'inOutCubic' });
      add('f1.lab2', [214, 745, 263, 784], 'fade', s + 1.45, 0.35);
    },
    explAt: 1.3,
  });

  // 02 · dot grid: the single orange half-dot first, then the grey majority
  column(2, 275, 528, 7.25, {
    only: true,
    visual: s => {
      const xs = [301, 321, 341, 361, 382, 402, 422, 442, 462, 482];
      const ys = [666, 685, 704, 722, 741];
      let k = 0;
      ys.forEach((y, r) => xs.forEach((x, c) => {
        const first = r === 0 && c === 0;
        add(`f2.dot${r}${c}`, [x - 9, y - 9, x + 10, y + 10], 'fade',
          first ? s + 0.78 : s + 1.08 + k++ * 0.011, first ? 0.4 : 0.3);
      }));
      add('f2.legendPct', [290, 753, 346, 779], 'fade', s + 1.72, 0.4);
      add('f2.legendText', [346, 753, 496, 779], 'fade', s + 1.8, 0.4);
    },
    explAt: 1.55,
  });

  // 03 · donut (end-to-end)
  column(3, 535, 766, 8.0, {
    visual: s => {
      add('f3.donut', [560, 625, 727, 792], 'donut', s + 0.72, 1.05, { cx: 643, cy: 708, rIn: 46 });
      add('f3.donutLabel', [600, 680, 688, 736], 'fade', s + 1.38, 0.4);
    },
    explAt: 1.4,
  });

  // 04 · classroom vs prod: the label, then the rows one by one
  column(4, 773, 1016, 8.75, {
    visual: s => {
      add('f4.tlabel', [790, 646, 1010, 667], 'wipe', s + 0.7, 0.45, { dir: 'x', feather: 40, fade: true });
      [[670, 699], [699, 728], [728, 756], [756, 787]].forEach(([y0, y1], i) =>
        add('f4.row' + (i + 1), [790, y0, 1010, y1], 'wipe', s + 0.86 + i * 0.15, 0.5,
          { dir: 'x', feather: 70, fade: true, dist: 0 }));
    },
    explAt: 1.55,
  });

  // 05 · donut (skills unproven)
  column(5, 1023, 1257, 9.5, {
    visual: s => {
      add('f5.donut', [1057, 625, 1224, 792], 'donut', s + 0.72, 1.05, { cx: 1140, cy: 708, rIn: 46 });
      add('f5.donutLabel', [1096, 680, 1185, 736], 'fade', s + 1.38, 0.4);
    },
    explAt: 1.4,
  });

  // 06 · six round-number tiles placed like evidence
  column(6, 1264, 1500, 10.25, {
    visual: s => {
      const cols = [[1283, 1351], [1352, 1420], [1420, 1489]];
      [[655, 702], [710, 757]].forEach(([y0, y1], r) => cols.forEach(([x0, x1], c) =>
        add(`f6.tile${r * 3 + c + 1}`, [x0, y0, x1, y1], 'place', s + 0.78 + (r * 3 + c) * 0.11, 0.45, { dist: 7 })));
    },
    explAt: 1.5,
  });

  // ------------------------------------------------------------ 12.2 – 12.9  source + footer
  add('foot.l1', [40, 966, 1495, 991], 'fade', 12.2, 0.6);
  add('foot.l2', [40, 991, 1495, 1016], 'fade', 12.32, 0.6);

  window.MOTION_CONFIG = {
    // ---------------------------------------------------------------- format
    // Pick with ?format=portrait|landscape (or --format in the exporter).
    formats: {
      portrait: { width: 1080, height: 1350 },  // 4:5 LinkedIn (default)
      landscape: { width: 1536, height: 1024 }, // the artwork's native 3:2, 1:1 pixels
    },
    fps: 30,
    duration: 16.0,

    // ---------------------------------------------------------------- source
    src: 'assets/source.png',
    paper: [246, 245, 240],   // #F6F5F0: the artwork's flat paper colour

    // Opacity of the faint "plate" of the whole page shown before each element
    // is inked in. Frame 0 shows the full composition, then each piece prints in.
    ghost: 0.12,

    // ---------------------------------------------------------------- camera
    // Keys: [time, zoom, centreX, centreY] in source pixels. Zoom 1 shows the
    // full artwork width. A monotone cubic runs through the keys, so the
    // camera never overshoots. In 4:5 the artwork is fitted to the width and
    // sits on extra paper above and below.
    camera: [
      [0.0, 1.000, 768, 512],
      [1.6, 1.015, 768, 506],   // near-imperceptible push-in on the cover
      [3.4, 1.030, 752, 470],   // lean into the headline
      [5.2, 1.030, 786, 466],   // drift right across 402 / market reality
      [6.9, 1.025, 766, 556],   // ease down onto the six findings
      [9.4, 1.025, 768, 562],
      [11.9, 1.025, 772, 562],
      [13.5, 1.000, 768, 512],  // back to the full page
      [16.0, 1.000, 768, 512],  // hold
    ],

    elements: els,

    // Labels for the preview player
    shots: [
      [0, 'Opening · the page is ruled'], [1.45, 'Branding'], [2.0, 'Report title'],
      [3.1, '402 candidates'], [4.3, 'Market reality'], [6.5, 'Finding 01'],
      [7.25, 'Finding 02'], [8.0, 'Finding 03'], [8.75, 'Finding 04'], [9.5, 'Finding 05'],
      [10.25, 'Finding 06'], [12.2, 'Source / footer'], [12.9, 'Final hold'],
    ],
  };
})();
