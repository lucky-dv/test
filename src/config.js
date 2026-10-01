/*
 * All tunable parameters for the motion graphic live here.
 * Times are in seconds. Change a value, reload index.html, re-run the export.
 */
window.MOTION_CONFIG = {
  // ---------------------------------------------------------------- format
  width: 1080,
  height: 1350,
  fps: 30,
  duration: 9.6,

  // ---------------------------------------------------------------- source
  resumeSrc: 'assets/resume.png',
  // Resume height as a fraction of frame height (it is centred).
  resumeFit: 0.875,

  // ---------------------------------------------------------------- timing
  timing: {
    // Shot 1: static resume with a slow push-in
    pushInEnd: 2.0,
    pushInAmount: 0.025,      // 2.5 % scale-up over shot 1
    // Shot 2: pressure / hairline cracks
    crackStart: 2.0,
    primaryCracksDone: 3.05,  // radial cracks have reached the paper edge
    // Shot 3: cracking / loss of structural integrity
    fractureStart: 3.2,
    secondaryCracksDone: 3.95,// full shard network visible
    releaseStart: 3.45,       // first shards (centre) come loose
    releaseEnd: 4.65,         // last shards (corners) come loose
    // Shot 4: vortex
    vortexStart: 4.8,
    vortexStagger: 0.55,      // centre shards go first, corners this much later
    vortexEnd: 6.25,          // every shard is consumed by this time
    // Shot 5: message (hard cut)
    cut: 6.3,
    line1In: 6.5,
    line2In: 7.35,
    ctaIn: 8.05,
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
    background: '#E9E7E3',    // neutral warm grey (shots 1-4)
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
  },
};
