/*
 * All tunable parameters for the motion graphic live here.
 * Times are in seconds. Change a value, reload index.html, re-run the export.
 */
window.MOTION_CONFIG = {
  // ---------------------------------------------------------------- format
  width: 1080,
  height: 1350,
  fps: 30,
  duration: 9.4,

  // ---------------------------------------------------------------- source
  resumeSrc: 'assets/resume.png',
  // 'cover' = full-bleed, edge-to-edge (centred, overflow cropped top/bottom).
  // A number (e.g. 0.875) = fit that fraction of the frame height, centred.
  resumeFit: 'cover',
  // With 'cover', the share of the vertical overflow cropped from the top.
  // 0.43 keeps the name and the last Achievements row in frame (only the
  // plain margins/bars of the supplied image fall outside).
  coverAnchorY: 0.43,
  // Pixels trimmed off the supplied image before use. The source has a 2px
  // dark border on its left and right edges, removed so the frame is truly
  // edge-to-edge. Nothing inside the resume is touched.
  sourceTrim: { left: 2, right: 2, top: 0, bottom: 0 },

  // ---------------------------------------------------------------- timing
  timing: {
    // Shot 1: static resume with a slow push-in
    pushInEnd: 1.0,
    pushInAmount: 0.015,      // 1.5 % scale-up over shot 1
    // Shot 2: pressure / hairline cracks
    crackStart: 1.0,
    primaryCracksDone: 2.05,  // radial cracks have reached the paper edge
    // Shot 3: cracking / loss of structural integrity
    fractureStart: 2.2,
    secondaryCracksDone: 2.95,// full shard network visible
    releaseStart: 2.45,       // first shards (centre) come loose
    releaseEnd: 3.65,         // last shards (corners) come loose
    // Shot 4: vortex
    vortexStart: 3.8,
    vortexStagger: 0.55,      // centre shards go first, corners this much later
    vortexEnd: 5.25,          // every shard is consumed by this time
    // Shot 5: message (hard cut)
    cut: 5.3,
    line1In: 5.5,
    line2In: 6.35,
    ctaIn: 7.05,
    logoIn: 7.75,
    taglineIn: 8.1,
    textInDuration: 0.75,
  },

  // ---------------------------------------------------------------- fracture
  fracture: {
    seed: 7,
    shardCount: 430,          // approximate number of Voronoi shards
    radialCracks: 9,          // primary cracks running out from the centre
    centreDensity: 3.2,       // how much smaller shards are near the centre
    dustCount: 260,           // tiny paper flecks shed at the crack edges
  },

  // ---------------------------------------------------------------- vortex
  vortex: {
    spiralTightness: 1.55,    // radians of rotation per e-fold of radius
    direction: -1,            // -1 = counter-clockwise, 1 = clockwise
    coreMaxRadius: 980,       // radius the dark core grows to by the cut
  },

  // ---------------------------------------------------------------- render
  // Sub-frame samples for motion blur in the export (shots 3-4 only).
  motionBlurSamples: 10,
  shutter: 0.55,              // fraction of a frame the shutter is open

  // ---------------------------------------------------------------- palette
  palette: {
    background: '#141414',    // revealed behind the shards as they separate
    charcoal: '#141414',      // vortex core + end card
    paperBack: '#EEEBE6',     // back face of paper shards
    crack: 'rgba(28,26,24,1)',
    textPrimary: '#F3F0EA',   // warm off-white
    textSecondary: '#A39F98', // neutral grey
    accent: '#F3F0EA',        // CTA domain (kept monochrome on purpose)
  },

  // ---------------------------------------------------------------- copy
  copy: {
    line1: 'Generic resumes crack<br>under scrutiny.',
    line2: 'Add the missing context &amp; evidence<br>behind your work.',
    ctaLead: 'See what’s missing',
    ctaUrl: 'mygraph.id',
    logoSrc: 'assets/graph-logo.png',
    tagline: 'Built for Data, AI and Analytics professionals',
  },
};
