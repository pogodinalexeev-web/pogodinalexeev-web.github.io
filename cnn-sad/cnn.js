// Маленькая настоящая свёрточная сеть: картинки, свёртки, сжатие, вектор, ответ, учёба.
// Всё считается честно, без подстановок. Модуль без three.js, его можно гонять и в node.

export const NPIX = 26;
export const CLASSES = ['кот', 'собака', 'домик', 'цветок'];

function rng(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(R) { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---------------------------------------------------------------------------
// картинки: свой растеризатор (фигуры, 4×4 подвыборки на пиксель)
// ---------------------------------------------------------------------------
const inC = (x, y, s) => (x - s.x) ** 2 + (y - s.y) ** 2 <= s.r * s.r;
function inE(x, y, s) { const c = Math.cos(s.rot || 0), n = Math.sin(s.rot || 0); const dx = x - s.x, dy = y - s.y; const u = dx * c + dy * n, v = -dx * n + dy * c; return (u / s.rx) ** 2 + (v / s.ry) ** 2 <= 1; }
function inT(x, y, s) { const [a, b, c] = s.p; const d = (p, q) => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]); const d1 = d(a, b), d2 = d(b, c), d3 = d(c, a); return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0))); }
const inR = (x, y, s) => x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1;
function inL(x, y, s) { const vx = s.x1 - s.x0, vy = s.y1 - s.y0, t = Math.max(0, Math.min(1, ((x - s.x0) * vx + (y - s.y0) * vy) / (vx * vx + vy * vy))); return Math.hypot(x - s.x0 - vx * t, y - s.y0 - vy * t) <= s.w / 2; }
const TEST = { c: inC, e: inE, t: inT, r: inR, l: inL };

const ORANGE = [0.93, 0.55, 0.18], DORANGE = [0.72, 0.33, 0.08], CREAM = [0.98, 0.92, 0.80], PINK = [0.93, 0.50, 0.58], INK = [0.12, 0.08, 0.06];
const SHAPES = {
  'кот': [
    { t: 't', p: [[0.25, 0.42], [0.29, 0.12], [0.47, 0.32]], c: ORANGE }, { t: 't', p: [[0.75, 0.42], [0.71, 0.12], [0.53, 0.32]], c: ORANGE },
    { t: 't', p: [[0.30, 0.34], [0.31, 0.20], [0.40, 0.31]], c: PINK }, { t: 't', p: [[0.70, 0.34], [0.69, 0.20], [0.60, 0.31]], c: PINK },
    { t: 'e', x: 0.5, y: 0.54, rx: 0.27, ry: 0.24, c: ORANGE },
    { t: 'l', x0: 0.5, y0: 0.32, x1: 0.5, y1: 0.42, w: 0.045, c: DORANGE }, { t: 'l', x0: 0.42, y0: 0.34, x1: 0.44, y1: 0.42, w: 0.04, c: DORANGE }, { t: 'l', x0: 0.58, y0: 0.34, x1: 0.56, y1: 0.42, w: 0.04, c: DORANGE },
    { t: 'e', x: 0.5, y: 0.66, rx: 0.12, ry: 0.08, c: CREAM },
    { t: 'e', x: 0.39, y: 0.51, rx: 0.055, ry: 0.065, c: [0.42, 0.66, 0.24] }, { t: 'e', x: 0.61, y: 0.51, rx: 0.055, ry: 0.065, c: [0.42, 0.66, 0.24] },
    { t: 'e', x: 0.39, y: 0.51, rx: 0.02, ry: 0.055, c: INK }, { t: 'e', x: 0.61, y: 0.51, rx: 0.02, ry: 0.055, c: INK },
    { t: 't', p: [[0.45, 0.60], [0.55, 0.60], [0.50, 0.655]], c: PINK },
  ],
  'собака': [
    { t: 'e', x: 0.5, y: 0.5, rx: 0.23, ry: 0.27, c: [0.62, 0.42, 0.25] },
    { t: 'e', x: 0.26, y: 0.52, rx: 0.075, ry: 0.2, rot: 0.25, c: [0.33, 0.20, 0.11] }, { t: 'e', x: 0.74, y: 0.52, rx: 0.075, ry: 0.2, rot: -0.25, c: [0.33, 0.20, 0.11] },
    { t: 'e', x: 0.5, y: 0.65, rx: 0.14, ry: 0.11, c: CREAM },
    { t: 'e', x: 0.5, y: 0.75, rx: 0.045, ry: 0.05, c: [0.90, 0.38, 0.45] },
    { t: 'e', x: 0.5, y: 0.6, rx: 0.065, ry: 0.045, c: INK },
    { t: 'c', x: 0.41, y: 0.45, r: 0.04, c: INK }, { t: 'c', x: 0.59, y: 0.45, r: 0.04, c: INK },
    { t: 'e', x: 0.62, y: 0.38, rx: 0.07, ry: 0.06, c: [0.42, 0.26, 0.14] },
  ],
  'домик': [
    { t: 'r', x0: 0.63, y0: 0.18, x1: 0.71, y1: 0.38, c: [0.50, 0.17, 0.12] },
    { t: 'r', x0: 0.24, y0: 0.46, x1: 0.76, y1: 0.86, c: [0.94, 0.86, 0.66] },
    { t: 't', p: [[0.16, 0.48], [0.84, 0.48], [0.5, 0.16]], c: [0.78, 0.22, 0.16] },
    { t: 'r', x0: 0.44, y0: 0.62, x1: 0.57, y1: 0.86, c: [0.45, 0.27, 0.14] },
    { t: 'r', x0: 0.29, y0: 0.54, x1: 0.39, y1: 0.65, c: [0.30, 0.52, 0.86] }, { t: 'r', x0: 0.62, y0: 0.54, x1: 0.72, y1: 0.65, c: [0.30, 0.52, 0.86] },
  ],
  'цветок': [
    { t: 'l', x0: 0.5, y0: 0.45, x1: 0.5, y1: 0.95, w: 0.05, c: [0.25, 0.55, 0.2] },
    { t: 'e', x: 0.61, y: 0.76, rx: 0.1, ry: 0.04, rot: -0.5, c: [0.25, 0.55, 0.2] },
    ...[0, 1, 2, 3, 4, 5].map((k) => ({ t: 'c', x: 0.5 + Math.cos(k / 6 * Math.PI * 2) * 0.15, y: 0.4 + Math.sin(k / 6 * Math.PI * 2) * 0.15, r: 0.11, c: [0.93, 0.42, 0.62] })),
    { t: 'c', x: 0.5, y: 0.4, r: 0.095, c: [0.98, 0.80, 0.18] },
  ],
};
function background(x, y) {
  if (y > 0.86) return [0.52, 0.70, 0.38];
  return [0.66 + 0.12 * y, 0.80 + 0.06 * y, 0.92 - 0.06 * y];
}
// variant 0 = канонический рисунок; остальные чуть сдвинуты, растянуты, подкрашены (для учёбы)
export function picture(name, variant = 0) {
  const R = rng(1000 + variant * 31 + name.length * 7);
  const dx = variant ? (R() - 0.5) * 0.14 : 0, dy = variant ? (R() - 0.5) * 0.12 : 0;
  const sc = variant ? 0.88 + R() * 0.2 : 1, tint = variant ? 0.88 + R() * 0.2 : 1;
  const N = NPIX, out = new Float32Array(3 * N * N), shapes = SHAPES[name], SS = 4;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    let r = 0, g = 0, b = 0;
    for (let a = 0; a < SS; a++) for (let c = 0; c < SS; c++) {
      const X = (j + (c + 0.5) / SS) / N, Y = (i + (a + 0.5) / SS) / N;
      const x = (X - 0.5 - dx) / sc + 0.5, y = (Y - 0.5 - dy) / sc + 0.5;
      let col = background(X, Y), hit = false;
      for (const s of shapes) if (TEST[s.t](x, y, s)) { col = s.c; hit = true; }
      const k = hit ? tint : 1;
      r += col[0] * k; g += col[1] * k; b += col[2] * k;
    }
    const n = SS * SS, p = i * N + j;
    out[p] = Math.min(1, r / n); out[N * N + p] = Math.min(1, g / n); out[2 * N * N + p] = Math.min(1, b / n);
  }
  return out;
}
export const brightness = (img, N = NPIX) => { const o = new Float32Array(N * N); for (let p = 0; p < N * N; p++) o[p] = 0.3 * img[p] + 0.59 * img[N * N + p] + 0.11 * img[2 * N * N + p]; return o; };

// ---------------------------------------------------------------------------
// слои
// ---------------------------------------------------------------------------
// свёртка 3×3 без полей: [C,H,W] → [K,H-2,W-2]
export function conv(x, C, H, W, w, b, K) {
  const Ho = H - 2, Wo = W - 2, y = new Float32Array(K * Ho * Wo);
  for (let k = 0; k < K; k++) for (let i = 0; i < Ho; i++) for (let j = 0; j < Wo; j++) {
    let s = b[k];
    for (let c = 0; c < C; c++) { const wb = (k * C + c) * 9, xb = c * H * W; for (let di = 0; di < 3; di++) { const xr = xb + (i + di) * W + j, wr = wb + di * 3; s += w[wr] * x[xr] + w[wr + 1] * x[xr + 1] + w[wr + 2] * x[xr + 2]; } }
    y[(k * Ho + i) * Wo + j] = s;
  }
  return y;
}
export const relu = (x) => x.map((v) => (v > 0 ? v : 0));
export function pool(x, C, H, W) {
  const Ho = H >> 1, Wo = W >> 1, y = new Float32Array(C * Ho * Wo), arg = new Int32Array(C * Ho * Wo);
  for (let c = 0; c < C; c++) for (let i = 0; i < Ho; i++) for (let j = 0; j < Wo; j++) {
    let best = -Infinity, bi = 0;
    for (let a = 0; a < 2; a++) for (let d = 0; d < 2; d++) { const q = (c * H + 2 * i + a) * W + 2 * j + d; if (x[q] > best) { best = x[q]; bi = q; } }
    const o = (c * Ho + i) * Wo + j; y[o] = best; arg[o] = bi;
  }
  return { y, arg };
}
export function softmax(z) { const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return { p: e.map((v) => v / s), e, m }; }

// ---------------------------------------------------------------------------
// сеть: 26×26×3 → 24×24×4 → 12×12×4 → 10×10×8 → 5×5×8 → 3×3×16 → 144 → 4
// ---------------------------------------------------------------------------
export const SHAPE = [[3, 26], [4, 24], [4, 12], [8, 10], [8, 5], [16, 3]];
const LUM = [0.3, 0.59, 0.11];
export const KERNEL_NAMES = ['вертикальные края', 'горизонтальные края', 'рыжее', 'тёмные точки'];
function designedConv1() {
  const w = new Float32Array(4 * 3 * 9), b = new Float32Array([0, 0, -0.12, -0.02]);
  const SX = [-1, 0, 1, -2, 0, 2, -1, 0, 1], SY = [-1, -2, -1, 0, 0, 0, 1, 2, 1], BL = [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16), DOT = [1, 1, 1, 1, -8, 1, 1, 1, 1].map((v) => v / 2);
  const RED = [1, 0, -1.2];
  for (let c = 0; c < 3; c++) for (let q = 0; q < 9; q++) {
    w[(0 * 3 + c) * 9 + q] = SX[q] * LUM[c];
    w[(1 * 3 + c) * 9 + q] = SY[q] * LUM[c];
    w[(2 * 3 + c) * 9 + q] = BL[q] * RED[c];
    w[(3 * 3 + c) * 9 + q] = DOT[q] * LUM[c];
  }
  return { w, b };
}
function randConv(K, C, seed) { const R = rng(seed), w = new Float32Array(K * C * 9), sd = Math.sqrt(2 / (C * 9)); for (let i = 0; i < w.length; i++) w[i] = gauss(R) * sd; return { w, b: new Float32Array(K).fill(0.02) }; }
export function makeNet(seed = 7) {
  const c1 = designedConv1(), c2 = randConv(8, 4, seed + 1), c3 = randConv(16, 8, seed + 2);
  const R = rng(seed + 3), fw = new Float32Array(4 * 144); for (let i = 0; i < fw.length; i++) fw[i] = gauss(R) * 0.05;
  return { w1: c1.w, b1: c1.b, w2: c2.w, b2: c2.b, w3: c3.w, b3: c3.b, fw, fb: new Float32Array(4) };
}
export function cloneNet(n) { const o = {}; for (const k in n) o[k] = n[k].slice(); return o; }

export function forward(net, x) {
  const z1 = conv(x, 3, 26, 26, net.w1, net.b1, 4), a1 = relu(z1), P1 = pool(a1, 4, 24, 24);
  const z2 = conv(P1.y, 4, 12, 12, net.w2, net.b2, 8), a2 = relu(z2), P2 = pool(a2, 8, 10, 10);
  const z3 = conv(P2.y, 8, 5, 5, net.w3, net.b3, 16), v = relu(z3);
  const logits = new Float32Array(4);
  for (let k = 0; k < 4; k++) { let s = net.fb[k]; for (let j = 0; j < 144; j++) s += net.fw[k * 144 + j] * v[j]; logits[k] = s; }
  const sm = softmax(Array.from(logits));
  return { x, z1, a1, p1: P1.y, arg1: P1.arg, z2, a2, p2: P2.y, arg2: P2.arg, z3, v, logits, probs: sm.p, exps: sm.e };
}

// обратный ход для свёртки: dy[K,Ho,Wo] → dw, db, dx
function convBack(x, C, H, W, w, K, dy, dw, db, needDx) {
  const Ho = H - 2, Wo = W - 2, dx = needDx ? new Float32Array(C * H * W) : null;
  for (let k = 0; k < K; k++) for (let i = 0; i < Ho; i++) for (let j = 0; j < Wo; j++) {
    const g = dy[(k * Ho + i) * Wo + j]; if (g === 0) continue;
    db[k] += g;
    for (let c = 0; c < C; c++) for (let di = 0; di < 3; di++) for (let dj = 0; dj < 3; dj++) {
      const wi = ((k * C + c) * 3 + di) * 3 + dj, xi = (c * H + i + di) * W + j + dj;
      dw[wi] += g * x[xi]; if (dx) dx[xi] += g * w[wi];
    }
  }
  return dx;
}
// один шаг учёбы на пачке примеров; возвращает среднюю ошибку
export function trainStep(net, batch, lr = 0.05, lrConv = 0.004, onlyFC = false) {
  const G = {}; for (const k in net) G[k] = new Float32Array(net[k].length);
  let loss = 0;
  for (const { x, y, f } of batch) {
    const F = f || forward(net, x);
    loss += -Math.log(Math.max(1e-9, F.probs[y]));
    const dl = F.probs.map((p, k) => p - (k === y ? 1 : 0));
    const dv = new Float32Array(144);
    for (let k = 0; k < 4; k++) { G.fb[k] += dl[k]; for (let j = 0; j < 144; j++) { G.fw[k * 144 + j] += dl[k] * F.v[j]; dv[j] += dl[k] * net.fw[k * 144 + j]; } }
    if (onlyFC) continue;
    const dz3 = dv.map((g, i) => (F.z3[i] > 0 ? g : 0));
    const dp2 = convBack(F.p2, 8, 5, 5, net.w3, 16, dz3, G.w3, G.b3, true);
    const da2 = new Float32Array(8 * 100); for (let i = 0; i < dp2.length; i++) da2[F.arg2[i]] += dp2[i];
    const dz2 = da2.map((g, i) => (F.z2[i] > 0 ? g : 0));
    const dp1 = convBack(F.p1, 4, 12, 12, net.w2, 8, dz2, G.w2, G.b2, true);
    const da1 = new Float32Array(4 * 576); for (let i = 0; i < dp1.length; i++) da1[F.arg1[i]] += dp1[i];
    const dz1 = da1.map((g, i) => (F.z1[i] > 0 ? g : 0));
    convBack(F.x, 3, 26, 26, net.w1, 4, dz1, G.w1, G.b1, false);
  }
  const n = batch.length;
  for (const k in net) {
    const isFC = k === 'fw' || k === 'fb', r = (isFC ? lr : lrConv) / n;
    if (onlyFC && !isFC) continue;
    const a = net[k], g = G[k]; for (let i = 0; i < a.length; i++) a[i] -= r * g[i];
  }
  return { loss: loss / n, grads: G };
}

// набор для учёбы: по 5 вариантов каждого рисунка
export function dataset(nv = 5) { const out = []; CLASSES.forEach((c, y) => { for (let v = 0; v < nv; v++) out.push({ x: picture(c, v), y, name: c, v }); }); return out; }

// готовая сеть: свёртки как есть, последний слой обучен на примерах (только он, это быстро)
export function pretrained() {
  const net = makeNet(7), data = dataset(6);
  const feats = data.map((d) => ({ x: d.x, y: d.y, f: forward(net, d.x) }));
  for (let e = 0; e < 400; e++) {
    for (const d of feats) { // пересчёт вероятностей при фиксированных свёртках
      const lg = new Float32Array(4); for (let k = 0; k < 4; k++) { let s = net.fb[k]; for (let j = 0; j < 144; j++) s += net.fw[k * 144 + j] * d.f.v[j]; lg[k] = s; }
      d.f.probs = softmax(Array.from(lg)).p;
    }
    trainStep(net, feats, 0.15, 0, true);
  }
  return net;
}
