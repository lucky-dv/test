// Vikram Family Finance — architecture motion graphic.
// Deterministic: render(t) draws the frame at time t (seconds). render.mjs steps it frame by frame.
const W = 1920, H = 1080, DUR = 96;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const SANS = 'InterV, "DejaVu Sans", sans-serif';
const SERIF = 'FrauncesV, Georgia, serif';

const C = {
  bg: '#0A111D', bg2: '#0F1A2B', panel: '#111D2F', panel2: '#16253B', line: '#253650',
  ink: '#EEF2F7', muted: '#9DABBF', faint: '#5F6F87',
  teal: '#5EC8B8', amber: '#F0B85C', green: '#7FD49A', coral: '#F08A80',
};

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const eio = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eout = x => 1 - Math.pow(1 - x, 3);
const back = x => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
// visible window [a,b] with fades of f seconds
const win = (t, a, b, f = .5) => Math.min(eout(prog(t, a, a + f)), 1 - eio(prog(t, b - f, b)));
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};

// ---------- drawing primitives ----------
function T(s, x, y, o = {}) {
  ctx.save();
  ctx.globalAlpha *= (o.a ?? 1);
  ctx.font = `${o.w || 400} ${o.size || 20}px ${o.f || SANS}`;
  ctx.fillStyle = o.c || C.ink;
  ctx.textAlign = o.al || 'left';
  ctx.textBaseline = o.bl || 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.fillText(s, x, y);
  ctx.restore();
}
function TW(s, size, w = 400, f = SANS, ls = 0) {
  ctx.save();
  ctx.font = `${w} ${size}px ${f}`;
  ctx.letterSpacing = ls + 'px';
  const m = ctx.measureText(s).width;
  ctx.restore();
  return m;
}
function rr(x, y, w, h, r, fill, stroke, lw = 1.5) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function circle(x, y, r, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function line(x1, y1, x2, y2, col, lw = 2, dash) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  ctx.restore();
}
// pill / chip with optional icon; returns width
function chip(x, y, label, o = {}) {
  const size = o.size || 17, h = o.h || 38, pad = 16, iw = o.icon ? 26 : 0;
  const w = TW(label, size, o.w || 500) + pad * 2 + iw;
  const x0 = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x;
  ctx.save();
  ctx.globalAlpha *= (o.a ?? 1);
  rr(x0, y - h / 2, w, h, h / 2, o.fill || rgba(o.col || C.teal, .12), o.stroke ?? rgba(o.col || C.teal, .55), 1.5);
  if (o.icon) icon(o.icon, x0 + pad + 9, y, 18, o.col || C.teal, 2);
  T(label, x0 + pad + iw, y + 1, { size, w: o.w || 500, c: o.tc || o.col || C.teal, bl: 'middle' });
  ctx.restore();
  return w;
}

// ---------- icons (centred at x,y; s = box size) ----------
function icon(kind, x, y, s, col, lw = 2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const k = s / 2;
  ctx.beginPath();
  switch (kind) {
    case 'sms': {
      ctx.roundRect(-k * .9, -k * .75, k * 1.8, k * 1.25, k * .3);
      ctx.moveTo(-k * .45, k * .5); ctx.lineTo(-k * .7, k * .9); ctx.lineTo(-k * .1, k * .5);
      ctx.stroke();
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * k * .42, -k * .12, k * .1, 0, 7); ctx.fill(); }
      break;
    }
    case 'mail':
      ctx.roundRect(-k * .9, -k * .62, k * 1.8, k * 1.24, k * .18);
      ctx.moveTo(-k * .85, -k * .52); ctx.lineTo(0, k * .1); ctx.lineTo(k * .85, -k * .52);
      ctx.stroke(); break;
    case 'doc':
      ctx.moveTo(-k * .62, -k * .9); ctx.lineTo(k * .25, -k * .9); ctx.lineTo(k * .65, -k * .5);
      ctx.lineTo(k * .65, k * .9); ctx.lineTo(-k * .62, k * .9); ctx.closePath();
      ctx.moveTo(k * .25, -k * .9); ctx.lineTo(k * .25, -k * .5); ctx.lineTo(k * .65, -k * .5);
      for (let i = 0; i < 3; i++) { ctx.moveTo(-k * .32, -k * .1 + i * k * .32); ctx.lineTo(k * .35, -k * .1 + i * k * .32); }
      ctx.stroke(); break;
    case 'sheet':
      ctx.roundRect(-k * .82, -k * .82, k * 1.64, k * 1.64, k * .18);
      ctx.moveTo(-k * .82, -k * .27); ctx.lineTo(k * .82, -k * .27);
      ctx.moveTo(-k * .82, k * .27); ctx.lineTo(k * .82, k * .27);
      ctx.moveTo(-k * .2, -k * .82); ctx.lineTo(-k * .2, k * .82);
      ctx.stroke(); break;
    case 'pen':
      ctx.moveTo(-k * .7, k * .7); ctx.lineTo(-k * .55, k * .2); ctx.lineTo(k * .45, -k * .8);
      ctx.lineTo(k * .8, -k * .45); ctx.lineTo(-k * .2, k * .55); ctx.closePath();
      ctx.moveTo(k * .25, -k * .6); ctx.lineTo(k * .6, -k * .25);
      ctx.stroke(); break;
    case 'lock':
      ctx.roundRect(-k * .62, -k * .1, k * 1.24, k * .95, k * .18);
      ctx.moveTo(-k * .38, -k * .1); ctx.lineTo(-k * .38, -k * .38);
      ctx.arc(0, -k * .38, k * .38, Math.PI, 0); ctx.lineTo(k * .38, -k * .1);
      ctx.stroke(); break;
    case 'check':
      ctx.moveTo(-k * .6, 0); ctx.lineTo(-k * .15, k * .45); ctx.lineTo(k * .65, -k * .45);
      ctx.stroke(); break;
    case 'x':
      ctx.moveTo(-k * .5, -k * .5); ctx.lineTo(k * .5, k * .5);
      ctx.moveTo(k * .5, -k * .5); ctx.lineTo(-k * .5, k * .5);
      ctx.stroke(); break;
    case 'up':
      ctx.moveTo(0, k * .7); ctx.lineTo(0, -k * .6);
      ctx.moveTo(-k * .5, -k * .1); ctx.lineTo(0, -k * .65); ctx.lineTo(k * .5, -k * .1);
      ctx.stroke(); break;
    case 'link':
      ctx.moveTo(-k * .8, 0); ctx.lineTo(k * .8, 0);
      ctx.moveTo(k * .4, -k * .4); ctx.lineTo(k * .8, 0); ctx.lineTo(k * .4, k * .4);
      ctx.stroke(); break;
    case 'wifi':
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, k * .7, k * .45 * i, -Math.PI * .75, -Math.PI * .25);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, k * .7, k * .12, 0, 7); ctx.fill(); break;
    case 'cloud':
      ctx.moveTo(-k * .55, k * .45);
      ctx.arc(-k * .5, k * .05, k * .4, Math.PI * .5, Math.PI * 1.45);
      ctx.arc(-k * .05, -k * .3, k * .5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.arc(k * .5, k * .08, k * .37, Math.PI * 1.45, Math.PI * .5);
      ctx.closePath(); ctx.stroke(); break;
    case 'shield':
      ctx.moveTo(0, -k * .9); ctx.lineTo(k * .75, -k * .55); ctx.lineTo(k * .65, k * .25);
      ctx.quadraticCurveTo(k * .4, k * .75, 0, k * .95);
      ctx.quadraticCurveTo(-k * .4, k * .75, -k * .65, k * .25); ctx.lineTo(-k * .75, -k * .55); ctx.closePath();
      ctx.stroke(); break;
  }
  ctx.restore();
}

function phone(x, y, col, glow, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  rr(x - 19, y - 33, 38, 66, 9, C.bg2, col, 2.2);
  rr(x - 13, y - 25, 26, 46, 4, rgba(C.teal, .08 + .32 * glow));
  line(x - 5, y + 27, x + 5, y + 27, col, 2);
  ctx.restore();
}

function mac(x, y, sc, col) {
  const w = 100 * sc, h = 64 * sc;
  rr(x - w / 2, y - h / 2, w, h, 7 * sc, C.bg2, col, 2.5);
  rr(x - w / 2 + 6 * sc, y - h / 2 + 6 * sc, w - 12 * sc, h - 16 * sc, 3 * sc, rgba(C.teal, .2));
  line(x, y + h / 2, x, y + h / 2 + 12 * sc, col, 2.5);
  line(x - 18 * sc, y + h / 2 + 13 * sc, x + 18 * sc, y + h / 2 + 13 * sc, col, 2.5);
}

// ---------- scene data ----------
const HUB = { x: 900, y: 500, r: 115 };
const ELL = { rx: 650, ry: 375 };
const GMAIL = { x: 1720, y: 185 };
const GATE = (() => {
  const dx = GMAIL.x - HUB.x, dy = GMAIL.y - HUB.y;
  const k = 1 / Math.sqrt((dx / ELL.rx) ** 2 + (dy / ELL.ry) ** 2);
  return { x: HUB.x + dx * k, y: HUB.y + dy * k };
})();
const FILES = { x: 1185, y: 765 };

const MEMBERS = [
  { id: 'V', name: 'Vikram', rel: 'Family head', c: '#8FB3FF', x: 900, y: 200, lab: 'right', code: 'right', appear: 13.4, pair: 19.0 },
  { id: 'M', name: 'Meera', rel: 'Spouse', c: '#E8A3C8', x: 1300, y: 470, lab: 'right', code: 'above', appear: 14.0, pair: 19.7 },
  { id: 'K', name: 'Kamla', rel: 'Mother', c: '#C9A8FF', x: 500, y: 470, lab: 'left', code: 'above', appear: 14.6, pair: 20.4 },
  { id: 'A', name: 'Arjun', rel: 'Son', c: '#9ED9A8', x: 700, y: 760, lab: 'below', code: 'left', appear: 15.2, pair: 27.6 },
];
const ARJUN_AWAY = { x: 210, y: 790 };
const CODES = { V: '482 913', M: '730 156', K: '219 804', A: '664 270' };

function memberPos(m, t) {
  if (m.id !== 'A') return { x: m.x, y: m.y };
  const p = eio(prog(t, 25.4, 27.4));
  return { x: lerp(ARJUN_AWAY.x, m.x, p), y: lerp(ARJUN_AWAY.y, m.y, p) };
}
function phonePos(m, t) {
  const p = memberPos(m, t);
  const dx = HUB.x - p.x, dy = HUB.y - p.y, d = Math.hypot(dx, dy);
  return { x: p.x + dx / d * 95, y: p.y + dy / d * 95 };
}
// endpoints of a spoke from point p to the hub ring
function spokeEnds(p, startOff = 38) {
  const dx = HUB.x - p.x, dy = HUB.y - p.y, d = Math.hypot(dx, dy);
  return { x1: p.x + dx / d * startOff, y1: p.y + dy / d * startOff, x2: HUB.x - dx / d * (HUB.r + 4), y2: HUB.y - dy / d * (HUB.r + 4) };
}
const M = id => MEMBERS.find(m => m.id === id);

// ---------- packets ----------
// each packet: start time, duration, kind, colour, path function (t -> points)
const PK = [];
function pk(t0, dur, kind, col, from) { PK.push({ t0, dur, kind, col, from }); }
const fromPhone = id => t => { const p = phonePos(M(id), t); return [p, HUB]; };
const fromGmail = () => [GMAIL, GATE, HUB];
const fromFiles = () => [FILES, HUB];

// Arjun catches up after pairing
[28.7, 29.0, 29.3].forEach(s => pk(s, 1.1, 'sms', M('A').c, fromPhone('A')));
// Scene 3: SMS from every phone
['V', 'M', 'K', 'A'].forEach((id, i) => {
  pk(30.4 + i * .35, 1.3, 'sms', M(id).c, fromPhone(id));
  pk(32.0 + i * .35, 1.3, 'sms', M(id).c, fromPhone(id));
});
// Gmail through the guarded exit
[35.7, 36.4, 37.1].forEach(s => pk(s, 2.0, 'mail', C.ink, fromGmail));
// Files & manual entry
pk(39.7, 1.2, 'doc', C.ink, fromFiles);
pk(40.1, 1.2, 'sheet', C.ink, fromFiles);
pk(40.5, 1.2, 'pen', C.ink, fromFiles);
// Scene 4: the same bank alert, three times
pk(46.6, 1.2, 'sms', M('V').c, fromPhone('V'));
pk(47.2, 1.2, 'sms', M('M').c, fromPhone('M'));
pk(47.4, 1.8, 'mail', C.ink, fromGmail);
// Scene 5: SMS vs statement; then an unknown account
pk(58.4, 1.2, 'sms', M('K').c, fromPhone('K'));
pk(58.8, 1.2, 'doc', C.ink, fromFiles);
pk(68.0, 1.2, 'sms', M('A').c, fromPhone('A'));
// Outro: everything flowing at once
['V', 'M', 'K', 'A'].forEach((id, i) => pk(90.8 + i * .12, 1.3, 'sms', M(id).c, fromPhone(id)));
pk(90.6, 2.0, 'mail', C.ink, fromGmail);
pk(91.0, 1.2, 'doc', C.ink, fromFiles);

function along(pts, p) {
  const seg = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); L += d; }
  let s = p * L;
  for (let i = 0; i < seg.length; i++) {
    if (s <= seg[i] || i === seg.length - 1) {
      const q = clamp(s / seg[i]);
      return { x: lerp(pts[i].x, pts[i + 1].x, q), y: lerp(pts[i].y, pts[i + 1].y, q) };
    }
    s -= seg[i];
  }
}
function drawPackets(t) {
  for (const k of PK) {
    if (t < k.t0 || t > k.t0 + k.dur) continue;
    const p = eio(prog(t, k.t0, k.t0 + k.dur));
    const pos = along(k.from(t), p);
    const a = Math.min(prog(t, k.t0, k.t0 + .2), 1 - prog(t, k.t0 + k.dur - .15, k.t0 + k.dur));
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.shadowColor = rgba(C.teal, .5); ctx.shadowBlur = 18;
    rr(pos.x - 25, pos.y - 18, 50, 36, 11, C.panel2, rgba(k.col, .9), 1.8);
    ctx.shadowBlur = 0;
    icon(k.kind, pos.x, pos.y, 20, k.col, 2);
    ctx.restore();
  }
}
function hubPulse(t) {
  let v = 0;
  for (const k of PK) {
    const arr = k.t0 + k.dur;
    if (t > arr) v += Math.exp(-(t - arr) * 5);
  }
  return Math.min(v, 1.4);
}

// ---------- camera ----------
function camera(t) {
  const p1 = eio(prog(t, 44.5, 46.5)), p2 = eio(prog(t, 75.3, 77.3));
  let cx = lerp(900, 470, p1), cy = lerp(500, 540, p1), s = lerp(1, .6, p1);
  cx = lerp(cx, 900, p2); cy = lerp(cy, 500, p2); s = lerp(s, 1, p2);
  return { cx, cy, s };
}
const toScreen = (cam, x, y) => ({ x: cam.cx + (x - 900) * cam.s, y: cam.cy + (y - 500) * cam.s });

// ---------- network ----------
function drawNetwork(t) {
  // Home Wi-Fi boundary
  for (let i = 0; i < 3; i++) {
    const a0 = 7.4 + i * .7, p = prog(t, a0, a0 + 2.2);
    if (p > 0 && p < 1) {
      ctx.save();
      ctx.globalAlpha *= (1 - p) * .6;
      ctx.beginPath(); ctx.ellipse(HUB.x, HUB.y, ELL.rx * eout(p), ELL.ry * eout(p), 0, 0, 7);
      ctx.strokeStyle = C.teal; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }
  const bp = eout(prog(t, 8.6, 10.4));
  if (bp > 0) {
    ctx.save();
    ctx.globalAlpha *= bp;
    ctx.beginPath(); ctx.ellipse(HUB.x, HUB.y, ELL.rx * lerp(.85, 1, bp), ELL.ry * lerp(.85, 1, bp), 0, 0, 7);
    const g = ctx.createRadialGradient(HUB.x, HUB.y, 50, HUB.x, HUB.y, ELL.rx);
    g.addColorStop(0, rgba(C.teal, .07)); g.addColorStop(1, rgba(C.teal, .015));
    ctx.fillStyle = g; ctx.fill();
    ctx.setLineDash([3, 9]); ctx.lineDashOffset = -t * 6;
    ctx.strokeStyle = rgba(C.teal, .55); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    const la = eout(prog(t, 10, 10.8));
    ctx.save(); ctx.globalAlpha *= la;
    icon('wifi', 166, 168, 26, C.teal, 2.2);
    T('Home Wi-Fi', 190, 176, { size: 22, w: 600, c: C.teal });
    T('Works only when you’re home', 150, 204, { size: 16, c: C.muted });
    ctx.restore();
  }

  // Gmail + guarded exit
  const ga = eout(prog(t, 34.6, 35.4));
  if (ga > 0) {
    ctx.save(); ctx.globalAlpha *= ga;
    line(GMAIL.x, GMAIL.y, GATE.x, GATE.y, rgba(C.muted, .5), 2, [4, 8]);
    line(GATE.x, GATE.y, HUB.x + (GATE.x - HUB.x) * .2, HUB.y + (GATE.y - HUB.y) * .2, rgba(C.teal, .3), 2);
    circle(GMAIL.x, GMAIL.y, 46, C.bg2, rgba(C.muted, .6), 2);
    icon('mail', GMAIL.x, GMAIL.y, 36, C.ink, 2.2);
    T('Gmail', GMAIL.x, GMAIL.y + 78, { size: 20, w: 600, al: 'center' });
    T('on the internet', GMAIL.x, GMAIL.y + 101, { size: 15, c: C.muted, al: 'center' });
    // outbound fetch request: a small dot from hub to Gmail
    const fp = prog(t, 35.0, 35.7);
    if (fp > 0 && fp < 1) {
      const pos = along([HUB, GATE, GMAIL], eio(fp));
      circle(pos.x, pos.y, 6, C.teal);
    }
    ctx.restore();
    const gg = back(prog(t, 35.0, 35.6));
    ctx.save(); ctx.globalAlpha *= ga;
    ctx.translate(GATE.x, GATE.y); ctx.scale(gg, gg);
    circle(0, 0, 24, C.bg2, C.teal, 2);
    icon('lock', 0, 0, 22, C.teal, 2);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= ga;
    rr(GATE.x + 30, GATE.y + 12, 250, 56, 10, rgba(C.bg, .85));
    T('One guarded exit', GATE.x + 40, GATE.y + 34, { size: 17, w: 600, c: C.teal });
    T('Fetches email, keeps it at home', GATE.x + 40, GATE.y + 56, { size: 15, c: C.muted });
    ctx.restore();
  }

  // Files & manual entry cluster
  const fa = eout(prog(t, 39.0, 39.7));
  if (fa > 0) {
    const e = spokeEnds(FILES, 50);
    ctx.save(); ctx.globalAlpha *= fa;
    line(e.x1, e.y1, e.x2, e.y2, rgba(C.teal, .35), 2);
    ['doc', 'sheet', 'pen'].forEach((k, i) => {
      const x = FILES.x - 66 + i * 66;
      rr(x - 27, FILES.y - 27, 54, 54, 14, C.bg2, rgba(C.muted, .55), 1.6);
      icon(k, x, FILES.y, 26, C.ink, 2);
    });
    T('Statements · Spreadsheets · Typed in', FILES.x, FILES.y + 58, { size: 16, c: C.muted, al: 'center' });
    ctx.restore();
  }

  // spokes
  for (const m of MEMBERS) {
    const ma = eout(prog(t, m.appear + 3.6, m.appear + 4.2));
    if (ma <= 0) continue;
    const ph = phonePos(m, t), e = spokeEnds(ph, 36);
    const gp = prog(t, m.pair + .2, m.pair + 1.0), sp = prog(t, m.pair + 1.0, m.pair + 1.5);
    if (gp > 0) {
      const x2 = lerp(e.x1, e.x2, eout(gp)), y2 = lerp(e.y1, e.y2, eout(gp));
      line(e.x1, e.y1, x2, y2, rgba(C.teal, .6 * (1 - sp)), 2, [5, 7]);
      if (sp > 0) {
        line(e.x1, e.y1, e.x2, e.y2, rgba(C.teal, .38 * sp), 2.2);
        const flow = win(t, 30, 44.5, .8) + win(t, 90.4, 96, .6);
        if (flow > 0) {
          ctx.save(); ctx.globalAlpha *= flow;
          ctx.setLineDash([2, 14]); ctx.lineDashOffset = -t * 50;
          line(e.x1, e.y1, e.x2, e.y2, rgba(C.teal, .9), 3, [2, 14]);
          ctx.restore();
        }
      }
      // lock badge at the midpoint, briefly
      const la = win(t, m.pair + 1.1, m.pair + 3.0, .3);
      if (la > 0) {
        const mx = (e.x1 + e.x2) / 2, my = (e.y1 + e.y2) / 2;
        ctx.save(); ctx.globalAlpha *= la;
        const s = back(prog(t, m.pair + 1.1, m.pair + 1.5));
        ctx.translate(mx, my); ctx.scale(s, s);
        rr(-50, -17, 100, 34, 17, C.panel2, C.teal, 1.5);
        icon('lock', -28, 0, 16, C.teal, 2);
        T('Paired', -14, 1, { size: 15, w: 600, c: C.teal, bl: 'middle' });
        ctx.restore();
      }
    }
  }

  // no phone-to-phone
  const np = win(t, 42.2, 44.6, .4);
  if (np > 0) {
    const a = phonePos(M('V'), t), b = phonePos(M('M'), t), c = { x: 1150, y: 300 };
    const dp = eout(prog(t, 42.2, 43.0));
    ctx.save(); ctx.globalAlpha *= np;
    ctx.beginPath(); ctx.moveTo(a.x + 22, a.y);
    // partial quadratic via de Casteljau
    const q = (u) => ({ x: (1 - u) ** 2 * (a.x + 22) + 2 * (1 - u) * u * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * (b.y - 36) });
    for (let u = 0; u <= dp + 1e-6; u += .02) { const p = q(u); ctx.lineTo(p.x, p.y); }
    ctx.setLineDash([6, 8]); ctx.strokeStyle = rgba(C.coral, .85); ctx.lineWidth = 2.2; ctx.stroke();
    const mid = q(.5), xs = back(prog(t, 42.9, 43.3));
    ctx.setLineDash([]);
    ctx.translate(mid.x, mid.y); ctx.scale(xs, xs);
    circle(0, 0, 17, C.bg2, C.coral, 2);
    icon('x', 0, 0, 16, C.coral, 2.4);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= np * eout(prog(t, 43.0, 43.5));
    T('No phone-to-phone sync', mid.x + 28, mid.y + 6, { size: 17, w: 600, c: C.coral });
    ctx.restore();
  }

  drawPackets(t);

  // hub
  const hs = back(prog(t, 6.2, 7.2));
  if (hs > 0) {
    const pulse = hubPulse(t);
    ctx.save();
    ctx.translate(HUB.x, HUB.y); ctx.scale(hs, hs);
    if (pulse > .02) { circle(0, 0, HUB.r + 10 + 18 * (1 - Math.min(pulse, 1)), null, rgba(C.teal, .35 * Math.min(pulse, 1)), 3); }
    ctx.shadowColor = rgba(C.teal, .35 + .3 * Math.min(pulse, 1)); ctx.shadowBlur = 40 + 30 * Math.min(pulse, 1);
    circle(0, 0, HUB.r, C.panel, rgba(C.teal, .85), 2.5);
    ctx.shadowBlur = 0;
    mac(0, -28, 1, C.teal);
    T('Family hub', 0, 52, { size: 21, w: 650, al: 'center' });
    T('The Mac at home', 0, 76, { size: 15, c: C.muted, al: 'center' });
    ctx.restore();
  }
  // "data stays here" chip
  const dc = win(t, 10.6, 13.2, .4);
  if (dc > 0) chip(HUB.x, HUB.y + 160, 'All records stored on this Mac', { icon: 'lock', a: dc, al: 'center' });

  // members + phones
  for (const m of MEMBERS) drawMember(m, t);
}

function drawMember(m, t) {
  const a = eout(prog(t, m.appear, m.appear + .5));
  if (a <= 0) return;
  const p = memberPos(m, t), s = back(prog(t, m.appear, m.appear + .6));
  // phone
  const pa = eout(prog(t, m.appear + 3.6, m.appear + 4.2));
  if (pa > 0) {
    const ph = phonePos(m, t);
    const glow = eout(prog(t, m.pair + 1.0, m.pair + 1.5)) * (.6 + .4 * Math.min(hubPulse(t), 1));
    const away = m.id === 'A' && t < 27.4;
    phone(ph.x, ph.y + (1 - pa) * 12, rgba(m.c, away ? .55 : .95), glow, pa);
    // pairing code bubble
    const ca = win(t, m.pair, m.pair + 1.9, .3);
    if (ca > 0) {
      const off = { right: [82, 0], above: [0, -66], left: [-82, 0] }[m.code];
      ctx.save(); ctx.globalAlpha *= ca;
      rr(ph.x + off[0] - 50, ph.y + off[1] - 19, 100, 38, 10, C.panel2, rgba(C.teal, .7), 1.5);
      T(CODES[m.id], ph.x + off[0], ph.y + off[1] + 1, { size: 18, w: 600, c: C.ink, al: 'center', bl: 'middle', ls: 1 });
      ctx.restore();
    }
    // Arjun away
    if (m.id === 'A') {
      const wa = win(t, 23.6, 26.0, .4);
      if (wa > 0) chip(ph.x, ph.y - 62, 'Not home · waiting', { col: C.amber, a: wa, al: 'center', size: 16, h: 34 });
      const cu = win(t, 28.4, 30.2, .3);
      if (cu > 0) chip(ph.x - 40, ph.y - 62, 'Catching up', { col: C.teal, icon: 'up', a: cu, al: 'center', size: 16, h: 34 });
    }
  }
  // avatar
  ctx.save(); ctx.globalAlpha *= a;
  ctx.translate(p.x, p.y); ctx.scale(s, s);
  circle(0, 0, 38, rgba(m.c, .16), m.c, 2.5);
  T(m.id, 0, 2, { size: 28, w: 650, c: m.c, al: 'center', bl: 'middle' });
  ctx.restore();
  // labels
  const la = eout(prog(t, m.appear + .2, m.appear + .7));
  ctx.save(); ctx.globalAlpha *= la;
  if (m.lab === 'right') {
    T(m.name, p.x + 54, p.y - 4, { size: 21, w: 650 });
    T(m.rel, p.x + 54, p.y + 20, { size: 16, c: C.muted });
  } else if (m.lab === 'left') {
    T(m.name, p.x - 54, p.y - 4, { size: 21, w: 650, al: 'right' });
    T(m.rel, p.x - 54, p.y + 20, { size: 16, c: C.muted, al: 'right' });
  } else {
    T(m.name, p.x, p.y + 64, { size: 21, w: 650, al: 'center' });
    T(m.rel, p.x, p.y + 86, { size: 16, c: C.muted, al: 'center' });
  }
  ctx.restore();
  if (m.id === 'V') {
    const ad = eout(prog(t, 15.8, 16.3));
    if (ad > 0) chip(p.x + 54 + TW('Family head', 16) + 12, p.y + 14, 'Admin', { a: ad * la, size: 13, h: 24, col: m.c });
  }
}

// ---------- panel scenes (inside the hub) ----------
const P = { x: 1060, y: 140, w: 790, h: 740 };

function segText(segs, x, y, size, hl, w = 400) {
  // segs: array of strings; odd-index entries are highlightable
  let cx = x;
  segs.forEach((s, i) => {
    const isH = i % 2 === 1;
    const col = isH && hl > 0 ? C.teal : C.ink;
    T(s, cx, y, { size, w: isH ? 600 : w, c: col });
    const sw = TW(s, size, isH ? 600 : w);
    if (isH && hl > 0) line(cx, y + 8, cx + sw * hl, y + 8, C.teal, 2.5);
    cx += sw;
  });
}

function evidenceCard(x, y, w, h, src, srcIcon, srcCol, segs, hl, a) {
  ctx.save(); ctx.globalAlpha *= a;
  rr(x, y, w, h, 16, C.panel2, C.line, 1.5);
  rr(x + 20, y + h / 2 - 24, 48, 48, 12, rgba(srcCol, .12), rgba(srcCol, .6), 1.5);
  icon(srcIcon, x + 44, y + h / 2, 24, srcCol, 2);
  T(src, x + 86, y + 40, { size: 16, w: 600, c: C.muted });
  segText(segs, x + 86, y + 74, 21, hl);
  ctx.restore();
}

function drawPanel(t, cam) {
  const pa = Math.min(eout(prog(t, 45.4, 46.6)), 1 - eio(prog(t, 75.0, 75.8)));
  if (pa <= 0) return;
  ctx.save(); ctx.globalAlpha *= pa;
  // connector from hub to panel
  const h = toScreen(cam, HUB.x, HUB.y);
  ctx.save();
  ctx.setLineDash([3, 7]); ctx.lineDashOffset = -t * 20;
  circle(h.x, h.y, (HUB.r + 22) * cam.s, null, rgba(C.teal, .8), 2.5);
  ctx.restore();
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 50;
  rr(P.x, P.y, P.w, P.h, 26, rgba(C.panel, .97), C.line, 1.5);
  ctx.shadowBlur = 0;
  T('INSIDE THE HUB', P.x + 40, P.y + 56, { size: 15, w: 650, c: C.teal, ls: 2.5 });
  const h1 = 1 - eio(prog(t, 57.4, 58.0)), h2 = eout(prog(t, 57.8, 58.4));
  T('Spotting duplicates', P.x + 40, P.y + 100, { size: 34, w: 650, a: h1 });
  T('Reconciling records', P.x + 40, P.y + 100, { size: 34, w: 650, a: h2 });
  ctx.restore();

  ctx.save(); ctx.globalAlpha *= pa;
  drawDedupe(t);
  drawRecon(t);
  ctx.restore();
}

function drawDedupe(t) {
  const out = 1 - eio(prog(t, 57.0, 57.6));
  if (out <= 0 || t < 47) return;
  const x = P.x + 40, w = P.w - 80, h = 104;
  const hl = eout(prog(t, 49.8, 50.6));
  const mp = eio(prog(t, 51.2, 52.3));
  const slots = [262, 380, 498];
  const cards = [
    { at: 47.8, src: 'Vikram’s phone · SMS', ic: 'sms', col: M('V').c, segs: ['HDFC Bank: ', '₹25,000', ' debited · A/c ', '••3021', ' · ', '28 Sep'] },
    { at: 48.4, src: 'Meera’s phone · SMS', ic: 'sms', col: M('M').c, segs: ['HDFC Bank: ', '₹25,000', ' debited · A/c ', '••3021', ' · ', '28 Sep'] },
    { at: 49.2, src: 'Email · alerts from HDFC Bank', ic: 'mail', col: C.ink, segs: ['Debit alert: ', '₹25,000', ' from A/c ', '••3021', ' on ', '28 Sep'] },
  ];
  cards.forEach((c, i) => {
    const ap = eout(prog(t, c.at, c.at + .5));
    if (ap <= 0) return;
    const y = lerp(slots[i], slots[0] + 40 + i * 10, mp);
    const a = ap * (1 - eio(prog(t, 51.8, 52.4))) * out;
    evidenceCard(x + (1 - ap) * -40 + i * 10 * mp, y, w - i * 20 * mp, h, c.src, c.ic, c.col, c.segs, hl, a);
  });
  // match reason
  const ma = win(t, 50.2, 51.6, .35);
  if (ma > 0) chip(x, 650, 'Same amount · same account · same day', { icon: 'link', a: ma });

  // merged event
  const me = eout(prog(t, 52.1, 52.8)) * out;
  if (me > 0) {
    const y = 290, hh = 176;
    ctx.save(); ctx.globalAlpha *= me;
    ctx.translate(0, (1 - me) * 16);
    rr(x, y, w, hh, 18, C.panel2, rgba(C.teal, .8), 2);
    T('1 HOUSEHOLD EVENT', x + 28, y + 44, { size: 14, w: 650, c: C.teal, ls: 2 });
    T('₹25,000 debit · HDFC A/c ••3021 · 28 Sep', x + 28, y + 86, { size: 25, w: 650 });
    let cx = x + 28;
    [['sms', 'SMS · Vikram', M('V').c], ['sms', 'SMS · Meera', M('M').c], ['mail', 'Email', C.ink]].forEach(([ic, lb, col]) => {
      cx += chip(cx, y + 134, lb, { icon: ic, col, tc: C.ink, size: 15, h: 32, fill: rgba(col, .1), stroke: rgba(col, .45) }) + 10;
    });
    chip(x + w - 28, y + 44, 'Counted once', { icon: 'check', col: C.green, al: 'right', size: 15, h: 32 });
    ctx.restore();
  }
  // counter
  const ca = eout(prog(t, 53.0, 53.6)) * out;
  if (ca > 0) {
    const cx = P.x + P.w / 2, y = 600;
    ctx.save(); ctx.globalAlpha *= ca;
    T('3 messages', cx - 46, y, { size: 44, w: 650, c: C.muted, al: 'right' });
    icon('link', cx, y - 14, 40, C.teal, 3);
    T('1 event', cx + 46, y, { size: 44, w: 650, c: C.teal });
    T('All three are kept as evidence', cx, y + 46, { size: 18, c: C.muted, al: 'center' });
    ctx.restore();
  }
}

function drawRecon(t) {
  const out = 1 - eio(prog(t, 74.8, 75.4));
  if (out <= 0 || t < 59) return;
  const x = P.x + 40, w = P.w - 80, cw = (w - 30) / 2, y = 262, h = 160;
  const cmp = 1 - eio(prog(t, 66.0, 66.6)); // comparison stage visible
  const truth = eout(prog(t, 62.6, 63.4));
  const strike = eout(prog(t, 63.2, 63.9));
  if (cmp > 0) {
    // SMS card
    const la = eout(prog(t, 59.6, 60.1)) * cmp * out;
    if (la > 0) {
      ctx.save(); ctx.globalAlpha *= la;
      rr(x, y, cw, h, 16, C.panel2, C.line, 1.5);
      icon('sms', x + 34, y + 38, 22, M('K').c, 2);
      T('Kamla’s phone · SMS', x + 56, y + 44, { size: 15, w: 600, c: C.muted });
      ctx.globalAlpha *= lerp(1, .5, strike);
      T('₹1,20,000', x + 24, y + 98, { size: 34, w: 650 });
      if (strike > 0) line(x + 22, y + 87, x + 22 + TW('₹1,20,000', 34, 650) * strike, y + 87, C.coral, 2.5);
      T('FD matured · SBI', x + 24, y + 132, { size: 16, c: C.muted });
      ctx.restore();
    }
    // statement card
    const ra = eout(prog(t, 60.0, 60.5)) * cmp * out;
    if (ra > 0) {
      const rx = x + cw + 30;
      ctx.save(); ctx.globalAlpha *= ra;
      rr(rx, y, cw, h, 16, C.panel2, truth > 0 ? rgba(C.teal, .25 + .65 * truth) : C.line, 1.5 + truth);
      icon('doc', rx + 34, y + 38, 22, C.ink, 2);
      T('Bank statement · PDF', rx + 56, y + 44, { size: 15, w: 600, c: C.muted });
      T('₹1,19,850', rx + 24, y + 98, { size: 34, w: 650 });
      T('FD maturity credit · SBI', rx + 24, y + 132, { size: 16, c: C.muted });
      if (truth > 0) chip(rx + cw - 18, y, 'Source of truth', { a: truth, al: 'right', size: 14, h: 30, fill: C.panel2 });
      ctx.restore();
    }
    // mismatch
    const mm = eout(prog(t, 60.8, 61.4)) * cmp * out;
    if (mm > 0) {
      chip(P.x + P.w / 2, y + h + 50, 'Close, but not identical · 82% likely the same', { col: C.amber, a: mm, al: 'center', size: 16 });
      T('The hub won’t guess.', P.x + P.w / 2, y + h + 104, { size: 19, w: 500, c: C.muted, al: 'center', a: eout(prog(t, 61.4, 62.0)) * cmp * out });
    }
    // buttons
    const ba = eout(prog(t, 64.2, 64.7)) * cmp * out;
    if (ba > 0) {
      const by = y + h + 150;
      const press = eout(prog(t, 65.6, 65.8)) * (1 - eout(prog(t, 65.9, 66.2)));
      ctx.save(); ctx.globalAlpha *= ba;
      rr(x, by, 220, 54, 14, press > 0 ? rgba(C.teal, .75) : C.teal);
      T('Confirm match', x + 110, by + 28, { size: 18, w: 650, c: '#062420', al: 'center', bl: 'middle' });
      rr(x + 236, by, 200, 54, 14, null, rgba(C.muted, .6), 1.5);
      T('Keep separate', x + 336, by + 28, { size: 18, w: 600, c: C.muted, al: 'center', bl: 'middle' });
      // reviewer + tap ripple
      const rp = prog(t, 65.6, 66.4);
      if (rp > 0 && rp < 1) circle(x + 150, by + 30, 10 + 50 * eout(rp), null, rgba(C.ink, .7 * (1 - rp)), 2.5);
      const va = eout(prog(t, 64.8, 65.3));
      ctx.globalAlpha *= va;
      circle(x + 488, by + 27, 18, rgba(M('V').c, .18), M('V').c, 2);
      T('V', x + 488, by + 28, { size: 16, w: 650, c: M('V').c, al: 'center', bl: 'middle' });
      T('Vikram is reviewing', x + 516, by + 33, { size: 16, c: C.muted });
      ctx.restore();
    }
  }
  // confirmed merged record
  const ok = eout(prog(t, 66.3, 67.0)) * out;
  if (ok > 0) {
    const hh = 176;
    ctx.save(); ctx.globalAlpha *= ok; ctx.translate(0, (1 - ok) * 16);
    rr(x, y, w, hh, 18, C.panel2, rgba(C.green, .7), 2);
    icon('check', x + 36, y + 39, 20, C.green, 2.6);
    T('CONFIRMED', x + 56, y + 45, { size: 14, w: 650, c: C.green, ls: 2 });
    T('FD maturity · SBI · ₹1,19,850', x + 28, y + 88, { size: 25, w: 650 });
    let cx = x + 28;
    cx += chip(cx, y + 134, 'Statement · source of truth', { icon: 'doc', tc: C.ink, size: 15, h: 32 }) + 10;
    chip(cx, y + 134, 'SMS · Kamla', { icon: 'sms', col: M('K').c, tc: C.ink, size: 15, h: 32 });
    T('Reviewed by Vikram', x + w - 28, y + 45, { size: 15, c: C.muted, al: 'right' });
    ctx.restore();
  }
  // new account spotted
  const na = eout(prog(t, 69.2, 69.8)) * out;
  if (na > 0) {
    const ny = 478, nh = 210;
    ctx.save(); ctx.globalAlpha *= na; ctx.translate(0, (1 - na) * 16);
    rr(x, ny, w, nh, 18, C.panel2, rgba(C.amber, .6), 1.8);
    T('NEW ACCOUNT SPOTTED', x + 28, ny + 44, { size: 14, w: 650, c: C.amber, ls: 2 });
    chip(x + w - 24, ny + 40, 'Waiting for you', { col: C.amber, al: 'right', size: 14, h: 30 });
    T('SBI Savings ••4821', x + 28, ny + 88, { size: 25, w: 650 });
    T('Seen in an SMS on Arjun’s phone', x + 28, ny + 116, { size: 16, c: C.muted });
    let bx = x + 28;
    [['Match to existing', true], ['Add as new', true], ['Ignore', false]].forEach(([lb, outline]) => {
      const bw = TW(lb, 17, 600) + 40;
      rr(bx, ny + 140, bw, 46, 12, null, outline ? rgba(C.ink, .45) : null, 1.5);
      T(lb, bx + bw / 2, ny + 164, { size: 17, w: 600, c: outline ? C.ink : C.muted, al: 'center', bl: 'middle' });
      bx += bw + 12;
    });
    ctx.restore();
  }
}

// ---------- dashboard ----------
const ASSETS = [
  ['Real estate', 135.0], ['Mutual funds', 84.2], ['Fixed deposits', 62.4], ['Equity', 46.8],
  ['EPF & PPF', 38.5], ['Gold & silver', 27.3], ['Savings', 18.6], ['Vehicles', 11.2],
];
const LIAB = ['Credit cards', 2.64];
const BY_MEMBER = [
  ['V', 'Vikram', 'Own accounts', 168.4], ['M', 'Meera', 'Own accounts', 112.6], ['VM', 'Joint', 'Vikram & Meera · 50/50', 47.96],
  ['K', 'Kamla', 'Own accounts', 74.1], ['A', 'Arjun', 'Own accounts', 18.3],
];
function inr(n) {
  n = Math.round(n);
  const s = String(n), last3 = s.slice(-3), rest = s.slice(0, -3);
  return '₹' + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + last3;
}
const lakh = v => v >= 100 ? `₹${(v / 100).toFixed(2)} Cr` : `₹${v.toFixed(1)} L`;

function drawDashboard(t) {
  const grow = eout(prog(t, 77.4, 78.6)) * (1 - eio(prog(t, 88.8, 89.9)));
  if (grow <= 0) return;
  const D = { x: 360, y: 140, w: 1200, h: 740 };
  const cx = D.x + D.w / 2, cy = D.y + D.h / 2;
  ctx.save();
  ctx.globalAlpha *= clamp(grow * 1.6);
  ctx.translate(lerp(HUB.x, cx, grow), lerp(HUB.y, cy, grow));
  ctx.scale(lerp(.15, 1, grow), lerp(.15, 1, grow));
  ctx.translate(-cx, -cy);
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 60;
  rr(D.x, D.y, D.w, D.h, 28, rgba(C.panel, .98), rgba(C.teal, .35), 1.5);
  ctx.shadowBlur = 0;
  const x0 = D.x, y0 = D.y;
  const ca = eout(prog(t, 78.4, 79.0));
  ctx.globalAlpha *= ca;

  T('FAMILY NET WORTH', x0 + 56, y0 + 70, { size: 15, w: 650, c: C.teal, ls: 2.5 });
  const val = 42136000 * eout(prog(t, 78.8, 81.4));
  T(inr(val), x0 + 52, y0 + 150, { size: 80, w: 650, ls: -1 });
  const da = eout(prog(t, 81.0, 81.6));
  if (da > 0) {
    const w1 = chip(x0 + 56, y0 + 196, '+₹18.4 L this financial year', { icon: 'up', col: C.green, a: da, size: 16, h: 34 });
    T('FY 2025–26 · as of 2 Oct 2026', x0 + 56 + w1 + 16, y0 + 202, { size: 16, c: C.muted, a: da });
  }
  // whole-family switcher
  const ma = eout(prog(t, 79.2, 79.8));
  ctx.save(); ctx.globalAlpha *= ma;
  T('Showing', x0 + D.w - 56, y0 + 70, { size: 15, c: C.muted, al: 'right' });
  chip(x0 + D.w - 56, y0 + 112, 'Whole family', { al: 'right', size: 16, h: 36 });
  MEMBERS.forEach((m, i) => {
    const ax = x0 + D.w - 210 - (3 - i) * 52, ay = y0 + 112;
    circle(ax, ay, 21, C.panel, m.c, 2);
    circle(ax, ay, 19, rgba(m.c, .16));
    T(m.id, ax, ay + 1, { size: 16, w: 650, c: m.c, al: 'center', bl: 'middle' });
  });
  ctx.restore();
  line(x0 + 56, y0 + 240, x0 + D.w - 56, y0 + 240, C.line, 1.5);

  // assets & liabilities
  T('Assets & liabilities', x0 + 56, y0 + 288, { size: 19, w: 650 });
  const fdTrace = win(t, 84.0, 88.6, .4);
  ASSETS.forEach(([lb, v], i) => {
    const ry = y0 + 330 + i * 40;
    const bp = eout(prog(t, 79.4 + i * .12, 80.4 + i * .12));
    const hl = lb === 'Fixed deposits' ? fdTrace : 0;
    if (hl > 0) rr(x0 + 44, ry - 26, 586, 38, 10, rgba(C.teal, .1 * hl), rgba(C.teal, .5 * hl), 1.5);
    T(lb, x0 + 56, ry, { size: 17, c: hl > 0 ? C.ink : C.muted });
    rr(x0 + 230, ry - 14, 250, 10, 5, rgba(C.muted, .1));
    if (bp > 0) rr(x0 + 230, ry - 14, Math.max(10, 250 * v / 135 * bp), 10, 5, rgba(C.teal, .85));
    T(lakh(v), x0 + 616, ry, { size: 17, w: 600, al: 'right', a: bp });
  });
  {
    const ry = y0 + 330 + ASSETS.length * 40 + 6, bp = eout(prog(t, 80.5, 81.3));
    line(x0 + 56, ry - 30, x0 + 616, ry - 30, C.line, 1);
    T(LIAB[0], x0 + 56, ry, { size: 17, c: C.muted });
    if (bp > 0) rr(x0 + 230, ry - 14, Math.max(10, 250 * LIAB[1] / 135 * bp), 10, 5, rgba(C.coral, .85));
    T('−₹2.6 L', x0 + 616, ry, { size: 17, w: 600, al: 'right', c: C.coral, a: bp });
  }

  // by member
  const bx = x0 + 690;
  T('By member', bx, y0 + 288, { size: 19, w: 650 });
  BY_MEMBER.forEach(([id, nm, sub, v], i) => {
    const ry = y0 + 344 + i * 66;
    const bp = eout(prog(t, 80.0 + i * .15, 81.0 + i * .15));
    if (id === 'VM') {
      circle(bx + 14, ry - 6, 16, C.panel, M('V').c, 2); circle(bx + 32, ry - 6, 16, C.panel, M('M').c, 2);
      T('V', bx + 14, ry - 5, { size: 13, w: 650, c: M('V').c, al: 'center', bl: 'middle' });
      T('M', bx + 32, ry - 5, { size: 13, w: 650, c: M('M').c, al: 'center', bl: 'middle' });
    } else {
      const m = M(id);
      circle(bx + 20, ry - 6, 18, rgba(m.c, .16), m.c, 2);
      T(id, bx + 20, ry - 5, { size: 15, w: 650, c: m.c, al: 'center', bl: 'middle' });
    }
    T(nm, bx + 60, ry - 8, { size: 18, w: 650 });
    T(sub, bx + 60, ry + 14, { size: 14, c: C.muted });
    rr(bx + 250, ry - 12, 120, 10, 5, rgba(C.muted, .1));
    if (bp > 0) rr(bx + 250, ry - 12, Math.max(10, 120 * v / 168.4 * bp), 10, 5, rgba(id === 'VM' ? M('M').c : M(id).c, .85));
    T(lakh(v), x0 + D.w - 56, ry - 2, { size: 17, w: 600, al: 'right', a: bp });
  });

  // footer chips
  let fx = x0 + 56;
  [['link', 'Every figure links to its source'], ['check', 'Demat holdings counted once'], ['lock', 'Stored only on the home Mac']].forEach(([ic, lb], i) => {
    const a = eout(prog(t, 82.4 + i * .25, 82.9 + i * .25));
    fx += chip(fx, y0 + D.h - 40, lb, { icon: ic, a, size: 15, h: 34, tc: C.ink }) + 12;
  });

  // traceability popover for Fixed deposits
  if (fdTrace > 0) {
    const ry = y0 + 330 + 2 * 40;
    const px = x0 + 300, py = ry + 22;
    ctx.save(); ctx.globalAlpha *= fdTrace;
    ctx.translate((1 - fdTrace) * -10, 0);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30;
    rr(px, py, 330, 150, 16, C.panel2, rgba(C.teal, .6), 1.5);
    ctx.shadowBlur = 0;
    T('Fixed deposits · ₹62.4 L', px + 22, py + 36, { size: 17, w: 650 });
    T('Backed by', px + 22, py + 62, { size: 14, c: C.muted });
    [['doc', '4 bank statements', C.ink], ['sms', '7 SMS alerts', M('K').c], ['mail', '3 emails', C.ink]].forEach(([ic, lb, col], i) => {
      icon(ic, px + 34, py + 86 + i * 22, 15, col, 1.8);
      T(lb, px + 52, py + 91 + i * 22, { size: 15, c: C.ink });
    });
    ctx.restore();
  }
  ctx.restore();
}

// ---------- chrome: header, captions, intro/outro ----------
const CHAPTERS = [
  [6, 13, 'The hub'], [13, 30, 'Members & devices'], [30, 44.5, 'Many ways in'],
  [44.5, 57.5, 'Duplicates'], [57.5, 75.5, 'Reconciling'], [75.5, 89.5, 'Family net worth'],
];
const CAPS = [
  [6.3, 9.6, 'Meet the family hub', 'One Mac at home holds every record. It’s the centre of everything.'],
  [9.6, 13.2, 'It only works on your home Wi-Fi', 'Phones connect to the hub when they’re home. Records are stored only at home.'],
  [13.2, 19.0, 'Add the family', 'Vikram is the family head. Everyone else is added in relation to him.'],
  [19.0, 24.8, 'Each phone pairs with the hub, once', 'A secure, encrypted link, made over home Wi-Fi.'],
  [24.8, 30.0, 'Away from home? The phone just waits', 'Arjun’s phone catches up the moment he’s back on home Wi-Fi.'],
  [30.0, 35.0, 'Bank SMS from every phone…', 'Read only with permission, and sent only to the hub.'],
  [35.0, 39.4, '…emails from Gmail…', 'The hub’s one trip outside the house: fetch email, then keep it at home.'],
  [39.4, 42.2, '…statements, spreadsheets, or typed in', 'Bank and CAS statements, Excel or Sheets exports, and manual entries.'],
  [42.2, 44.6, 'Phones never sync with each other', 'Everything goes through the hub, so there’s one version of the truth.'],
  [44.8, 51.2, 'One bank alert, seen three times…', 'Vikram’s SMS, Meera’s SMS and the email all describe the same payment.'],
  [51.2, 57.5, '…becomes one household event', 'All three are kept as evidence. The money is counted once.'],
  [57.5, 62.6, 'When records disagree…', 'An SMS and the bank statement differ by ₹150.'],
  [62.6, 68.6, '…the statement wins, and a person confirms', 'Statements and CAS are the source of truth. Unsure matches wait for review.'],
  [68.6, 75.4, 'Nothing new is added silently', 'Unknown accounts are offered to you: match, add, or ignore.'],
  [75.6, 83.8, 'One family net worth', 'Every member, account and asset, together in rupees for FY 2025–26.'],
  [83.8, 89.4, 'Every number traces back to its source', 'Open any figure to see the statements, SMS and emails behind it.'],
];

function drawHeader(t) {
  const a = win(t, 6.0, 96.5, .8);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  // brand mark: tiny hub and spokes
  const bx = 76, by = 64;
  for (let i = 0; i < 6; i++) {
    const ang = i * Math.PI / 3 - Math.PI / 2;
    line(bx, by, bx + Math.cos(ang) * 16, by + Math.sin(ang) * 16, rgba(C.teal, .8), 2);
    circle(bx + Math.cos(ang) * 17, by + Math.sin(ang) * 17, 3.2, C.teal);
  }
  circle(bx, by, 6.5, C.bg, C.teal, 2.2);
  T('Vikram Family Finance', bx + 34, by + 7, { size: 21, w: 650 });
  // chapter
  const idx = CHAPTERS.findIndex(([s, e]) => t >= s && t < e);
  const ra = win(t, 6.0, 89.6, .5);
  ctx.globalAlpha *= ra;
  if (idx >= 0) {
    const [s, e, name] = CHAPTERS[idx];
    const ta = win(t, s, e, .35);
    T(`0${idx + 1}`, W - 76 - TW(name, 19, 600) - 14, by + 7, { size: 19, w: 650, c: C.teal, al: 'right', a: ta });
    T(name, W - 76, by + 7, { size: 19, w: 600, al: 'right', a: ta });
  }
  CHAPTERS.forEach(([s, e], i) => {
    const x = W - 76 - (5 - i) * 46 - 38, y = by + 30;
    rr(x, y, 38, 4, 2, rgba(C.muted, .2));
    const p = prog(t, s, e);
    if (p > 0) rr(x, y, 38 * p, 4, 2, C.teal);
  });
  ctx.restore();
}

function drawCaptions(t) {
  for (const [a, b, h, s] of CAPS) {
    const v = win(t, a, b, .45);
    if (v <= 0) continue;
    const dy = (1 - eout(prog(t, a, a + .6))) * 14;
    T(h, W / 2, 990 + dy, { size: 36, w: 650, al: 'center', a: v });
    T(s, W / 2, 1036 + dy, { size: 22, c: C.muted, al: 'center', a: v * eout(prog(t, a + .15, a + .75)) });
  }
}

function drawIntro(t) {
  const a = win(t, 0, 6.0, .8);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const cx = W / 2, cy = 400;
  // animated hub-and-spoke glyph
  for (let i = 0; i < 6; i++) {
    const ang = i * Math.PI / 3 - Math.PI / 2, p = eout(prog(t, .3 + i * .12, 1.1 + i * .12));
    line(cx, cy, cx + Math.cos(ang) * 64 * p, cy + Math.sin(ang) * 64 * p, rgba(C.teal, .8), 3);
    if (p > .9) circle(cx + Math.cos(ang) * 68, cy + Math.sin(ang) * 68, 9, C.bg, C.teal, 2.5);
  }
  const hp = back(prog(t, .2, .8));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(hp, hp);
  circle(0, 0, 22, C.panel, C.teal, 3);
  ctx.restore();
  const tp = eout(prog(t, 1.0, 2.0));
  T('Vikram Family Finance', cx, 580 + (1 - tp) * 18, { size: 92, w: 500, f: SERIF, al: 'center', a: tp });
  const sp = eout(prog(t, 1.7, 2.6));
  T('How one home hub brings the whole family’s money into a single view', cx, 650 + (1 - sp) * 12, { size: 28, c: C.muted, al: 'center', a: sp });
  ctx.restore();
}

function drawOutro(t) {
  const a = eout(prog(t, 90.6, 91.6));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const labels = [['Hub & spoke', 'link'], ['Home Wi-Fi only', 'wifi'], ['Duplicates merged', 'check'], ['Statements reconcile', 'doc'], ['Many ways in', 'up']];
  const widths = labels.map(([l]) => TW(l, 16, 500) + 32 + 26);
  let x = W / 2 - (widths.reduce((s, w) => s + w, 0) + 12 * (labels.length - 1)) / 2;
  labels.forEach(([l, ic], i) => {
    const ca = eout(prog(t, 91.4 + i * .18, 91.9 + i * .18));
    chip(x, 925, l, { icon: ic, a: ca, size: 16, h: 36, tc: C.ink });
    x += widths[i] + 12;
  });
  const tp = eout(prog(t, 92.4, 93.3));
  T('Vikram Family Finance', W / 2, 1006 + (1 - tp) * 12, { size: 46, w: 500, f: SERIF, al: 'center', a: tp });
  T('One home. One hub. One family picture.', W / 2, 1046, { size: 22, c: C.muted, al: 'center', a: eout(prog(t, 92.9, 93.7)) });
  ctx.restore();
}

// ---------- frame ----------
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H * .45, 100, W / 2, H * .45, W * .7);
  g.addColorStop(0, '#111D30'); g.addColorStop(1, C.bg);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  drawIntro(t);

  const cam = camera(t);
  const dim = 1 - .72 * eio(prog(t, 76.8, 78.0)) + .72 * eio(prog(t, 89.2, 90.4));
  ctx.save();
  ctx.globalAlpha = dim;
  ctx.translate(cam.cx, cam.cy); ctx.scale(cam.s, cam.s); ctx.translate(-900, -500);
  drawNetwork(t);
  ctx.restore();

  drawPanel(t, cam);
  drawDashboard(t);
  drawHeader(t);
  drawCaptions(t);
  drawOutro(t);

  // fade from/to black at the very ends
  const fb = Math.max(1 - prog(t, 0, .5), prog(t, DUR - .8, DUR));
  if (fb > 0) { ctx.fillStyle = `rgba(5,9,16,${fb})`; ctx.fillRect(0, 0, W, H); }
}

window.render = render;
window.DUR = DUR;
window.ready = document.fonts.load(`600 20px InterV`).then(() => Promise.all([
  document.fonts.load(`400 20px InterV`, '₹'), document.fonts.load(`500 40px FrauncesV`),
])).then(() => true);

if (!/[?&]render/.test(location.search)) {
  const q = new URLSearchParams(location.search);
  if (q.has('t')) window.ready.then(() => render(+q.get('t')));
  else window.ready.then(() => {
    const start = performance.now();
    const loop = now => { render(((now - start) / 1000) % DUR); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
}
