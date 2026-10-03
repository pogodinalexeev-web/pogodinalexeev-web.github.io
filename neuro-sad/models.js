// 13 живых моделей курса. Каждая рисует себя на холсте 1000×1000 (доска на стенде),
// считает по-настоящему и отдаёт кнопки для карточки. Никакого three.js здесь нет.
export const BW = 1000, BH = 1000;

export function makeModels(K) {
  const { PAL, SERIF, SANS, inkStroke, quickStroke, inkRect, inkCircle, rgba, fmt, mulberry, clamp, lerp, AUDIO, mkCanvas, audioCtx } = K;
  const TAU = Math.PI * 2;
  const f1 = (v) => fmt(v, 1), f2 = (v) => fmt(v, 2);
  const pct = (v) => Math.round(v * 100) + '%';

  function txt(g, s, x, y, size = 44, o = {}) {
    g.font = `${o.w || 600} ${o.i ? 'italic ' : ''}${size}px ${o.serif ? SERIF : SANS}`;
    g.fillStyle = o.c || PAL.ink; g.textAlign = o.a || 'left'; g.textBaseline = o.b || 'alphabetic';
    if (o.maxW) { let f = size; while (f > 30 && g.measureText(s).width > o.maxW) { f -= 2; g.font = `${o.w || 600} ${o.i ? 'italic ' : ''}${f}px ${o.serif ? SERIF : SANS}`; } }
    g.fillText(s, x, y);
  }
  function pill(g, s, x, y, size = 44, o = {}) {
    g.font = `${o.w || 700} ${size}px ${o.serif ? SERIF : SANS}`;
    const w = g.measureText(s).width + size * 0.9, h = size * 1.45;
    const x0 = o.a === 'center' ? x - w / 2 : o.a === 'right' ? x - w : x;
    g.fillStyle = o.bg || PAL.paper; g.globalAlpha = o.alpha ?? 0.94; rr(g, x0, y - h * 0.72, w, h, 14); g.fill(); g.globalAlpha = 1;
    g.lineWidth = 3; g.strokeStyle = o.border || PAL.ink; rr(g, x0, y - h * 0.72, w, h, 14); g.stroke();
    g.fillStyle = o.c || PAL.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x0 + size * 0.45, y + size * 0.05);
    return { x0, w, h };
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function arrow(g, x0, y0, x1, y1, w, c, head = 22) {
    quickStroke(g, [[x0, y0], [x1, y1]], w, c);
    const a = Math.atan2(y1 - y0, x1 - x0);
    g.fillStyle = c; g.beginPath(); g.moveTo(x1 + Math.cos(a) * head * 0.4, y1 + Math.sin(a) * head * 0.4);
    g.lineTo(x1 - Math.cos(a - 0.45) * head, y1 - Math.sin(a - 0.45) * head); g.lineTo(x1 - Math.cos(a + 0.45) * head, y1 - Math.sin(a + 0.45) * head); g.closePath(); g.fill();
  }
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c) => `rgb(${c[0] * 255 | 0},${c[1] * 255 | 0},${c[2] * 255 | 0})`;
  const C_PAPER = [0.94, 0.89, 0.79], C_WARM = [0.88, 0.47, 0.18], C_HOT = [0.62, 0.20, 0.10], C_COLD = [0.30, 0.56, 0.78], C_DEEP = [0.16, 0.30, 0.52];
  function valRGB(t) {
    const a = Math.min(1, Math.abs(t));
    if (t >= 0) return a < 0.65 ? mixc(C_PAPER, C_WARM, a / 0.65) : mixc(C_WARM, C_HOT, (a - 0.65) / 0.35);
    return a < 0.65 ? mixc(C_PAPER, C_COLD, a / 0.65) : mixc(C_COLD, C_DEEP, (a - 0.65) / 0.35);
  }
  function gauss(R) { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  const softmax = (a) => { const m = Math.max(...a), e = a.map((x) => Math.exp(x - m)), s = e.reduce((p, q) => p + q, 0); return e.map((x) => x / s); };


  // =========================================================================
  // Герой всей тропы: пиксельная ромашка 8×8 со стенда 1 и её 64 числа.
  // Та же картинка идёт по всем стендам; рядом с ней стопка из 28 картинок.
  // =========================================================================
  // . фон (тёмная трава), W белый лепесток, Y жёлтая серединка, G зелёный стебель, B синий лепесток, D тёмно-синяя серединка
  const PIX8 = {
    'ромашка': ['.W.WW.W.', '..WWWW..', 'WWWYYWWW', 'WWWYYWWW', '..WWWW..', '.W.WW.W.', '...GG...', '..GGG...'],
    'василёк': ['.B.B.B..', 'B.BBB.B.', '.BBDDBB.', 'BBDDDDBB', '.BBDDBB.', 'B.BBB.B.', '...G....', '..GGG...'],
    'колокольчик': ['..GGG...', '..G.....', '..BBB...', '.BBBBB..', '.BBBBB..', 'BBBBBBB.', 'B.B.B.B.', '........'],
  };
  const GRAY8 = { '.': 40, W: 232, Y: 160, G: 100, B: 118, D: 66 };
  const CHN = { '.': 'фон', W: 'лепесток', Y: 'серединка', G: 'стебель', B: 'лепесток', D: 'серединка' };
  const pix8 = (name) => { const rows = PIX8[name], out = []; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) out.push(Math.min(255, GRAY8[rows[i][j]] + ((i * 7 + j * 3) % 5) * 4)); return out; };
  // две клетки, которые станут точкой на поле: серединка (ряд 3, место 4) и лепесток (ряд 4, место 1)
  const CC = 19, CP = 24, C_MID = '#C8601A', C_PET = '#2F6EB5', F_DAISY = '#D9A21E', F_CORN = '#2F5FB0';
  const cellRC = (p) => `${(p >> 3) + 1}·${(p & 7) + 1}`;
  const big = (n) => String(Math.round(n)).replace('-', '−').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  // любые 64 числа рисуем как серую картинку 8×8; o.nums = размер шрифта для чисел в клетках
  function drawVals(g, v, x0, y0, c, o = {}) {
    for (let p = 0; p < 64; p++) {
      const i = p >> 3, j = p & 7, b = clamp(Math.round(v[p]), 0, 255);
      g.fillStyle = o.alpha ? `rgba(${b},${b},${b},${o.alpha})` : `rgb(${b},${b},${b})`; g.fillRect(x0 + j * c, y0 + i * c, c + 0.5, c + 0.5);
      if (o.grid) { g.strokeStyle = 'rgba(120,110,100,0.55)'; g.lineWidth = 1.2; g.strokeRect(x0 + j * c, y0 + i * c, c, c); }
      if (o.nums) txt(g, String(b), x0 + j * c + c / 2, y0 + i * c + c / 2 + 1, o.nums, { a: 'center', b: 'middle', w: 700, c: b < 125 ? '#F4EBDD' : '#1E120B' });
    }
    if (o.frame !== false) { g.lineWidth = o.fw || Math.max(2, c / 4); g.strokeStyle = o.frame || PAL.ink; g.strokeRect(x0, y0, c * 8, c * 8); }
    (o.mark || []).forEach(([p, cl]) => { const i = p >> 3, j = p & 7, lw = Math.max(3, c / 7); g.lineWidth = lw; g.strokeStyle = cl; g.strokeRect(x0 + j * c + lw / 2, y0 + i * c + lw / 2, c - lw, c - lw); });
  }
  const thumb = (g, v, cx, cy, size, y, fw) => drawVals(g, v, cx - size / 2, cy - size / 2, size / 8, { frame: y > 0 ? F_DAISY : F_CORN, fw: fw || Math.max(3, size / 10) });
  // стопка: 14 ромашек и 14 васильков 8×8, у каждой свои 64 числа. Первые в каждой половине это ромашка и василёк стенда 1.
  const STACK = [];
  {
    const R = mulberry(23);
    for (const [name, y] of [['ромашка', 1], ['василёк', -1]]) {
      STACK.push({ v: pix8(name), y, name });
      for (let k = 1; k < 14; k++) {
        const rows = PIX8[name], mir = R() < 0.5, v = [];
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) v.push(clamp(Math.round(GRAY8[rows[i][mir ? 7 - j : j]] + (R() * 2 - 1) * 20), 0, 255));
        STACK.push({ v, y, name });
      }
    }
  }
  const P2 = STACK.map((s) => [s.v[CC], s.v[CP], s.y]); // [яркость серединки, яркость лепестка, 1 ромашка / −1 василёк]
  // нейрон стенда 2 на всех 64 числах: вес 1 у 32 клеток цветка ромашки, вес 0 у фона и стебля
  const W64 = PIX8['ромашка'].join('').split('').map((ch) => (ch === 'W' || ch === 'Y' ? 1 : 0)), TH64 = 5000;
  const sum64 = (v) => v.reduce((s, x, i) => s + x * W64[i], 0);
  // поле «яркость серединки → / яркость лепестка ↑», 0..VMAX
  const VMAX = 280;
  function fenceSeg(w1, w2, th) {
    const M = VMAX, P = [], eq = (x, y) => [x, y];
    if (Math.abs(w2) > 1e-9) for (const x of [0, M]) { const y = (th - w1 * x) / w2; if (y >= 0 && y <= M) P.push(eq(x, y)); }
    if (Math.abs(w1) > 1e-9) for (const y of [0, M]) { const x = (th - w2 * y) / w1; if (x >= 0 && x <= M) P.push(eq(x, y)); }
    if (P.length < 2) return null;
    P.sort((a, b) => a[0] - b[0] || a[1] - b[1]); return [P[0], P[P.length - 1]];
  }
  function field(g, F, o = {}) {
    const { X0, Y0, X1, Y1 } = F, sx = (v) => X0 + (X1 - X0) * v / VMAX, sy = (v) => Y1 - (Y1 - Y0) * v / VMAX, fs = o.fs || 40;
    const fence = o.th !== undefined;
    if (fence) {
      const n = 28;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const a = (j + 0.5) / n * VMAX, b = VMAX - (i + 0.5) / n * VMAX, s = o.w1 * a + o.w2 * b - o.th;
        g.fillStyle = s > 0 ? 'rgba(241,191,74,0.30)' : 'rgba(62,143,196,0.20)';
        g.fillRect(X0 + (X1 - X0) * j / n, Y0 + (Y1 - Y0) * i / n, (X1 - X0) / n + 1, (Y1 - Y0) / n + 1);
      }
    } else { g.fillStyle = 'rgba(226,209,176,0.45)'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0); }
    for (const v of [100, 200]) { quickStroke(g, [[sx(v), Y0], [sx(v), Y1]], 1.5, rgba(PAL.inkFaint, 0.45), 1, [6, 8]); quickStroke(g, [[X0, sy(v)], [X1, sy(v)]], 1.5, rgba(PAL.inkFaint, 0.45), 1, [6, 8]); }
    inkRect(g, X0, Y0, X1 - X0, Y1 - Y0, 4, PAL.ink, 2);
    if (o.lab !== false) {
      for (const v of [0, 100, 200]) { txt(g, String(v), sx(v), Y1 + fs * 0.85, fs * 0.7, { a: 'center', c: PAL.inkSoft }); if (v) txt(g, String(v), X0 - 8, sy(v) + fs * 0.25, fs * 0.7, { a: 'right', c: PAL.inkSoft }); }
      txt(g, 'яркость серединки →', X1, Y1 + fs * 1.75, fs, { a: 'right', c: C_MID, w: 700 });
      g.save(); g.translate(X0 - fs * 1.35, (Y0 + Y1) / 2); g.rotate(-Math.PI / 2); txt(g, 'яркость лепестка →', 0, 0, fs, { a: 'center', c: C_PET, w: 700 }); g.restore();
    }
    if (fence) {
      const seg = fenceSeg(o.w1, o.w2, o.th);
      if (seg) { const [a, b] = seg; inkStroke(g, [[sx(a[0]), sy(a[1])], [sx(b[0]), sy(b[1])]], o.fenceW || 9, PAL.wood, { seed: 3 }); inkStroke(g, [[sx(a[0]), sy(a[1])], [sx(b[0]), sy(b[1])]], 3, PAL.ink, { seed: 5, double: false }); }
    }
    const pts = o.pts || STACK, n = o.n ?? pts.length, size = o.size || 40;
    let bad = 0;
    for (let k = 0; k < n; k++) {
      const s = pts[k], x = sx(s.v[CC]), y = sy(s.v[CP]);
      thumb(g, s.v, x, y, size, s.y);
      if (fence && Math.sign(o.w1 * s.v[CC] + o.w2 * s.v[CP] - o.th || -1) !== s.y) { bad++; g.lineWidth = Math.max(3, size / 9); g.strokeStyle = PAL.red; g.beginPath(); g.arc(x, y, size * 0.85, 0, TAU); g.stroke(); }
      if (k === o.sel) { g.lineWidth = 6; g.strokeStyle = PAL.orange; g.beginPath(); g.arc(x, y, size * 1.1, 0, TAU); g.stroke(); }
    }
    return { sx, sy, bad };
  }
  // сноска: картинка 8×8 крупно и стрелка от неё к её точке
  function callout(g, v, y, bx, by, c, tx, ty, lines = [], W = 250) {
    const pw = c * 8, w = Math.max(pw, W), h = pw + lines.length * 44 + 18;
    g.fillStyle = 'rgba(239,227,201,0.95)'; rr(g, bx - 12, by - 12, w + 24, h + 12, 14); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; rr(g, bx - 12, by - 12, w + 24, h + 12, 14); g.stroke();
    drawVals(g, v, bx + (w - pw) / 2, by, c, { frame: y > 0 ? F_DAISY : F_CORN, fw: 5, mark: [[CC, C_MID], [CP, C_PET]] });
    lines.forEach(([s, cl], k) => txt(g, s, bx + w / 2, by + pw + 40 + k * 44, 34, { a: 'center', w: 700, c: cl || PAL.ink, maxW: w }));
    const ax = tx < bx ? bx - 12 : tx > bx + w ? bx + w + 12 : bx + w / 2, ay = ty < by ? by - 12 : ty > by + h ? by + h : by + h / 2;
    arrow(g, ax, ay, tx + Math.sign(ax - tx) * 26, ty + Math.sign(ay - ty) * 26, 5, PAL.orange, 24);
  }

  // HTML helpers for the card
  const sl = (label, k, min, max, step, v) => `<label>${label}<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><b data-v="${k}"></b></label>`;
  const bt = (label, k, on = false) => `<button class="btn${on ? ' on' : ''}" data-b="${k}">${label}</button>`;
  function wire(box, m, show) {
    box.querySelectorAll('input[data-k]').forEach((inp) => {
      const k = inp.dataset.k;
      inp.addEventListener('input', () => { m.set(k, parseFloat(inp.value)); m.sync(); });
    });
    box.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => { m.press(b.dataset.b, b); m.sync(); }));
    m.box = box; m.info = box.querySelector('.info');
    m.sync = () => {
      box.querySelectorAll('input[data-k]').forEach((inp) => { const v = m.get(inp.dataset.k); if (document.activeElement !== inp) inp.value = v; const o = box.querySelector(`[data-v="${inp.dataset.k}"]`); if (o) o.textContent = show(inp.dataset.k, v); });
      if (m.syncExtra) m.syncExtra(box);
      if (m.info) m.info.innerHTML = m.infoText();
      m.dirty = true;
    };
    m.sync();
  }

  const models = [];

  // =========================================================================
  // 1. Всё есть числа
  // =========================================================================
  {
    const PICS = PIX8;
    const MODES = ['как фото', 'как таблица чисел', 'как звуковая волна', 'стопка картинок'];
    const SX0 = 40, SY = [175, 315, 505, 645], SC = 15, SW = 132;
    const m = {
      pic: 'ромашка', mode: 0, br: 0, sel: -1, ssel: 0, dirty: true, playT: -1,
      vals() { return pix8(this.pic).map((v) => clamp(Math.round(v + this.br), 0, 255)); },
      draw(g) {
        if (this.mode === 3) {
          txt(g, 'стопка: 28 картинок 8×8', 500, 80, 54, { a: 'center', serif: true, w: 700 });
          txt(g, '14 ромашек', SX0 + 6 * SW + SC * 8, SY[0] - 18, 38, { a: 'right', w: 700, c: '#9A6A0A' });
          txt(g, '14 васильков', SX0 + 6 * SW + SC * 8, SY[2] - 18, 38, { a: 'right', w: 700, c: F_CORN });
          STACK.forEach((s, k) => {
            const r = Math.floor(k / 7), c = k % 7, x = SX0 + c * SW, y = SY[r];
            drawVals(g, s.v.map((u) => clamp(u + this.br, 0, 255)), x, y, SC, { frame: s.y > 0 ? F_DAISY : F_CORN, fw: 5 });
            if (k === this.ssel) { g.lineWidth = 7; g.strokeStyle = PAL.orange; g.strokeRect(x - 8, y - 8, SC * 8 + 16, SC * 8 + 16); }
          });
          const s = STACK[this.ssel];
          txt(g, this.ssel === 0 ? 'обведена наша ромашка' : this.ssel === 14 ? 'обведён наш василёк' : `обведена картинка ${this.ssel + 1}`, 500, 850, 42, { a: 'center', w: 700 });
          txt(g, `у каждой свои 64 числа: ${s.v.slice(0, 4).join(', ')}, …`, 500, 910, 38, { a: 'center', c: PAL.inkSoft, maxW: 940 });
          txt(g, 'дальше учим машину находить ромашки', 500, 965, 38, { a: 'center', c: PAL.inkSoft, maxW: 940 });
          return;
        }
        const v = this.vals();
        txt(g, `${this.pic} ${MODES[this.mode]}`, 500, 92, 56, { a: 'center', serif: true, w: 700, maxW: 900 });
        const x0 = 140, y0 = 130, c = 90;
        if (this.mode < 2) {
          for (let p = 0; p < 64; p++) {
            const i = p >> 3, j = p & 7, x = x0 + j * c, y = y0 + i * c;
            if (this.mode === 0) { g.fillStyle = `rgb(${v[p]},${v[p]},${v[p]})`; g.fillRect(x, y, c, c); }
            else {
              g.fillStyle = `rgba(${v[p]},${v[p]},${v[p]},0.35)`; g.fillRect(x, y, c, c);
              g.strokeStyle = rgba(PAL.inkFaint, 0.6); g.lineWidth = 2; g.strokeRect(x, y, c, c);
              txt(g, String(v[p]), x + c / 2, y + c / 2 + 2, v[p] > 99 ? 38 : 44, { a: 'center', b: 'middle', w: 700, c: v[p] < 110 ? '#1E120B' : PAL.ink });
            }
          }
          inkRect(g, x0, y0, c * 8, c * 8, 5, PAL.ink, 3);
          if (this.sel >= 0) { const i = this.sel >> 3, j = this.sel & 7; g.lineWidth = 8; g.strokeStyle = PAL.orange; g.strokeRect(x0 + j * c + 4, y0 + i * c + 4, c - 8, c - 8); }
        } else {
          const L = 80, R = 920, mid = 500, A = 300, xs = (k) => L + (R - L) * (k + 0.5) / 64;
          quickStroke(g, [[L, mid], [R, mid]], 3, PAL.inkFaint, 1, [10, 10]);
          for (let r = 1; r < 8; r++) quickStroke(g, [[L + (R - L) * r / 8, 160], [L + (R - L) * r / 8, 840]], 2, rgba(PAL.inkFaint, 0.5), 1, [6, 10]);
          for (let r = 0; r < 8; r++) txt(g, 'ряд ' + (r + 1), L + (R - L) * (r + 0.5) / 8, 890, 30, { a: 'center', c: PAL.inkSoft });
          const pts = v.map((u, k) => [xs(k), mid - (u - 128) / 128 * A]);
          for (let k = 0; k < 64; k++) quickStroke(g, [[pts[k][0], mid], pts[k]], 5, rgba(PAL.teal, 0.55));
          inkStroke(g, pts, 6, PAL.ink, { seed: 4, jitter: 0.6 });
          for (let k = 0; k < 64; k++) { g.fillStyle = k === this.sel ? PAL.orange : PAL.teal; g.beginPath(); g.arc(pts[k][0], pts[k][1], k === this.sel ? 14 : 7, 0, TAU); g.fill(); }
          txt(g, 'громко', 70, 190, 34, { c: PAL.inkSoft }); txt(g, 'тихо', 70, 830, 34, { c: PAL.inkSoft });
          if (this.playT >= 0) { const x = L + (R - L) * this.playT; quickStroke(g, [[x, 150], [x, 850]], 6, PAL.orange); }
        }
        txt(g, this.sel >= 0 ? `клетка ${(this.sel >> 3) + 1}·${(this.sel & 7) + 1} = ${v[this.sel]}` : '64 числа от 0 до 255', 500, 965, 44, { a: 'center', w: 700, c: PAL.inkSoft });
      },
      tick(dt) { if (this.playT >= 0) { this.playT += dt / 1.6; if (this.playT > 1) this.playT = -1; this.dirty = true; } },
      tap(x, y) {
        if (this.mode === 3) { for (let k = 0; k < 28; k++) { const r = Math.floor(k / 7), c = k % 7, x0 = SX0 + c * SW, y0 = SY[r]; if (x >= x0 && x <= x0 + SC * 8 && y >= y0 && y <= y0 + SC * 8) { this.ssel = k; AUDIO.pluck(STACK[k].y * 0.5); this.sync && this.sync(); return true; } } return false; }
        if (this.mode < 2) { const j = Math.floor((x - 140) / 90), i = Math.floor((y - 130) / 90); if (i < 0 || j < 0 || i > 7 || j > 7) return false; this.sel = i * 8 + j; }
        else { const k = Math.floor((x - 80) / (840 / 64)); if (k < 0 || k > 63) return false; this.sel = k; }
        AUDIO.pluck(this.vals()[this.sel] / 128 - 1); this.sync && this.sync(); return true;
      },
      play() {
        const ctx = audioCtx(); if (!ctx) return;
        const v = this.vals(), sr = ctx.sampleRate, dur = 1.6, n = Math.floor(sr * dur), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
        // the 64 numbers are one cycle of the wave; the cycle repeats 165 times a second
        const f = 165;
        for (let i = 0; i < n; i++) {
          const ph = (i / sr * f) % 1 * 64, k = Math.floor(ph), t = ph - k;
          const s = lerp(v[k], v[(k + 1) % 64], t) / 128 - 1;
          const env = Math.min(1, i / 800) * Math.min(1, (n - i) / 4000);
          d[i] = s * 0.25 * env;
        }
        const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start();
        this.mode = 2; this.playT = 0; this.sync && this.sync();
      },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) {
        if (k.startsWith('pic:')) { this.pic = k.slice(4); if (this.mode === 3) this.mode = 0; }
        else if (k.startsWith('mode:')) this.mode = +k.slice(5);
        else if (k === 'play') this.play();
      },
      controls(box) {
        box.innerHTML = Object.keys(PICS).map((p) => bt(p, 'pic:' + p)).join('') + '<br>' +
          MODES.map((s, i) => bt(['фото', 'таблица', 'звук', 'стопка'][i], 'mode:' + i)).join('') + bt('▶ послушать', 'play') +
          sl('яркость', 'br', -120, 120, 1, this.br) + '<div class="info"></div>';
        wire(box, this, (k, v) => (v > 0 ? '+' : '') + Math.round(v));
      },
      syncExtra(box) { box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', (b.dataset.b === 'pic:' + this.pic && this.mode !== 3) || b.dataset.b === 'mode:' + this.mode)); },
      infoText() {
        if (this.mode === 3) { const s = STACK[this.ssel]; return `картинка ${this.ssel + 1} из 28, это ${s.name} · ткни любую картинку стопки`; }
        const v = this.vals(); const avg = Math.round(v.reduce((a, b) => a + b, 0) / 64); return this.sel >= 0 ? `клетка: ряд ${(this.sel >> 3) + 1}, место ${(this.sel & 7) + 1}, число <b>${v[this.sel]}</b>` : `средняя яркость <b>${avg}</b> из 255 · ткни клетку`;
      },
    };
    models.push(m);
  }

  // =========================================================================
  // 2. Нейрон: 64 числа × 64 веса, потом два числа и забор
  // =========================================================================
  const hero = (name) => STACK[name === 'василёк' ? 14 : 0];
  {
    const P = P2, F = { X0: 140, Y0: 60, X1: 950, Y1: 845 };
    const DEMO = [0, 1, CC, CP];
    const m = {
      scene: 'sum', pic: 'ромашка', w1: 0.3, w2: 0.6, th: 200, sel: -1, auto: false, t: 0, rev: 28, dirty: true,
      s(p) { return this.w1 * p[0] + this.w2 * p[1] - this.th; },
      errs() { return P.filter((p) => Math.sign(this.s(p) || -1) !== p[2]); },
      drawSum(g) {
        const v = hero(this.pic).v, C = 54, AX = 30, BX = 540, Y = 120;
        txt(g, `${this.pic}: 64 числа × 64 веса`, 500, 72, 50, { a: 'center', serif: true, w: 700, maxW: 940 });
        drawVals(g, v, AX, Y, C, { grid: true, nums: 22, fw: 5, mark: DEMO.map((p) => [p, PAL.orange]) });
        txt(g, '×', 505, Y + 4 * C + 24, 76, { a: 'center', w: 700 });
        for (let p = 0; p < 64; p++) { const i = p >> 3, j = p & 7, x = BX + j * C, y = Y + i * C; g.fillStyle = W64[p] ? '#F6D77A' : '#F3EBDA'; g.fillRect(x, y, C, C); g.strokeStyle = rgba(PAL.inkFaint, 0.55); g.lineWidth = 1.2; g.strokeRect(x, y, C, C); txt(g, String(W64[p]), x + C / 2, y + C / 2 + 1, 26, { a: 'center', b: 'middle', w: 700, c: W64[p] ? PAL.ink : PAL.inkFaint }); }
        g.lineWidth = 5; g.strokeStyle = PAL.ink; g.strokeRect(BX, Y, C * 8, C * 8);
        DEMO.forEach((p) => { g.lineWidth = 5; g.strokeStyle = PAL.orange; g.strokeRect(BX + (p & 7) * C + 2.5, Y + (p >> 3) * C + 2.5, C - 5, C - 5); });
        txt(g, 'числа картинки', AX + 4 * C, Y + 8 * C + 40, 34, { a: 'center', c: PAL.inkSoft, w: 700 });
        txt(g, 'вес у каждого числа', BX + 4 * C, Y + 8 * C + 40, 34, { a: 'center', c: PAL.inkSoft, w: 700 });
        const ch = PIX8[this.pic].join('');
        DEMO.forEach((p, k) => txt(g, `клетка ${cellRC(p)} (${CHN[ch[p]]}): ${v[p]} × ${W64[p]} = ${v[p] * W64[p]}`, 40, 650 + k * 50, 36, { w: 600, maxW: 920 }));
        txt(g, 'и так ещё 60 клеток, всё складываем', 40, 850, 36, { c: PAL.inkSoft, w: 600 });
        const s = sum64(v), ok = s > TH64;
        txt(g, `сумма ${big(s)} ${ok ? '>' : '<'} порог ${big(TH64)} → ${ok ? 'ромашка' : 'василёк'}`, 500, 935, 46, { a: 'center', w: 700, c: ok ? '#9A6A0A' : F_CORN, maxW: 940 });
      },
      drawPick(g) {
        const v = hero('ромашка').v, C = 56, X = 30, Y = 110;
        txt(g, 'из 64 чисел берём два', 500, 72, 50, { a: 'center', serif: true, w: 700 });
        drawVals(g, v, X, Y, C, { grid: true, nums: 22, fw: 5, mark: [[CC, C_MID], [CP, C_PET]] });
        txt(g, 'серединка', 520, 170, 44, { w: 700, c: C_MID }); txt(g, `клетка 3·4 = ${v[CC]}`, 520, 222, 38, { w: 700 }); txt(g, 'откладываем вправо', 520, 268, 34, { c: PAL.inkSoft });
        txt(g, 'лепесток', 520, 350, 44, { w: 700, c: C_PET }); txt(g, `клетка 4·1 = ${v[CP]}`, 520, 402, 38, { w: 700 }); txt(g, 'откладываем вверх', 520, 448, 34, { c: PAL.inkSoft });
        const F2 = { X0: 170, Y0: 590, X1: 560, Y1: 910 };
        const { sx, sy } = field(g, F2, { pts: [STACK[0]], size: 46, fs: 30 });
        const px = sx(v[CC]), py = sy(v[CP]);
        quickStroke(g, [[F2.X0, py], [px - 26, py]], 4, C_PET, 1, [10, 8]); quickStroke(g, [[px, F2.Y1], [px, py + 26]], 4, C_MID, 1, [10, 8]);
        txt(g, String(v[CP]), F2.X0 + 50, py - 12, 34, { a: 'center', w: 700, c: C_PET }); txt(g, String(v[CC]), px + 40, F2.Y1 - 14, 34, { a: 'center', w: 700, c: C_MID });
        arrow(g, X + 4 * C, Y + 8 * C + 6, px - 30, py - 30, 6, PAL.orange, 26);
        txt(g, 'картинка', 640, 690, 44, { w: 700 }); txt(g, '= два числа', 640, 745, 44, { w: 700 }); txt(g, '= одна точка', 640, 800, 44, { w: 700 });
        txt(g, '64 числа не нарисуешь', 610, 870, 30, { c: PAL.inkSoft, maxW: 330 }); txt(g, 'на плоскости, два можно', 610, 908, 30, { c: PAL.inkSoft, maxW: 330 });
      },
      drawStack(g) {
        const n = Math.min(28, Math.floor(this.rev) + 1), cur = n >= 28 && this.rev >= 28 ? 0 : n - 1;
        const { sx, sy } = field(g, F, { n, size: 40 });
        const s = STACK[cur];
        callout(g, s.v, s.y, 175, 95, 13, sx(s.v[CC]), sy(s.v[CP]), [[`серединка ${s.v[CC]}`, C_MID], [`лепесток ${s.v[CP]}`, C_PET]]);
        pill(g, `точек на поле: ${n} из 28`, F.X1 - 20, F.Y1 - 30, 38, { a: 'right' });
      },
      draw(g) {
        if (this.scene === 'sum') return this.drawSum(g);
        if (this.scene === 'pick') return this.drawPick(g);
        if (this.scene === 'stack') return this.drawStack(g);
        const { bad } = field(g, F, { w1: this.w1, w2: this.w2, th: this.th, size: 40, sel: this.sel });
        pill(g, bad ? `ошибок: ${bad} из 28` : 'ошибок нет!', F.X0 + 20, F.Y0 + 70, 46, { bg: bad ? PAL.paper : PAL.sun, c: bad ? PAL.red : PAL.ink });
        pill(g, 'ромашки', F.X1 - 20, F.Y1 - 30, 36, { a: 'right', bg: '#F8E7B0', border: F_DAISY });
        pill(g, 'васильки', F.X0 + 20, F.Y1 - 30, 36, { bg: '#C9DDF2', border: F_CORN });
      },
      tick(dt) {
        if (this.scene === 'stack' && this.rev < 28) { this.rev = Math.min(28, this.rev + dt / 0.16); this.dirty = true; if (this.rev >= 28) this.sync(); }
        if (!this.auto) return;
        this.t += dt; if (this.t < 0.3) return; this.t = 0;
        const bad = this.errs();
        if (!bad.length) { this.auto = false; AUDIO.chime(true); this.sync(); return; }
        const p = bad[Math.floor(Math.random() * bad.length)], eta = 0.03;
        this.w1 += eta * p[2] * p[0] / 127.5; this.w2 += eta * p[2] * p[1] / 127.5; this.th -= eta * p[2] * 30;
        this.w1 = clamp(this.w1, -1.5, 1.5); this.w2 = clamp(this.w2, -1.5, 1.5); this.th = clamp(this.th, -300, 600);
        AUDIO.pluck(-0.3); this.sync();
      },
      tap(x, y) {
        if (this.scene === 'sum') { this.pic = this.pic === 'ромашка' ? 'василёк' : 'ромашка'; this.sync(); return true; }
        if (this.scene !== 'field') { this.scene = 'field'; this.sync(); return true; }
        const sx = (v) => F.X0 + (F.X1 - F.X0) * v / VMAX, sy = (v) => F.Y1 - (F.Y1 - F.Y0) * v / VMAX;
        let b = -1, bd = 50;
        P.forEach((p, k) => { const d = Math.hypot(sx(p[0]) - x, sy(p[1]) - y); if (d < bd) { bd = d; b = k; } });
        if (b < 0) return false; this.sel = b; AUDIO.pluck(P[b][2] * 0.6); this.sync(); return true;
      },
      get(k) { return this[k]; },
      set(k, v) { this[k] = v; if (k === 'w1' || k === 'w2' || k === 'th') { this.auto = false; this.scene = 'field'; } },
      press(k) {
        if (k.startsWith('scene:')) { this.scene = k.slice(6); if (this.scene === 'stack') this.rev = 0; this.auto = false; return; }
        if (k.startsWith('pic:')) { this.pic = k.slice(4); this.scene = 'sum'; return; }
        this.scene = 'field';
        if (k === 'auto') this.auto = !this.auto;
        if (k === 'reset') { this.w1 = 0.3; this.w2 = 0.6; this.th = 200; this.auto = false; }
      },
      controls(box) {
        box.innerHTML = sl('вес серединки', 'w1', -1.5, 1.5, 0.05, this.w1) + sl('вес лепестка', 'w2', -1.5, 1.5, 0.05, this.w2) + sl('порог', 'th', -300, 600, 5, this.th) +
          bt('▶ подобрать само', 'auto') + bt('сбросить', 'reset') + bt('64 числа', 'scene:sum') + bt('откуда точки', 'scene:stack') + '<div class="info"></div>';
        wire(box, this, (k, v) => (k === 'th' ? String(Math.round(v)) : f2(v)));
      },
      syncExtra(box) { const b = box.querySelector('[data-b="auto"]'); b.classList.toggle('on', this.auto); b.textContent = this.auto ? '❚❚ стоп' : '▶ подобрать само'; },
      infoText() {
        if (this.scene === 'sum') { const v = hero(this.pic).v; return `${this.pic}: сумма 64 произведений <b>${big(sum64(v))}</b>, порог ${big(TH64)} · ткни доску, покажу ${this.pic === 'ромашка' ? 'василёк' : 'ромашку'}`; }
        if (this.scene === 'pick') return 'клетка серединки 172 идёт вправо, клетка лепестка 236 вверх · ткни доску';
        if (this.scene === 'stack') return 'каждая картинка стопки встаёт на поле по своим двум числам · ткни доску, будет забор';
        if (this.sel < 0) return `ошибок <b>${this.errs().length}</b> из 28 · ткни картинку на поле, покажу счёт`;
        const p = P[this.sel], s = this.w1 * p[0] + this.w2 * p[1];
        return `${f2(this.w1)}×${p[0]} + ${f2(this.w2)}×${p[1]} = <b>${fmt(s, 1)}</b> ${s > this.th ? '&gt;' : '&lt;'} ${Math.round(this.th)} → ${s > this.th ? 'ромашка' : 'василёк'}${(s > this.th ? 1 : -1) === p[2] ? ' ✓' : ' <b style="color:#BF3F2C">ошибка</b>'}`;
      },
    };
    models.push(m);
  }

  // =========================================================================
  // 3. Ошибка и градиентный спуск
  // =========================================================================
  // Холм это ошибка нейрона-забора со стенда 2 на тех же 28 картинках. Вес серединки 1 и порог 300 закреплены,
  // крутим только вес лепестка w. Сколько перепутал: лесенка. Штраф: гладкий холм, по нему и катится шарик.
  const W1_3 = 1, TH_3 = 300, sp = (z) => (z > 30 ? z : Math.log1p(Math.exp(z))), sig = (z) => 1 / (1 + Math.exp(-z));
  const sc3 = (w, p) => (W1_3 * p[0] + w * p[1] - TH_3) / 100;
  const f3 = (w) => P2.reduce((s, p) => s + sp(-p[2] * sc3(w, p)), 0) / P2.length;
  const df3 = (w) => P2.reduce((s, p) => s - p[2] * p[1] / 100 * sig(-p[2] * sc3(w, p)), 0) / P2.length;
  const nerr3 = (w) => P2.filter((p) => (sc3(w, p) > 0 ? 1 : -1) !== p[2]).length;
  // куда скатывается шарик со старта −0,4 шагом 0,5: этот вес лепестка унесёт с собой стенд 4
  const W3 = (() => { let w = -0.4; for (let k = 0; k < 80 && !(Math.abs(df3(w)) < 0.01); k++) w -= 0.5 * df3(w); return Math.round(w * 100) / 100; })();
  {
    const f = f3, df = df3, nerr = nerr3;
    const WMIN = -1, WMAX = 3.5, FMAX = 2.1;
    const X0 = 80, X1 = 950, Y0 = 60, Y1 = 500;
    const sx = (w) => X0 + (X1 - X0) * (w - WMIN) / (WMAX - WMIN), sy = (v) => Y1 - (Y1 - Y0) * v / FMAX;
    const FB = { X0: 60, Y0: 600, X1: 420, Y1: 960 };
    const m = {
      w: -0.4, lr: 0.5, steps: 0, trail: [], play: false, t: 0, hop: null, out: false, intro: 0, build: -1, dirty: true,
      draw(g) {
        if (this.intro) {
          const F = { X0: 140, Y0: 60, X1: 950, Y1: 845 };
          const { bad } = field(g, F, { w1: W1_3, w2: this.w, th: TH_3, size: 40 });
          pill(g, bad ? `ошибок: ${bad} из 28` : 'ошибок нет!', F.X0 + 20, F.Y0 + 70, 46, { bg: bad ? PAL.paper : PAL.sun, c: bad ? PAL.red : PAL.ink });
          pill(g, `вес серединки 1, вес лепестка ${f2(this.w)}, порог 300`, F.X0 + 20, F.Y1 - 30, 34, { maxW: 780 });
          return;
        }
        const bw0 = this.build >= 0 ? WMIN + (WMAX - WMIN) * Math.min(1, this.build) : WMAX;
        const curve = []; for (let i = 0; i <= 200; i++) { const w = WMIN + (WMAX - WMIN) * i / 200; if (w > bw0 + 1e-9) break; curve.push([sx(w), sy(Math.min(f(w), FMAX + 0.3))]); }
        g.save(); g.beginPath(); g.rect(X0, Y0 - 10, X1 - X0, Y1 - Y0 + 10); g.clip();
        if (curve.length > 1) {
          g.beginPath(); curve.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.lineTo(curve[curve.length - 1][0], Y1); g.lineTo(X0, Y1); g.closePath();
          g.fillStyle = 'rgba(148,164,127,0.45)'; g.fill();
          const st = []; for (let i = 0; i <= 400; i++) { const w = WMIN + (WMAX - WMIN) * i / 400; if (w > bw0 + 1e-9) break; st.push([sx(w), sy(nerr(w) / 28 * FMAX * 0.9)]); }
          quickStroke(g, st, 3, rgba(PAL.inkSoft, 0.75), 1, [7, 7]);
          inkStroke(g, curve, 7, PAL.ink, { seed: 7 });
        }
        g.restore();
        quickStroke(g, [[X0, Y1], [X1, Y1]], 3, PAL.ink);
        for (const w of [-1, 0, 1, 2, 3]) { quickStroke(g, [[sx(w), Y1], [sx(w), Y1 + 12]], 3, PAL.ink); txt(g, String(w).replace('-', '−'), sx(w), Y1 + 46, 32, { a: 'center', c: PAL.inkSoft }); }
        txt(g, 'вес лепестка →', X1 - 10, Y1 - 18, 34, { a: 'right', c: C_PET, w: 700 });
        txt(g, 'штраф за путаницу', X1 - 10, Y0 + 40, 38, { a: 'right', c: PAL.ink, w: 700 });
        txt(g, '- - - сколько перепутал', X1 - 10, Y0 + 84, 32, { a: 'right', c: PAL.inkSoft });
        let shown = this.w;
        if (this.build >= 0 && this.build < 1) {
          shown = bw0; const bx = sx(bw0), by = sy(Math.min(FMAX, f(bw0)));
          quickStroke(g, [[bx, Y1], [bx, by]], 4, PAL.orange, 1, [8, 6]);
          g.fillStyle = PAL.orange; g.beginPath(); g.arc(bx, by, 13, 0, TAU); g.fill();
          pill(g, `вес ${f2(bw0)}: перепутал ${nerr(bw0)}`, clamp(bx, 300, 700), Y0 + 150, 36, { a: 'center' });
        } else {
          const tr = this.trail;
          for (let i = 1; i < tr.length; i++) {
            const a = tr[i - 1], b = tr[i], ax = sx(clamp(a, WMIN, WMAX)), bx = sx(clamp(b, WMIN, WMAX)), ay = sy(Math.min(FMAX, f(clamp(a, WMIN, WMAX)))), by = sy(Math.min(FMAX, f(clamp(b, WMIN, WMAX))));
            const al = 0.25 + 0.6 * i / tr.length;
            g.save(); g.globalAlpha = al; g.strokeStyle = PAL.orange; g.lineWidth = 4; g.setLineDash([10, 9]);
            g.beginPath(); g.moveTo(ax, ay - 26); g.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 40 - Math.abs(bx - ax) * 0.25, bx, by - 26); g.stroke(); g.restore();
            g.fillStyle = rgba(PAL.orange, al); g.beginPath(); g.arc(ax, ay - 26, 8, 0, TAU); g.fill();
          }
          let bw = this.w, lift = 0;
          if (this.hop) { const k = this.hop.t; bw = lerp(this.hop.a, this.hop.b, k); lift = Math.sin(k * Math.PI) * (40 + Math.abs(this.hop.b - this.hop.a) * 40); }
          const cw = clamp(bw, WMIN, WMAX), bx = sx(cw), by = sy(Math.min(f(cw), FMAX)) - 26 - lift;
          if (!this.hop && !this.out) { const s = df(this.w), d = 0.35; quickStroke(g, [[sx(this.w - d), sy(f(this.w) - s * d) - 26], [sx(this.w + d), sy(f(this.w) + s * d) - 26]], 5, PAL.annBlue, 0.9); arrow(g, bx, by + 50, bx + clamp(-s * 110, -160, 160), by + 50, 6, PAL.red, 24); }
          g.fillStyle = this.out ? PAL.red : PAL.sun; g.beginPath(); g.arc(bx, by, 26, 0, TAU); g.fill(); inkCircle(g, bx, by, 26, 4, PAL.ink, 5);
          g.fillStyle = '#FFF7DD'; g.beginPath(); g.arc(bx - 8, by - 9, 7, 0, TAU); g.fill();
        }
        // окошко внизу: поле стенда 2 и забор при текущем весе
        const w = clamp(shown, WMIN, WMAX);
        field(g, FB, { w1: W1_3, w2: w, th: TH_3, size: 22, lab: false, fenceW: 7 });
        txt(g, 'забор стенда 2', FB.X0, FB.Y0 - 16, 34, { w: 700 });
        const ne = nerr(w);
        txt(g, this.out && this.build < 0 ? 'улетел за край!' : `вес лепестка ${f2(shown)}`, 450, 660, 46, { w: 700, c: this.out ? PAL.red : PAL.ink, maxW: 520 });
        txt(g, this.out && this.build < 0 ? 'шаг слишком большой' : `перепутал ${ne} из 28`, 450, 730, 46, { w: 700, c: ne ? PAL.red : '#2F7A35', maxW: 520 });
        if (!this.out) txt(g, `штраф ${f2(f(shown))} · наклон ${f2(df(shown))}`, 450, 795, 38, { c: PAL.inkSoft, maxW: 520 });
        txt(g, `шагов сделано: ${this.steps}`, 450, 855, 38, { c: PAL.inkSoft });
        txt(g, 'вес серединки 1, порог 300', 450, 915, 34, { c: PAL.inkSoft });
      },
      step() {
        if (this.out) return;
        const a = this.w, b = a - this.lr * df(a);
        this.trail.push(a); if (this.trail.length > 14) this.trail.shift();
        this.w = b; this.steps++; this.hop = { a, b, t: 0 };
        if (b > WMAX || b < WMIN) { this.out = true; this.play = false; AUDIO.chime(false); }
        else AUDIO.pluck(1 - f(b));
        this.sync();
      },
      tick(dt) {
        if (this.build >= 0 && this.build < 1) { this.build = Math.min(1, this.build + dt / 3.5); this.dirty = true; if (this.build >= 1) { this.build = -1; this.sync(); } return; }
        if (this.hop) { this.hop.t += dt / 0.25; if (this.hop.t >= 1) this.hop = null; this.dirty = true; }
        if (!this.play) return;
        this.t += dt; if (this.t < 0.3) return; this.t = 0;
        if (Math.abs(df(this.w)) < 0.01 && this.steps > 0) { this.play = false; AUDIO.chime(true); this.sync(); return; }
        this.step();
        if (this.steps > 60) { this.play = false; this.sync(); }
      },
      tap(x, y) { if (this.intro) { this.intro = 0; this.sync(); return true; } if (x < X0 || x > X1 || y > Y1 + 20) return false; this.w = clamp(WMIN + (x - X0) / (X1 - X0) * (WMAX - WMIN), WMIN + 0.05, WMAX - 0.05); this.reset(true); return true; },
      reset(keep) { if (!keep) this.w = -0.4; this.steps = 0; this.trail = []; this.out = false; this.hop = null; this.play = false; this.build = -1; this.sync(); },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k === 'lr') this.intro = 0; },
      press(k) { this.intro = 0; if (k === 'play') { if (this.out) this.reset(); this.play = !this.play; } if (k === 'step') this.step(); if (k === 'reset') this.reset(); if (k === 'build') { this.reset(); this.build = 0; } },
      controls(box) { box.innerHTML = sl('размер шага', 'lr', 0.05, 5, 0.05, this.lr) + bt('▶ катиться', 'play') + bt('один шаг', 'step') + bt('шарик на старт', 'reset') + bt('построить холм', 'build') + '<div class="info"></div>'; wire(box, this, (k, v) => f2(v)); },
      syncExtra(box) { const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ катиться'; },
      infoText() {
        if (this.intro) return `забор стенда 2 при весе лепестка <b>${f2(this.w)}</b>: перепутал ${nerr(this.w)} из 28 · ткни доску, покажу холм`;
        const v = this.lr > 3.5 ? 'шаг огромный: шарик прыгает через низину' : this.lr > 1.5 ? 'шаг большой: шарик скачет широко' : this.lr < 0.15 ? 'шаг крошечный: шарик ползёт' : 'нормальный шаг';
        return `${v} · ткни кривую, чтобы поставить шарик`;
      },
    };
    m._f = f; m._df = df; m._nerr = nerr;
    models.push(m);
  }

  // =========================================================================
  // 4. Обратное распространение ошибки
  // =========================================================================
  {
    // та же картинка → нейрон 1 (забор стенда 3: вес серединки, вес лепестка, порог, сплющиватель) → нейрон 2 (один вес) → ответ: +1 ромашка, −1 василёк
    // числа картинки делим на 100, чтобы сплющиватель не захлебнулся: 172 → 1,72; порог 300 → 3
    const FL = { 'ромашка': [hero('ромашка').v[CC] / 100, hero('ромашка').v[CP] / 100, 1], 'василёк': [hero('василёк').v[CC] / 100, hero('василёк').v[CP] / 100, -1] };
    const W0 = { wC: 1, wP: W3, w2: 0.2 };
    const m = {
      fl: 'ромашка', wC: W0.wC, wP: W0.wP, w2: W0.w2, lr: 0.3, steps: 0, hist: [], play: false, t: 0, ph: 0, flash: 0, intro: 0, dirty: true,
      fwd() {
        const [a, b, tgt] = FL[this.fl], z = this.wC * a + this.wP * b - 3, h = Math.tanh(z), y = this.w2 * h, L = 0.5 * (y - tgt) ** 2;
        const dy = y - tgt, dw2 = dy * h, dh = dy * this.w2, dz = dh * (1 - h * h), dwC = dz * a, dwP = dz * b;
        return { a, b, tgt, z, h, y, L, dy, dw2, dh, dz, dwC, dwP };
      },
      drawIntro(g) {
        const F = { X0: 110, Y0: 70, X1: 520, Y1: 480 };
        field(g, F, { w1: W0.wC, w2: W0.wP, th: 300, size: 24, fs: 30, sel: 0 });
        txt(g, 'забор стенда 3', 110, 50, 34, { w: 700 });
        txt(g, 'вес серединки 1', 545, 95, 30, { w: 700 }); txt(g, `вес лепестка ${f2(W0.wP)}`, 545, 132, 30, { w: 700 }); txt(g, 'порог 300, ошибок нет', 545, 169, 30, { w: 700 });
        // нейрон 1 → нейрон 2 → ответ
        const NY = 300, xs = [620, 760, 900];
        quickStroke(g, [[xs[0] + 50, NY], [xs[1] - 50, NY]], 10, PAL.paperDeep); quickStroke(g, [[xs[1] + 50, NY], [xs[2] - 50, NY]], 10, PAL.paperDeep);
        xs.forEach((x, k) => { g.fillStyle = k === 2 ? '#F3C9BC' : PAL.stripeYellow; g.beginPath(); g.arc(x, NY, 48, 0, TAU); g.fill(); inkCircle(g, x, NY, 48, 4, PAL.ink, k + 2); txt(g, ['1', '2', '?'][k], x, NY + 2, 44, { a: 'center', b: 'middle', w: 700 }); });
        txt(g, 'нейрон 1 = этот забор', 560, 400, 32, { c: PAL.inkSoft, maxW: 420 }); txt(g, 'за ним ставим нейрон 2', 560, 440, 32, { c: PAL.inkSoft, maxW: 420 });
        // наша ромашка: две клетки → два числа → в сотни
        const v = hero(this.fl).v, PX = 60, PY = 600, C = 40;
        drawVals(g, v, PX, PY, C, { grid: true, frame: F_DAISY, fw: 5, mark: [[CC, C_MID], [CP, C_PET]] });
        txt(g, `наша ${this.fl}`, PX, PY - 16, 34, { w: 700 });
        const rows = [[`серединка ${v[CC]}`, `${f2(v[CC] / 100)}`, C_MID], [`лепесток ${v[CP]}`, `${f2(v[CP] / 100)}`, C_PET]];
        rows.forEach(([s, t, cl], k) => { const y = 690 + k * 120; txt(g, s, 420, y, 40, { w: 700, c: cl }); arrow(g, 720, y - 12, 800, y - 12, 5, PAL.orange, 20); txt(g, t, 820, y, 46, { w: 700, c: cl }); });
        txt(g, 'делим на 100: те же числа в сотнях', 420, 905, 30, { c: PAL.inkSoft, maxW: 470 }); txt(g, 'порог 300 тоже становится 3', 420, 948, 30, { c: PAL.inkSoft, maxW: 470 });
      },
      draw(g) {
        if (this.intro) return this.drawIntro(g);
        const F = this.fwd(), NY = 300, NX = [95, 390, 640, 895], R = 66;
        const names = ['картинка', 'нейрон 1', 'нейрон 2', 'ошибка'], vals = [null, F.h, F.y, F.L];
        const grads = [Math.abs(F.dwC) + Math.abs(F.dwP), Math.abs(F.dw2), Math.abs(F.dy)], gmax = Math.max(0.05, ...grads);
        for (let k = 0; k < 3; k++) {
          const a = NX[k] + R, b = NX[k + 1] - R, th = 12 + 34 * grads[k] / gmax;
          g.fillStyle = PAL.paperDeep; g.fillRect(a, NY - th / 2, b - a, th);
          quickStroke(g, [[a, NY - th / 2], [b, NY - th / 2]], 3, PAL.ink); quickStroke(g, [[a, NY + th / 2], [b, NY + th / 2]], 3, PAL.ink);
          for (let q = 0; q < 3; q++) {
            const u = (this.ph + q / 3) % 1;
            g.fillStyle = rgba(PAL.sun, 0.95); g.beginPath(); g.arc(a + (b - a) * u, NY - th * 0.15, 6, 0, TAU); g.fill();
            g.fillStyle = rgba(PAL.red, 0.9); g.beginPath(); g.arc(b - (b - a) * u, NY + th * 0.18, 5 + 7 * grads[k] / gmax, 0, TAU); g.fill();
          }
          const cx = (a + b) / 2;
          if (k === 0) {
            txt(g, `серед. ${f2(this.wC)}`, cx, NY - 118, 32, { a: 'center', w: 700, c: C_MID });
            txt(g, `лепест. ${f2(this.wP)}`, cx, NY - 74, 32, { a: 'center', w: 700, c: C_PET });
            txt(g, 'вина', cx, NY + 78, 34, { a: 'center', c: PAL.red, w: 700 });
            txt(g, f2(F.dwC), cx, NY + 120, 38, { a: 'center', w: 700, c: PAL.red });
            txt(g, f2(F.dwP), cx, NY + 162, 38, { a: 'center', w: 700, c: PAL.red });
          } else {
            txt(g, k === 1 ? 'вес' : 'цель', cx, NY - 118, 34, { a: 'center', c: PAL.inkSoft, w: 700 });
            txt(g, f2(k === 1 ? this.w2 : F.tgt), cx, NY - 74, 40, { a: 'center', w: 700 });
            txt(g, 'вина', cx, NY + 78, 34, { a: 'center', c: PAL.red, w: 700 });
            txt(g, f2(k === 1 ? F.dw2 : F.dy), cx, NY + 120, 40, { a: 'center', w: 700, c: PAL.red });
          }
        }
        NX.forEach((x, k) => {
          g.fillStyle = k === 3 ? (this.flash > 0 ? PAL.sun : '#F3C9BC') : k === 0 ? '#E9DFC8' : PAL.stripeYellow;
          g.beginPath(); g.arc(x, NY, R, 0, TAU); g.fill(); inkCircle(g, x, NY, R, 5, PAL.ink, k + 3);
          if (k === 0) drawVals(g, hero(this.fl).v, x - 40, NY - 40, 10, { frame: this.fl === 'ромашка' ? F_DAISY : F_CORN, fw: 4, mark: [[CC, C_MID], [CP, C_PET]] });
          else txt(g, f2(vals[k]), x, NY + 2, 44, { a: 'center', b: 'middle', w: 700 });
          txt(g, names[k], x, 110, 36, { a: 'center', c: PAL.ink, w: 700 });
        });
        txt(g, `сер. ${f2(F.a)}`, NX[0], NY + 110, 30, { a: 'center', c: C_MID, w: 700 }); txt(g, `леп. ${f2(F.b)}`, NX[0], NY + 148, 30, { a: 'center', c: C_PET, w: 700 });
        txt(g, F.y > 0 ? '→ ромашка' : '→ василёк', NX[2], NY + 200, 40, { a: 'center', w: 700, c: (F.y > 0 ? 1 : -1) === F.tgt ? '#2F7A35' : PAL.red });
        const X0 = 110, X1 = 930, Y0 = 640, Y1 = 940;
        quickStroke(g, [[X0, Y0 - 10], [X0, Y1], [X1, Y1]], 3, PAL.ink);
        txt(g, 'ошибка по шагам', X0 + 16, Y0 + 26, 38, { c: PAL.inkSoft });
        const L = this.hist.concat([F.L]), mx = Math.max(0.05, ...L), n = Math.max(20, L.length);
        if (L.length < 2) txt(g, 'жми «шаг обучения»', (X0 + X1) / 2, (Y0 + Y1) / 2 + 30, 42, { a: 'center', c: PAL.inkFaint });
        if (L.length > 1) inkStroke(g, L.map((v, i) => [X0 + (X1 - X0) * i / (n - 1), Y1 - (Y1 - Y0 - 40) * v / mx]), 6, PAL.red, { seed: 2, double: false });
        txt(g, `шаг ${this.steps}`, X1, Y0 + 26, 42, { a: 'right', w: 700 });
        txt(g, f2(F.L), X1, Y0 + 78, 42, { a: 'right', w: 700, c: PAL.red });
      },
      learn() {
        const F = this.fwd(); this.hist.push(F.L); if (this.hist.length > 60) this.hist.shift();
        this.wC -= this.lr * F.dwC; this.wP -= this.lr * F.dwP; this.w2 -= this.lr * F.dw2; this.steps++; this.flash = 0.4;
        AUDIO.pluck(1 - Math.min(2, F.L * 3)); this.sync();
      },
      tick(dt) { this.ph = (this.ph + dt * 0.45) % 1; this.flash = Math.max(0, this.flash - dt); this.dirty = true; if (this.play) { this.t += dt; if (this.t > 0.4) { this.t = 0; this.learn(); if (this.fwd().L < 1e-3 || this.steps > 120) { this.play = false; this.sync(); } } } },
      tap() { if (this.intro) { this.intro = 0; this.sync(); return true; } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k !== 'intro') this.intro = 0; },
      press(k) {
        if (k !== 'intro') this.intro = 0;
        if (k === 'intro') this.intro = 1;
        if (k === 'step') this.learn(); if (k === 'play') this.play = !this.play;
        if (k === 'reset') { Object.assign(this, W0); this.steps = 0; this.hist = []; this.play = false; }
        if (k === 'fl') { this.fl = this.fl === 'ромашка' ? 'василёк' : 'ромашка'; this.hist = []; AUDIO.chime(true); }
        if (k.startsWith('fl:')) { this.fl = k.slice(3); this.hist = []; }
      },
      controls(box) { box.innerHTML = bt('шаг обучения', 'step') + bt('▶ само', 'play') + bt('заново', 'reset') + bt('показать василёк', 'fl') + bt('откуда цепочка', 'intro') + '<div class="info"></div>'; wire(box, this, (k, v) => f2(v)); },
      syncExtra(box) { const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ само'; box.querySelector('[data-b="fl"]').textContent = this.fl === 'ромашка' ? 'показать василёк' : 'показать ромашку'; },
      infoText() {
        if (this.intro) return 'нейрон 1 это забор стенда 3, за ним встанет нейрон 2 · ткни доску, покажу цепочку';
        const F = this.fwd(); return `${this.fl}: серединка ${f2(F.a)}, лепесток ${f2(F.b)} · выход ${f2(F.y)}, цель ${F.tgt > 0 ? '+1 (ромашка)' : '−1 (василёк)'}, ошибка <b>${fmt(F.L, 3)}</b><br>вина веса лепестка = ${f2(F.dy)} × ${f2(this.w2)} × (1 − ${f2(F.h)}²) × ${f2(F.b)} = <b style="color:#BF3F2C">${fmt(F.dwP, 3)}</b>`;
      },
    };
    m._fwd = () => m.fwd();
    models.push(m);
  }

  // =========================================================================
  // Стопка стендов 5 и 6: 110 картинок 8×8, у которых серединка и лепесток лежат завитками.
  // Точка (x, y) от −1,1 до 1,1 это яркость серединки и лепестка: 128 + 115 × x.
  // Три картинки подписаны с ошибкой: так бывает в жизни, и это всплывёт на стенде 6.
  // =========================================================================
  const SPI = [];
  const SPI_SPLIT = (() => { const r = mulberry(42 * 101), a = [...Array(110).keys()]; for (let i = 109; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  {
    const R = mulberry(17);
    for (let c = 0; c < 2; c++) for (let i = 0; i < 55; i++) { const t = i / 55, r = 0.15 + 0.8 * t, a = t * 1.6 * Math.PI + c * Math.PI; SPI.push([r * Math.cos(a) + gauss(R) * 0.04, r * Math.sin(a) + gauss(R) * 0.04, c]); }
    for (let k = 0; k < 3; k++) SPI[SPI_SPLIT[k]][2] = 1 - SPI[SPI_SPLIT[k]][2];
  }
  const SPI_FLIP = new Set(SPI_SPLIT.slice(0, 3));
  const toB = (x) => clamp(Math.round(128 + 115 * x), 0, 255);
  // картинка точки: шаблон ромашки или василька (по подписи), серединке и лепестку даём яркости точки
  const spiPic = (k) => {
    const s = SPI[k]; if (s.pic) return s.pic;
    const rows = PIX8[s[2] ? 'ромашка' : 'василёк'], bC = toB(s[0]), bP = toB(s[1]), v = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const ch = rows[i][j]; v.push(ch === 'Y' || ch === 'D' ? bC : ch === 'W' || ch === 'B' ? bP : GRAY8[ch]); }
    s.pic = v; return v;
  };
  const PCAN = new Map();
  function pcan(v) { let c = PCAN.get(v); if (c) return c; c = mkCanvas(8, 8); const g = c.getContext('2d'), id = g.createImageData(8, 8); for (let p = 0; p < 64; p++) { id.data[p * 4] = id.data[p * 4 + 1] = id.data[p * 4 + 2] = v[p]; id.data[p * 4 + 3] = 255; } g.putImageData(id, 0, 0); PCAN.set(v, c); return c; }
  function mini(g, v, cx, cy, s, lab, o = {}) {
    g.save(); g.globalAlpha = o.alpha ?? 1; g.imageSmoothingEnabled = false; g.drawImage(pcan(v), cx - s / 2, cy - s / 2, s, s); g.imageSmoothingEnabled = true;
    g.lineWidth = 3; g.strokeStyle = lab ? F_DAISY : F_CORN; g.strokeRect(cx - s / 2, cy - s / 2, s, s); g.restore();
  }
  const spiNet = (H, seed) => {
    const r = mulberry(seed), n = { H, W1: [], b1: [], W2: [], b2: 0 };
    for (let h = 0; h < H; h++) { n.W1.push([gauss(r) * 2.2, gauss(r) * 2.2]); n.b1.push(gauss(r) * 0.6); n.W2.push(gauss(r) * 0.5); }
    n.m = new Float64Array(H * 4 + 1); n.v = new Float64Array(H * 4 + 1); n.t = 0;
    return n;
  };
  const spiFwd = (n, x, y, hid) => { let s = n.b2; for (let h = 0; h < n.H; h++) { const a = Math.tanh(n.W1[h][0] * x + n.W1[h][1] * y + n.b1[h]); if (hid) hid[h] = a; s += n.W2[h] * a; } return 1 / (1 + Math.exp(-s)); };
  const spiTrain = (n, lr, DD) => {
    const H = n.H, gr = new Float64Array(H * 4 + 1), hid = new Float64Array(H); let loss = 0, ok = 0;
    for (const [x, y, c] of DD) {
      const p = spiFwd(n, x, y, hid); loss -= Math.log(Math.max(1e-9, c ? p : 1 - p)); if ((p > 0.5) === !!c) ok++;
      const d = p - c; gr[H * 4] += d;
      for (let h = 0; h < H; h++) { gr[h * 4 + 3] += d * hid[h]; const dh = d * n.W2[h] * (1 - hid[h] * hid[h]); gr[h * 4] += dh * x; gr[h * 4 + 1] += dh * y; gr[h * 4 + 2] += dh; }
    }
    const N = DD.length; n.t++;
    const b1 = 0.9, b2 = 0.999, bc1 = 1 - b1 ** n.t, bc2 = 1 - b2 ** n.t;
    const upd = (i) => { const gg = gr[i] / N; n.m[i] = b1 * n.m[i] + (1 - b1) * gg; n.v[i] = b2 * n.v[i] + (1 - b2) * gg * gg; return lr * (n.m[i] / bc1) / (Math.sqrt(n.v[i] / bc2) + 1e-8); };
    for (let h = 0; h < H; h++) { n.W1[h][0] -= upd(h * 4); n.W1[h][1] -= upd(h * 4 + 1); n.b1[h] -= upd(h * 4 + 2); n.W2[h] -= upd(h * 4 + 3); }
    n.b2 -= upd(H * 4);
    return { loss: loss / N, acc: ok / N };
  };
  const SS = 1.1;
  // поле завитков: фон по сети, оси «яркость серединки / лепестка», подписи 13, 128, 243
  function spiField(g, F, gridFn, o = {}) {
    const { X0, Y0, X1, Y1 } = F, sx = (v) => X0 + (X1 - X0) * (v + SS) / (2 * SS), sy = (v) => Y1 - (Y1 - Y0) * (v + SS) / (2 * SS), fs = o.fs || 34;
    if (gridFn) {
      const n = o.res || 46, cw = (X1 - X0) / n, ch = (Y1 - Y0) / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const p = gridFn(-SS + 2 * SS * (j + 0.5) / n, SS - 2 * SS * (i + 0.5) / n, i, j);
        g.fillStyle = css(p > 0.5 ? mixc(C_PAPER, [0.96, 0.78, 0.30], Math.min(1, (p - 0.5) * 2.4)) : mixc(C_PAPER, [0.45, 0.62, 0.86], Math.min(1, (0.5 - p) * 2.4)));
        g.fillRect(X0 + j * cw, Y0 + i * ch, cw + 1, ch + 1);
      }
    } else { g.fillStyle = 'rgba(226,209,176,0.45)'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0); }
    inkRect(g, X0, Y0, X1 - X0, Y1 - Y0, 4, PAL.ink, 6);
    if (o.lab !== false) {
      for (const v of [-1, 0, 1]) { txt(g, String(toB(v)), sx(v), Y1 + fs * 0.9, fs * 0.75, { a: 'center', c: PAL.inkSoft }); }
      txt(g, 'яркость серединки →', X1, Y1 + fs * 1.85, fs, { a: 'right', c: C_MID, w: 700 });
      g.save(); g.translate(X0 - fs * 0.6, (Y0 + Y1) / 2); g.rotate(-Math.PI / 2); txt(g, 'яркость лепестка →', 0, 0, fs, { a: 'center', c: C_PET, w: 700 }); g.restore();
    }
    return { sx, sy };
  }

  // =========================================================================
  // 5. Многослойная сеть на завитках, учится прямо здесь
  // =========================================================================
  {
    const D = SPI;
    const X0 = 70, X1 = 930, Y0 = 60, Y1 = 900;
    const F = { X0, Y0, X1, Y1 };
    // для сносок: самая дальняя ромашка завитка, самый дальний василёк, перепутанная подпись
    const far = (c) => { let b = -1, bd = -1; D.forEach((s, k) => { if (s[2] === c && !SPI_FLIP.has(k)) { const d = Math.hypot(s[0], s[1]); if (d > bd) { bd = d; b = k; } } }); return b; };
    const near = (c) => { let b = -1, bd = 9; D.forEach((s, k) => { if (s[2] === c && !SPI_FLIP.has(k)) { const d = Math.hypot(s[0], s[1]); if (d < bd) { bd = d; b = k; } } }); return b; };
    const CALL = [far(1), far(0), near(0)];
    const m = {
      H: 1, seed: 3, play: false, ep: 0, loss: 0.69, acc: 0.5, intro: 0, dirty: true,
      quick(n = 600) { let r; for (let k = 0; k < n; k++) { r = spiTrain(this.net, 0.03, D); this.ep++; } this.loss = r.loss; this.acc = r.acc; this.play = false; },
      reset() { this.net = spiNet(this.H, this.seed); this.ep = 0; const r = this.evalNow(); this.loss = r.loss; this.acc = r.acc; },
      evalNow() { let loss = 0, ok = 0; for (const [x, y, c] of D) { const p = spiFwd(this.net, x, y); loss -= Math.log(Math.max(1e-9, c ? p : 1 - p)); if ((p > 0.5) === !!c) ok++; } return { loss: loss / D.length, acc: ok / D.length }; },
      draw(g) {
        const { sx, sy } = spiField(g, F, (x, y) => spiFwd(this.net, x, y));
        D.forEach((s, k) => mini(g, spiPic(k), sx(s[0]), sy(s[1]), 22, s[2]));
        pill(g, `эпоха ${this.ep} · верно ${pct(this.acc)}`, X0 + 18, Y0 + 66, 44, { bg: this.acc > 0.99 ? PAL.sun : PAL.paper });
        pill(g, `нейронов: ${this.H}${this.H === 1 ? ' (забор стенда 2)' : ''}`, X1 - 18, Y1 - 26, 40, { a: 'right' });
        if (this.intro) {
          const pos = [[90, 160], [690, 160], [90, 600]];
          CALL.forEach((k, i) => { const s = D[k]; callout(g, spiPic(k), s[2] ? 1 : -1, pos[i][0], pos[i][1], 12, sx(s[0]), sy(s[1]), [[`серединка ${toB(s[0])}`, C_MID], [`лепесток ${toB(s[1])}`, C_PET]], 210); });
        }
      },
      tick() {
        if (!this.play) return;
        let r; for (let k = 0; k < 4; k++) { r = spiTrain(this.net, 0.03, D); this.ep++; }
        this.loss = r.loss; this.acc = r.acc; this.dirty = true;
        if ((this.acc >= 1 && this.loss < 0.03) || this.ep >= 8000) { this.play = false; AUDIO.chime(this.acc > 0.95); }
        if (this.ep % 40 === 0 || !this.play) this.sync();
      },
      tap() { if (this.intro) { this.intro = 0; this.sync(); return true; } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k === 'H') { this.play = false; this.reset(); } if (k !== 'intro') this.intro = 0; },
      press(k) { if (k === 'intro') { this.intro = 1; return; } this.intro = 0; if (k === 'play') this.play = !this.play; if (k === 'reset') { this.seed++; this.play = false; this.reset(); } if (k === 'quick') { this.reset(); this.quick(); } },
      controls(box) { box.innerHTML = bt('▶ учиться', 'play') + bt('заново', 'reset') + bt('что за точки', 'intro') + sl('нейронов в скрытом слое', 'H', 1, 24, 1, this.H) + '<div class="info"></div>'; wire(box, this, (k, v) => String(v)); },
      syncExtra(box) { const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ учиться'; },
      infoText() { return `эпоха ${this.ep} · ошибка <b>${f2(this.loss)}</b> · верно <b>${pct(this.acc)}</b>${this.H === 1 ? ' · один нейрон: граница прямая, как забор стенда 2' : this.H <= 3 ? ' · мало нейронов, граница гнётся слабо' : ''}`; },
    };
    m.reset(); m.quick();
    m._train = spiTrain; m._fwd = spiFwd; m._D = D;
    models.push(m);
  }

  // =========================================================================
  // 6. Переобучение: та же стопка, 70 картинок в кармане
  // =========================================================================
  {
    const D = SPI, NTR = 40, TR = SPI_SPLIT.slice(0, NTR), VA = SPI_SPLIT.slice(NTR), TRS = new Set(TR);
    const HS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32], RES = 40, EP = 3000;
    const trD = TR.map((k) => D[k]), vaD = VA.map((k) => D[k]);
    const errOf = (n, DD) => DD.filter(([x, y, c]) => (spiFwd(n, x, y) > 0.5) !== !!c).length / DD.length;
    const gridOf = (n) => { const a = new Float32Array(RES * RES); for (let i = 0; i < RES; i++) for (let j = 0; j < RES; j++) a[i * RES + j] = spiFwd(n, -SS + 2 * SS * (j + 0.5) / RES, SS - 2 * SS * (i + 0.5) / RES); return a; };
    const FB = { X0: 70, Y0: 60, X1: 930, Y1: 900 }, FM = { X0: 70, Y0: 60, X1: 500, Y1: 490 };
    const m = {
      d: 3, intro: 0, done: 0, dirty: true, nets: [], etr: [], eva: [], grids: [], all10: null,
      // учим по одной сети за кадр, чтобы телефон не замирал
      work() {
        if (!this.all10) { const n = spiNet(10, 3); for (let e = 0; e < EP; e++) spiTrain(n, 0.03, D); this.all10 = gridOf(n); return; }
        const k = this.nets.length; if (k >= HS.length) return;
        const n = spiNet(HS[k], 3); for (let e = 0; e < EP; e++) spiTrain(n, 0.03, trD);
        this.nets.push(n); this.etr.push(errOf(n, trD)); this.eva.push(errOf(n, vaD)); this.grids.push(gridOf(n));
        if (this.nets.length === HS.length) { this.best = this.eva.indexOf(Math.min(...this.eva)) + 1; if (this.wantBest) { this.d = this.best; this.wantBest = false; } this.sync && this.sync(); }
      },
      ready() { return this.nets.length === HS.length; },
      verdict() {
        const i = this.d - 1, b = this.best - 1, E = this.eva;
        if (i < b - 1 || (i < b && E[i] > 2 * E[b] + 0.02)) return ['недоучка: форму не ловит', PAL.annBlue];
        if (i > b + 1 && E[i] > 1.5 * E[b] + 0.05) return ['зубрила: учебные наизусть, новые мимо', PAL.red];
        return ['в самый раз', '#2F7A35'];
      },
      drawBig(g, mode) {
        const grid = mode === 1 && this.all10 ? (x, y, i, j) => this.all10[Math.floor(i * RES / 46) * RES + Math.floor(j * RES / 46)] : null;
        const { sx, sy } = spiField(g, FB, grid);
        D.forEach((s, k) => {
          const x = sx(s[0]), y = sy(s[1]), tr = TRS.has(k);
          if (mode === 1) { mini(g, spiPic(k), x, y, 22, s[2]); return; }
          mini(g, spiPic(k), x, y, 22, s[2], { alpha: tr ? 1 : 0.4 });
          g.lineWidth = 4; g.strokeStyle = tr ? PAL.orange : '#2F6EB5'; g.setLineDash(tr ? [] : [6, 5]); g.beginPath(); g.arc(x, y, 20, 0, TAU); g.stroke(); g.setLineDash([]);
        });
        if (mode === 1) { pill(g, 'нейронов: 10, как в конце стенда 5', FB.X1 - 18, FB.Y1 - 26, 38, { a: 'right' }); if (!this.all10) pill(g, 'сеть учится…', 500, 480, 46, { a: 'center' }); }
        else { pill(g, `учебных ${NTR}`, FB.X0 + 18, FB.Y0 + 66, 42, { border: PAL.orange, c: '#A8501A' }); pill(g, `в кармане ${D.length - NTR}`, FB.X1 - 18, FB.Y1 - 26, 42, { a: 'right', border: '#2F6EB5', c: '#2F6EB5' }); }
      },
      draw(g) {
        if (this.intro === 1 || this.intro === 2) return this.drawBig(g, this.intro);
        if (!this.ready()) { const F0 = spiField(g, FM, null, { fs: 30 }); D.forEach((q, k) => mini(g, spiPic(k), F0.sx(q[0]), F0.sy(q[1]), 13, q[2], { alpha: TRS.has(k) ? 1 : 0.45 })); pill(g, `сеть учится: ${this.nets.length} из ${HS.length}`, 285, 290, 40, { a: 'center' }); return; }
        const i = this.d - 1, G = this.grids[i];
        const { sx, sy } = spiField(g, FM, (x, y, a, b) => G[Math.floor(a * RES / 40) * RES + Math.floor(b * RES / 40)], { res: 40, fs: 30 });
        D.forEach((s, k) => {
          const x = sx(s[0]), y = sy(s[1]), tr = TRS.has(k);
          mini(g, spiPic(k), x, y, 13, s[2], { alpha: tr ? 1 : 0.45 });
          g.lineWidth = 3; g.strokeStyle = tr ? PAL.orange : '#2F6EB5'; g.setLineDash(tr ? [] : [5, 4]); g.beginPath(); g.arc(x, y, 12, 0, TAU); g.stroke(); g.setLineDash([]);
        });
        if (this.intro !== 3) {
        txt(g, `нейронов: ${HS[i]}`, 540, 110, 46, { w: 700 });
        txt(g, 'ошибок на учебных', 540, 190, 34, { w: 700, c: '#A8501A' }); txt(g, pct(this.etr[i]), 540, 250, 58, { w: 700, c: '#A8501A', serif: true });
        txt(g, 'ошибок на кармане', 540, 320, 34, { w: 700, c: '#2F6EB5' }); txt(g, pct(this.eva[i]), 540, 380, 58, { w: 700, c: '#2F6EB5', serif: true });
        const [vt, vc] = this.verdict(); const parts = vt.split(': ');
        txt(g, parts[0], 540, 450, 42, { w: 700, c: vc, maxW: 440 }); if (parts[1]) txt(g, parts[1], 540, 495, 30, { c: vc, maxW: 440 });
        }
        // ошибки против сложности
        const B0 = 110, B1 = 930, C0 = 620, C1 = 880, CAP = 0.5, bx = (d) => B0 + (B1 - B0) * (d - 1) / (HS.length - 1), by = (e) => C1 - (C1 - C0) * Math.min(e, CAP) / CAP;
        quickStroke(g, [[B0, C0 - 10], [B0, C1], [B1, C1]], 3, PAL.ink);
        txt(g, '50%', B0 - 10, C0 + 10, 28, { a: 'right', c: PAL.inkSoft }); txt(g, '0', B0 - 10, C1 + 8, 28, { a: 'right', c: PAL.inkSoft });
        quickStroke(g, [[bx(this.d), C0 - 10], [bx(this.d), C1]], 4, PAL.inkFaint, 1, [10, 8]);
        inkStroke(g, this.etr.map((e, k) => [bx(k + 1), by(e)]), 6, PAL.orange, { seed: 2, double: false });
        inkStroke(g, this.eva.map((e, k) => [bx(k + 1), by(e)]), 6, '#2F6EB5', { seed: 4, double: false });
        for (const [arr, cl] of [[this.etr, PAL.orange], [this.eva, '#2F6EB5']]) { const e = arr[i]; g.fillStyle = cl; g.beginPath(); g.arc(bx(this.d), by(e), 13, 0, TAU); g.fill(); }
        HS.forEach((h, k) => txt(g, String(h), bx(k + 1), C1 + 36, 28, { a: 'center', c: PAL.inkSoft }));
        txt(g, 'на учебных', B1, C1 - 18, 32, { a: 'right', w: 700, c: PAL.orange });
        txt(g, 'на кармане', B1, C0 + 26, 32, { a: 'right', w: 700, c: '#2F6EB5' });
        txt(g, 'нейронов в слое →', B1, C1 + 84, 36, { a: 'right', c: PAL.inkSoft });
        if (this.intro === 3) { const k = VA[5], s = D[k]; callout(g, spiPic(k), s[2] ? 1 : -1, 560, 120, 12, sx(s[0]), sy(s[1]), [['картинка из кармана', '#2F6EB5'], ['8×8, 64 числа', PAL.ink]], 300); }
      },
      tick() { if (!this.ready()) { const t0 = performance.now(); do this.work(); while (!this.ready() && performance.now() - t0 < 120); this.dirty = true; } },
      tap() { if (this.intro) { this.intro = 0; this.sync(); return true; } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k === 'd') { this.intro = 0; this.wantBest = false; AUDIO.pluck((v - 5) / 5); } },
      press(k) { this.intro = 0; if (k === 'best') { if (this.best) this.d = this.best; else this.wantBest = true; } if (k === 'pocket') this.intro = 2; },
      controls(box) { box.innerHTML = sl('нейронов в слое', 'd', 1, HS.length, 1, this.d) + bt('лучшая сложность', 'best') + bt('что в кармане', 'pocket') + '<div class="info"></div>'; wire(box, this, (k, v) => String(HS[v - 1])); },
      infoText() {
        if (!this.ready()) return `сеть учится на 40 учебных картинках: ${this.nets.length} из ${HS.length} вариантов готово`;
        const i = this.d - 1;
        return `<span style="color:#C25A1A">●</span> учебные картинки, <span style="color:#2F6EB5">○</span> картинки из кармана · ошибок: на учебных <b>${pct(this.etr[i])}</b>, на кармане <b>${pct(this.eva[i])}</b>`;
      },
    };
    m.best = 0;
    m._HS = HS;
    models.push(m);
  }

  // =========================================================================
  // 7. Свёртка: окошко 3×3 ездит по тем же 64 числам ромашки
  // =========================================================================
  const KS = {
    'стоячие края': [[1, 0, -1], [1, 0, -1], [1, 0, -1]],
    'лежачие края': [[1, 1, 1], [0, 0, 0], [-1, -1, -1]],
    'размытие': [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    'резкость': [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
  };
  const conv8 = (img, k) => { const out = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += k[a][b] * img[(i + a) * 8 + j + b]; out.push(s); } return out; };
  const sgn = (v) => String(v).replace('-', '−');
  function drawMap(g, out, x0, y0, c, o = {}) {
    const mx = Math.max(1, ...out.map(Math.abs));
    for (let p = 0; p < 36; p++) {
      const i = Math.floor(p / 6), j = p % 6, x = x0 + j * c, y = y0 + i * c;
      if (o.shown === undefined || p <= o.shown) { g.fillStyle = css(valRGB((o.relu ? Math.max(0, out[p]) : out[p]) / mx)); g.fillRect(x, y, c, c); if (o.nums) txt(g, sgn(out[p]), x + c / 2, y + c / 2 + 1, o.nums, { a: 'center', b: 'middle', w: 700, maxW: c - 4 }); }
      else { g.fillStyle = 'rgba(226,209,176,0.5)'; g.fillRect(x, y, c, c); }
      g.strokeStyle = rgba(PAL.inkFaint, 0.6); g.lineWidth = 1.5; g.strokeRect(x, y, c, c);
    }
    inkRect(g, x0, y0, 6 * c, 6 * c, 4, PAL.ink, 4);
  }
  const DAISY64 = pix8('ромашка');
  {
    const IX = 30, IY = 110, C = 62, OX = 590, OY = 170, OC = 62;
    const m = {
      img: DAISY64.slice(), kn: 'стоячие края', pos: 0, shown: 0, play: true, t: 0, intro: 0, dirty: true,
      conv() { return conv8(this.img, KS[this.kn]); },
      draw(g) {
        const out = this.conv(), k = KS[this.kn], pi = Math.floor(this.pos / 6), pj = this.pos % 6;
        txt(g, 'ромашка со стенда 1: те же 64 числа', IX, IY - 24, 38, { w: 700, maxW: 940 });
        drawVals(g, this.img, IX, IY, C, { grid: true, nums: 24, fw: 5 });
        g.fillStyle = 'rgba(241,191,74,0.30)'; g.fillRect(IX + pj * C, IY + pi * C, 3 * C, 3 * C);
        g.lineWidth = 9; g.strokeStyle = PAL.orange; g.strokeRect(IX + pj * C, IY + pi * C, 3 * C, 3 * C);
        if (this.intro) {
          // стенд 2: у каждого из 64 чисел был свой вес
          const WX = 590, WY = 150, WC = 46;
          txt(g, 'стенд 2: 64 веса', WX, WY - 22, 36, { w: 700 });
          for (let p = 0; p < 64; p++) { const i = p >> 3, j = p & 7, x = WX + j * WC, y = WY + i * WC; g.fillStyle = W64[p] ? '#F6D77A' : '#F3EBDA'; g.fillRect(x, y, WC, WC); g.strokeStyle = rgba(PAL.inkFaint, 0.55); g.lineWidth = 1.2; g.strokeRect(x, y, WC, WC); txt(g, String(W64[p]), x + WC / 2, y + WC / 2 + 1, 22, { a: 'center', b: 'middle', w: 700, c: W64[p] ? PAL.ink : PAL.inkFaint }); }
          g.lineWidth = 4; g.strokeStyle = PAL.ink; g.strokeRect(WX, WY, WC * 8, WC * 8);
          txt(g, 'сейчас: 9 весов', WX, 570, 36, { w: 700, c: '#A8501A' });
        } else {
          txt(g, 'новая грядка (6×6)', OX, OY - 22, 36, { w: 700 });
          drawMap(g, out, OX, OY, OC, { shown: this.shown, nums: 20 });
          g.lineWidth = 7; g.strokeStyle = PAL.orange; g.strokeRect(OX + pj * OC, OY + pi * OC, OC, OC);
          quickStroke(g, [[IX + (pj + 3) * C, IY + (pi + 1.5) * C], [OX + pj * OC, OY + (pi + 0.5) * OC]], 4, PAL.orange, 0.8, [10, 8]);
        }
        // счёт: ядро × клетки под окошком, по рядам
        const KY = 690, KC = 60, KX = 30, PX = 260;
        txt(g, 'ядро: 9 весов', KX, KY - 22, 32, { w: 700, maxW: 220 });
        txt(g, 'под окошком', PX, KY - 22, 32, { w: 700 });
        let s = 0; const rows = [];
        for (let a = 0; a < 3; a++) {
          const pr = [];
          for (let b = 0; b < 3; b++) {
            const v = k[a][b], pv = this.img[(pi + a) * 8 + pj + b]; s += v * pv; pr.push(v * pv);
            g.fillStyle = css(valRGB(v / 5 * 1.6)); g.fillRect(KX + b * KC, KY + a * KC, KC, KC); g.strokeStyle = PAL.ink; g.lineWidth = 2; g.strokeRect(KX + b * KC, KY + a * KC, KC, KC);
            txt(g, sgn(v), KX + b * KC + KC / 2, KY + a * KC + KC / 2 + 2, 36, { a: 'center', b: 'middle', w: 700 });
            g.fillStyle = `rgb(${pv},${pv},${pv})`; g.fillRect(PX + b * KC, KY + a * KC, KC, KC); g.strokeStyle = PAL.ink; g.strokeRect(PX + b * KC, KY + a * KC, KC, KC);
            txt(g, String(pv), PX + b * KC + KC / 2, KY + a * KC + KC / 2 + 2, 24, { a: 'center', b: 'middle', w: 700, c: pv < 125 ? '#F4EBDD' : PAL.ink });
          }
          rows.push(pr);
        }
        txt(g, '×', 225, KY + 105, 50, { a: 'center', w: 700 });
        rows.forEach((pr, a) => { const rs = pr.reduce((x, y) => x + y, 0); txt(g, `ряд ${a + 1}: ${pr.map((x, q) => (q ? (x < 0 ? ' − ' + -x : ' + ' + x) : sgn(x))).join('')} = ${sgn(rs)}`, 460, KY + 26 + a * 56, 30, { w: 600, maxW: 520 }); });
        txt(g, `сумма: ${sgn(s)}`, 460, KY + 230, 50, { w: 700, serif: true, c: s > 0 ? '#B5541C' : s < 0 ? '#2F6EB5' : PAL.ink });
      },
      tick(dt) { if (!this.play || this.intro) return; this.t += dt; if (this.t < 0.55) return; this.t = 0; this.pos = (this.pos + 1) % 36; if (this.pos === 0) this.shown = 0; this.shown = Math.max(this.shown, this.pos); AUDIO.pluck(clamp(this.conv()[this.pos] / 500, -1, 1)); this.sync(); },
      tap(x, y) { if (this.intro) { this.intro = 0; this.sync(); return true; } const j = Math.floor((x - IX) / C), i = Math.floor((y - IY) / C); if (i < 0 || j < 0 || i > 7 || j > 7) return false; const p = i * 8 + j; this.img[p] = this.img[p] > 136 ? 40 : 232; AUDIO.pluck(this.img[p] > 136 ? 0.5 : -0.5); this.sync(); return true; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k !== 'intro') this.intro = 0; },
      press(k) { if (k === 'intro') { this.intro = 1; return; } this.intro = 0; if (k.startsWith('k:')) { this.kn = k.slice(2); this.shown = this.pos; } if (k === 'play') this.play = !this.play; if (k === 'all') { this.shown = 35; this.play = false; } if (k === 'img') this.img = DAISY64.slice(); },
      controls(box) {
        box.innerHTML = Object.keys(KS).map((n) => bt(n, 'k:' + n)).join('') + bt('❚❚ пауза', 'play') + bt('всё сразу', 'all') + bt('вернуть ромашку', 'img') +
          '<a class="btn big" href="../cnn-sad/">полный сад свёрточной сети →</a><div class="info"></div>';
        wire(box, this, () => '');
      },
      syncExtra(box) { box.querySelectorAll('[data-b^="k:"]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'k:' + this.kn)); const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ ползти'; },
      infoText() { const pi = Math.floor(this.pos / 6), pj = this.pos % 6; return `окошко на месте ${pi + 1}·${pj + 1}, сумма <b>${sgn(this.conv()[this.pos])}</b> · ткни клетку ромашки, она станет фоном или лепестком`; },
    };
    models.push(m);
  }

  // =========================================================================
  // 8. Что видит сеть изнутри: окошки и «куда смотрел нейрон стенда 2»
  // =========================================================================
  {
    const FILT = [
      { name: 'стоячие края', k: KS['стоячие края'] }, { name: 'лежачие края', k: KS['лежачие края'] },
      { name: 'косые края /', k: [[0, 1, 1], [-1, 0, 1], [-1, -1, 0]] }, { name: 'косые края \\', k: [[1, 1, 0], [1, 0, -1], [0, -1, -1]] },
      { name: 'светлая точка', k: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]] }, { name: 'тёмная точка', k: [[1, 1, 1], [1, -8, 1], [1, 1, 1]] },
      { name: 'размытие', k: KS['размытие'] }, { name: 'резкость', k: KS['резкость'] },
    ];
    const TS = 180, GX = 60, GY = 70, GAP = 50, PXX = 40, PY = 560, PC = 50, MX = 560, MC = 66;
    // «куда смотрел нейрон»: кладём тёмный квадрат 3×3 (яркость фона 40) и смотрим, на сколько упала сумма нейрона стенда 2
    const OCC = 40;
    const covered = (v, p) => { const ci = p >> 3, cj = p & 7, u = v.slice(); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const i = ci + a, j = cj + b; if (i >= 0 && j >= 0 && i < 8 && j < 8) u[i * 8 + j] = OCC; } return u; };
    const drop = (v, p) => sum64(v) - sum64(covered(v, p));
    const m = {
      mode: 'maps', sel: 0, cell: CC, dirty: true,
      draw(g) {
        const v = DAISY64;
        if (this.mode === 'maps') {
          txt(g, 'грядки стенда 7 для ромашки', 500, 70, 46, { a: 'center', serif: true, w: 700 });
          Object.keys(KS).forEach((n, q) => { const x = 60 + (q % 2) * 470, y = 150 + Math.floor(q / 2) * 420; txt(g, n, x, y - 16, 36, { w: 700 }); drawMap(g, conv8(v, KS[n]), x, y, 58, { nums: 19 }); });
          txt(g, 'у каждого окошка своя грядка', 500, 975, 36, { a: 'center', c: PAL.inkSoft });
          return;
        }
        // окошки-фильтры
        FILT.forEach((f, i) => {
          const x0 = GX + (i % 4) * (TS + GAP), y0 = GY + Math.floor(i / 4) * (TS + GAP + 20), c = TS / 3, mx = Math.max(...f.k.flat().map(Math.abs));
          for (let q = 0; q < 9; q++) { const w = f.k[Math.floor(q / 3)][q % 3] / mx, l = 0.5 + 0.46 * w; g.fillStyle = css([l, l, l]); g.fillRect(x0 + (q % 3) * c, y0 + Math.floor(q / 3) * c, c + 0.5, c + 0.5); }
          const on = this.mode === 'filter' && i === this.sel;
          g.lineWidth = on ? 10 : 3; g.strokeStyle = on ? PAL.orange : PAL.ink; g.strokeRect(x0, y0, TS, TS);
          g.fillStyle = 'rgba(46,42,34,0.85)'; g.beginPath(); g.arc(x0 + 26, y0 + 26, 21, 0, TAU); g.fill(); txt(g, String(i + 1), x0 + 26, y0 + 38, 32, { a: 'center', w: 700, c: '#FBF6EA' });
        });
        if (this.mode === 'filter') txt(g, 'ромашка, 64 числа', PXX, PY - 16, 34, { w: 700 });
        if (this.mode === 'filter') {
          drawVals(g, v, PXX, PY, PC, { grid: true, fw: 5 });
          const out = conv8(v, FILT[this.sel].k);
          g.fillStyle = 'rgba(46,42,34,0.85)'; g.fillRect(MX, PY, 8 * PC, 8 * PC); inkRect(g, MX, PY, 8 * PC, 8 * PC, 4, PAL.ink, 5);
          drawMap(g, out, MX + PC, PY + PC, PC, { relu: true });
          txt(g, `где горит окошко ${this.sel + 1}`, MX, PY - 16, 34, { w: 700, maxW: 420 });
        } else {
          const u = covered(v, this.cell), ci = this.cell >> 3, cj = this.cell & 7;
          drawVals(g, u, PXX, PY, PC, { grid: true, fw: 5 });
          g.lineWidth = 6; g.strokeStyle = PAL.orange; g.strokeRect(PXX + (cj - 1) * PC, PY + (ci - 1) * PC, 3 * PC, 3 * PC);
          const dr = []; for (let p = 0; p < 64; p++) dr.push(drop(v, p)); const mx = Math.max(...dr);
          for (let p = 0; p < 64; p++) { const i = p >> 3, j = p & 7, t = dr[p] / mx; g.fillStyle = css(mixc([0.18, 0.12, 0.1], [1, 0.9, 0.55], t)); g.fillRect(MX + j * PC, PY + i * PC, PC, PC); }
          g.lineWidth = 6; g.strokeStyle = PAL.orange; g.strokeRect(MX + cj * PC, PY + ci * PC, PC, PC); inkRect(g, MX, PY, 8 * PC, 8 * PC, 4, PAL.ink, 5);
          txt(g, 'куда смотрел нейрон', MX, PY - 16, 34, { w: 700, maxW: 420 });
          const s0 = sum64(v), s1 = sum64(u);
          txt(g, `сумма ${big(s0)} → ${big(s1)}`, PXX, PY - 16, 34, { w: 700, c: s1 > TH64 ? PAL.ink : PAL.red, maxW: 440 });
        }
      },
      tick() {},
      tap(x, y) {
        if (this.mode === 'maps') { this.mode = 'filter'; this.sync(); return true; }
        for (let i = 0; i < 8; i++) { const x0 = GX + (i % 4) * (TS + GAP), y0 = GY + Math.floor(i / 4) * (TS + GAP + 20); if (x >= x0 && x <= x0 + TS && y >= y0 && y <= y0 + TS) { this.sel = i; this.mode = 'filter'; AUDIO.pluck(i / 4 - 1); this.sync(); return true; } }
        const j = Math.floor((x - PXX) / PC), i = Math.floor((y - PY) / PC);
        if (i >= 0 && j >= 0 && i < 8 && j < 8) { this.cell = i * 8 + j; this.mode = 'occ'; AUDIO.pluck(-0.3); this.sync(); return true; }
        return false;
      },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k.startsWith('f:')) { this.sel = +k.slice(2); this.mode = 'filter'; } if (k === 'occ') this.mode = 'occ'; if (k === 'maps') this.mode = 'maps'; },
      controls(box) { box.innerHTML = bt('грядки стенда 7', 'maps') + FILT.map((f, i) => bt(String(i + 1), 'f:' + i)).join('') + bt('куда смотрел нейрон', 'occ') + '<div class="info"></div>'; wire(box, this, () => ''); },
      syncExtra(box) { box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', this.mode === 'filter' ? b.dataset.b === 'f:' + this.sel : b.dataset.b === this.mode)); },
      infoText() {
        if (this.mode === 'maps') return 'четыре окошка стенда 7 проехали по ромашке, у каждого своя грядка · ткни доску';
        if (this.mode === 'filter') return `окошко ${this.sel + 1}: <b>${FILT[this.sel].name}</b>. Справа его грядка, светлое и рыжее: здесь оно сработало сильнее всего`;
        const ci = this.cell >> 3, cj = this.cell & 7;
        return `тёмный квадрат на клетке ${ci + 1}·${cj + 1}: сумма нейрона стенда 2 упала на <b>${big(drop(DAISY64, this.cell))}</b> · ткни другую клетку ромашки`;
      },
    };
    m._drop = drop;
    models.push(m);
  }
  // =========================================================================
  // 9. Слова как векторы
  // =========================================================================
  // числа слов стенда 9 нужны и стенду 10: та же «ромашка», те же 11 чисел
  const GRAF = ['власть', 'женское', 'взрослый', 'человек', 'зверь', 'растение', 'белое', 'синее', 'красное', 'луговое', 'садовое'];
  let WORDV = null;
  function drawWordCol(g, w, x, y, o = {}) {
    const v = WORDV[w], rh = o.rh || 56;
    pill(g, w, x + 150, y, 46, { a: 'center', bg: '#FFE9A8' });
    GRAF.forEach((n, k) => { const yy = y + 80 + k * rh, on = Math.abs(v[k]) > 0.5; txt(g, n, x + 170, yy, 32, { a: 'right', c: on ? PAL.ink : PAL.inkFaint, w: on ? 700 : 600 }); txt(g, f2(v[k]), x + 190, yy, 34, { w: 700, c: on ? '#A8321F' : PAL.inkFaint }); });
  }
  {
    // 11 граф: власть, женское, взрослый, человек, зверь, растение, белое, синее, красное, луговое, садовое
    const RAW = {
      'король': [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0], 'королева': [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      'мужчина': [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0], 'женщина': [0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      'ромашка': [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0], 'василёк': [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0],
      'колокольчик': [0, 0, 0, 0, 0, 1, 0, 0.6, 0, 0.8, 0.3], 'мак': [0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0],
      'роза': [0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1], 'тюльпан': [0, 0, 0, 0, 0, 1, 0, 0, 0.6, 0, 1],
      'снег': [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], 'небо': [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      'луг': [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'сад': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      'кот': [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0], 'собака': [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0.2],
    };
    const R = mulberry(31), WORDS = Object.keys(RAW), V = {};
    for (const w of WORDS) V[w] = RAW[w].map((x) => x + (R() - 0.5) * 0.12);
    WORDV = V;
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), norm = (a) => Math.sqrt(dot(a, a)), cos = (a, b) => dot(a, b) / (norm(a) * norm(b) + 1e-9);
    // карта: 11 чисел слова рисуем на плоскости одной и той же линейной проекцией,
    // поэтому сложение и вычитание векторов видно на карте стрелками
    //           власть жен взр  чел  зверь раст  бел  син  крас луг  сад
    const PX = [0, 1.0, -0.3, -3.2, -3.0, 2.0, 0, 0, 1.6, -0.4, 0.8];
    const PY = [1.6, 0, -0.2, 1.2, -2.0, 0, 2.4, -2.4, 0.2, 0.4, -0.4];
    const proj = (vec) => [dot(vec, PX), dot(vec, PY)];
    const P2 = {}; for (const w of WORDS) P2[w] = proj(V[w]);
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; for (const w of WORDS) { mnx = Math.min(mnx, P2[w][0]); mxx = Math.max(mxx, P2[w][0]); mny = Math.min(mny, P2[w][1]); mxy = Math.max(mxy, P2[w][1]); }
    { const t = mny; mny = -mxy; mxy = -t; }
    const MX0 = 90, MX1 = 830, MY0 = 80, MY1 = 620;
    const sx = (v) => MX0 + (MX1 - MX0) * (v - mnx) / (mxx - mnx), sy = (v) => MY0 + (MY1 - MY0) * (-v - mny) / (mxy - mny);
    // label placement: start right of the star, push overlapping labels apart
    const LAB = {};
    {
      const c = mkCanvas(8, 8).getContext('2d'); c.font = `600 42px ${SANS}`;
      const L = WORDS.map((w) => ({ w, px: sx(P2[w][0]), py: sy(P2[w][1]), wd: c.measureText(w).width + 12, h: 48 }));
      L.forEach((l) => { l.x = l.px - l.wd / 2; l.y = l.py + 16; });
      for (let it = 0; it < 300; it++) {
        for (const a of L) for (const b of L) {
          if (a === b) continue;
          const ox = Math.min(a.x + a.wd, b.x + b.wd) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 0 && oy > 0) { if (oy < ox) { const s = a.y < b.y ? -1 : 1; a.y += s * oy * 0.3; } else { const s = a.x < b.x ? -1 : 1; a.x += s * ox * 0.3; } }
        }
        for (const a of L) { a.x = clamp(a.x, 30, 970 - a.wd); a.y = clamp(a.y, 40, 650); a.x += (a.px - a.wd / 2 - a.x) * 0.02; a.y += (a.py + 16 - a.y) * 0.02; }
      }
      L.forEach((l) => (LAB[l.w] = l));
    }
    const EQ = [['ромашка', 'снег', 'небо'], ['мак', 'луг', 'сад'], ['василёк', 'небо', 'снег'], ['король', 'мужчина', 'женщина']];
    const R2 = mulberry(77), stars = []; for (let i = 0; i < 160; i++) stars.push([R2() * 1000, R2() * 1000, R2()]);
    const m = {
      eq: 0, sel: '', t: 0, intro: 0, dirty: true,
      drawIntro(g) {
        txt(g, 'и картинку, и слово превращаем в числа', 500, 70, 42, { a: 'center', serif: true, w: 700, maxW: 940 });
        txt(g, 'стенд 1: картинка', 50, 150, 32, { w: 700, maxW: 300 });
        drawVals(g, DAISY64, 60, 180, 26, { frame: F_DAISY, fw: 5 });
        arrow(g, 164, 400, 164, 450, 6, PAL.orange, 24);
        DAISY64.slice(0, 6).forEach((n, k) => txt(g, String(n), 164, 500 + k * 52, 36, { a: 'center', w: 700 }));
        txt(g, '…', 164, 800, 40, { a: 'center', w: 700 }); txt(g, 'всего 64 числа', 164, 860, 32, { a: 'center', c: PAL.inkSoft });
        quickStroke(g, [[330, 130], [330, 960]], 3, rgba(PAL.inkFaint, 0.6), 1, [10, 10]);
        txt(g, 'стенд 9: слово', 380, 150, 36, { w: 700 });
        arrow(g, 530, 240, 530, 268, 5, PAL.orange, 20);
        drawWordCol(g, 'ромашка', 380, 210, { rh: 62 });
        txt(g, '11 чисел, по одному на графу', 380, 975, 32, { c: PAL.inkSoft, maxW: 600 });
      },
      calc() {
        const [a, b, c] = EQ[this.eq], v = V[a].map((x, i) => x - V[b][i] + V[c][i]);
        const ranked = WORDS.filter((w) => w !== a && w !== b && w !== c).map((w) => [w, cos(v, V[w])]).sort((p, q) => q[1] - p[1]);
        return { a, b, c, v, best: ranked[0] };
      },
      near(w) { return WORDS.filter((x) => x !== w).map((x) => [x, cos(V[w], V[x])]).sort((p, q) => q[1] - p[1]).slice(0, 3); },
      draw(g) {
        if (this.intro) return this.drawIntro(g);
        g.fillStyle = '#1B2245'; g.fillRect(16, 16, 968, 968);
        for (const [x, y, s] of stars) { g.fillStyle = `rgba(255,246,220,${0.2 + 0.5 * s * (0.6 + 0.4 * Math.sin(this.t * (1 + s * 2) + s * 30))})`; g.beginPath(); g.arc(x, y, 1 + s * 2, 0, TAU); g.fill(); }
        const E = this.calc(), pa = P2[E.a], pb = P2[E.b], pc = P2[E.c], pr = proj(E.v);
        const A = [sx(pa[0]), sy(pa[1])];
        const end = [sx(pr[0]), sy(pr[1])];
        // стрелка «− второе слово + третье», приставленная к первому слову
        const dvx = sx(pc[0]) - sx(pb[0]), dvy = sy(pc[1]) - sy(pb[1]);
        arrow(g, sx(pb[0]), sy(pb[1]), sx(pc[0]), sy(pc[1]), 4, 'rgba(156,194,234,0.8)', 20);
        arrow(g, A[0], A[1], A[0] + dvx, A[1] + dvy, 6, PAL.sun, 26);
        // words
        for (const w of WORDS) {
          const x = sx(P2[w][0]), y = sy(P2[w][1]), on = w === E.a || w === E.b || w === E.c || w === E.best[0] || w === this.sel;
          g.fillStyle = on ? '#FFE9A8' : '#FFF6DC'; g.beginPath(); g.arc(x, y, on ? 11 : 7, 0, TAU); g.fill();
          const l = LAB[w];
          if (Math.hypot(l.x + l.wd / 2 - x, l.y - y) > 40) quickStroke(g, [[x, y], [l.x + l.wd / 2, l.y + 6]], 1.5, 'rgba(255,246,220,0.4)');
          txt(g, w, l.x + 6, l.y + 38, 42, { c: on ? '#FFE08A' : '#EDE6F7', w: on ? 700 : 600 });
        }
        if (this.sel) for (const [w, s] of this.near(this.sel)) { quickStroke(g, [[sx(P2[this.sel][0]), sy(P2[this.sel][1])], [sx(P2[w][0]), sy(P2[w][1])]], 3 + 6 * Math.max(0, s), 'rgba(241,191,74,0.75)'); }
        g.fillStyle = '#FFD25A'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 9 : 22; g.lineTo(end[0] + Math.cos(a) * r, end[1] + Math.sin(a) * r); } g.closePath(); g.fill();
        // the equation
        g.fillStyle = 'rgba(239,227,201,0.96)'; rr(g, 40, 730, 920, 230, 22); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; rr(g, 40, 730, 920, 230, 22); g.stroke();
        txt(g, `${E.a} − ${E.b} + ${E.c}`, 500, 810, 50, { a: 'center', w: 700, maxW: 880 });
        txt(g, `≈ ${E.best[0]}`, 500, 885, 64, { a: 'center', w: 700, serif: true, c: '#A8321F' });
        txt(g, `сходство ${f2(E.best[1])}`, 500, 940, 38, { a: 'center', c: PAL.inkSoft });
      },
      tick(dt) { this.t += dt; this.dirty = true; },
      tap(x, y) { if (this.intro) { this.intro = 0; this.sync(); return true; } let b = '', bd = 60; for (const w of WORDS) { const l = LAB[w]; const d = Math.min(Math.hypot(sx(P2[w][0]) - x, sy(P2[w][1]) - y), x > l.x && x < l.x + l.wd && y > l.y && y < l.y + l.h ? 0 : 1e9); if (d < bd) { bd = d; b = w; } } if (!b) return false; this.sel = b; AUDIO.pluck(0.4); this.sync(); return true; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k !== 'intro') this.intro = 0; },
      press(k) { if (k === 'intro') { this.intro = 1; return; } this.intro = 0; if (k.startsWith('eq:')) { this.eq = +k.slice(3); AUDIO.chime(true); } },
      controls(box) { box.innerHTML = EQ.map((e, i) => bt(`${e[0]} − ${e[1]} + ${e[2]}`, 'eq:' + i)).join('') + bt('слово → числа', 'intro') + '<div class="info"></div>'; wire(box, this, () => ''); },
      syncExtra(box) { box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'eq:' + this.eq)); },
      infoText() { if (this.intro) return 'слева 64 числа картинки со стенда 1, справа 11 чисел слова «ромашка» · ткни доску, покажу небо слов'; if (!this.sel) return 'у каждого слова 11 чисел (растение, белое, синее, луговое, власть…). Карта рисует их на плоскости. Ткни слово'; return `ближе всего к «${this.sel}»: ` + this.near(this.sel).map(([w, s]) => `${w} <b>${f2(s)}</b>`).join(', '); },
    };
    m._calc = () => m.calc();
    models.push(m);
  }

  // =========================================================================
  // 10. Внимание: слова-фонари и нити
  // =========================================================================
  {
    // ключи (k) и вопросы (q) в 4 числах: [живое (растёт и вянет), предмет, действие, служебное]
    const K4 = { 'ромашка': [3, 0, 0.3, 0], 'стояла': [0.3, 0, 2.5, 0], 'в': [0, 0, 0, 1.5], 'вазе': [0, 3, 0, 0], 'и': [0, 0, 0, 1.5], 'она': [0, 0, 0, 0.8], 'завяла': [0.5, 0, 1.6, 0], 'разбилась': [0, 0.5, 1.6, 0] };
    const Q4 = { 'ромашка': [0, 0, 2.2, 0], 'стояла': [1.6, 1.4, 0, 0], 'в': [0, 2.2, 0, 0], 'вазе': [0, 0, 1.6, 0.6], 'и': [0, 0, 1.6, 0.6], 'завяла': [2.0, 0, 0, 0], 'разбилась': [0, 2.0, 0, 0] };
    // ключ и вопрос «ромашки» сеть делает из её 11 чисел стенда 9: живое = 3 × растение, действие = 0,3 × луговое; вопрос: действие = 2,2 × растение
    const RV = WORDV['ромашка'];
    K4['ромашка'] = [3 * RV[5], 0, 0.3 * RV[9], 0]; Q4['ромашка'] = [0, 0, 2.2 * RV[5], 0];
    const ABOUT = { 'завяла': [1, 0, 0, 0], 'разбилась': [0, 1, 0, 0] }; // о ком обычно бывает это слово
    const SEL = 5, OTHER = (e) => (e === 'завяла' ? 'разбилась' : 'завяла');
    const m = {
      end: 'завяла', sel: SEL, t: 0, intro: 0, dirty: true,
      drawIntro(g) {
        txt(g, 'те же 11 чисел «ромашки» со стенда 9', 500, 64, 40, { a: 'center', serif: true, w: 700, maxW: 940 });
        drawWordCol(g, 'ромашка', 20, 140, { rh: 60 });
        arrow(g, 400, 470, 470, 470, 7, PAL.orange, 28);
        txt(g, '× веса', 435, 430, 34, { a: 'center', w: 700, c: '#A8501A' });
        const NM = ['живое', 'предмет', 'действие', 'служебное'];
        const box = (title, v, y) => { txt(g, title, 500, y, 40, { w: 700 }); NM.forEach((n, k) => { const yy = y + 56 + k * 52; txt(g, n, 700, yy, 32, { a: 'right', c: PAL.inkSoft }); txt(g, f2(v[k]), 720, yy, 36, { w: 700, c: '#A8321F' }); }); };
        box('ключ: кто я', K4['ромашка'], 220); box('вопрос: кого ищу', Q4['ромашка'], 560);
        txt(g, 'живое = 3 × растение', 500, 880, 30, { c: PAL.inkSoft }); txt(g, 'у других слов фразы так же', 500, 930, 30, { c: PAL.inkSoft });
      },
      words() { return ['ромашка', 'стояла', 'в', 'вазе', 'и', 'она', this.end]; },
      query(w) { if (w === 'она') return ABOUT[this.end].map((x) => x * 2.2); return Q4[w]; },
      att(i) { const W = this.words(), q = this.query(W[i]); const sc = W.map((w) => K4[w].reduce((s, k, j) => s + k * q[j], 0) / 2); return { sc, p: softmax(sc) }; },
      pos() { const W = this.words(), out = []; const r1 = W.slice(0, 4), r2 = W.slice(4); const c = mkCanvas(8, 8).getContext('2d'); c.font = `700 52px ${SANS}`;
        for (const [row, y, off] of [[r1, 300, 0], [r2, 720, 4]]) { const ws = row.map((w) => c.measureText(w).width + 60), tot = ws.reduce((a, b) => a + b, 0) + (row.length - 1) * 30; let x = 500 - tot / 2; row.forEach((w, k) => { out[off + k] = [x + ws[k] / 2, y, ws[k]]; x += ws[k] + 30; }); }
        return out; },
      draw(g) {
        if (this.intro) return this.drawIntro(g);
        g.fillStyle = '#2F2748'; g.fillRect(16, 16, 968, 968);
        const W = this.words(), P = this.pos(), { p, sc } = this.att(this.sel), src = P[this.sel];
        // threads
        W.forEach((w, j) => {
          if (j === this.sel) return;
          const d = P[j], th = 2 + 46 * p[j], up = src[1] === d[1] ? -150 - Math.abs(d[0] - src[0]) * 0.15 : 0;
          const cx = (src[0] + d[0]) / 2, cy = (src[1] + d[1]) / 2 + up;
          g.save(); g.lineCap = 'round'; g.strokeStyle = `rgba(255,200,110,${0.25 + 0.75 * Math.min(1, p[j] * 2.5)})`; g.lineWidth = th;
          g.beginPath(); g.moveTo(src[0], src[1] + (src[1] < d[1] ? 40 : src[1] > d[1] ? -40 : -40)); g.quadraticCurveTo(cx, cy, d[0], d[1] + (src[1] < d[1] ? -40 : src[1] > d[1] ? 40 : -40)); g.stroke(); g.restore();
        });
        // lanterns
        W.forEach((w, j) => {
          const [x, y, wd] = P[j], glow = j === this.sel ? 1 : Math.min(1, p[j] * 2.2);
          const gr = g.createRadialGradient(x, y, 10, x, y, 150); gr.addColorStop(0, `rgba(255,214,140,${0.55 * glow})`); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.fillRect(x - 160, y - 160, 320, 320);
          g.fillStyle = j === this.sel ? '#FFD98A' : css(mixc([0.42, 0.36, 0.55], [1, 0.85, 0.54], glow));
          rr(g, x - wd / 2, y - 42, wd, 84, 26); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; rr(g, x - wd / 2, y - 42, wd, 84, 26); g.stroke();
          txt(g, w, x, y + 3, 52, { a: 'center', b: 'middle', w: 700, c: glow > 0.35 ? PAL.ink : '#FBF6EA' });
          if (j !== this.sel) pill(g, pct(p[j]), x, y + 100, 36, { a: 'center', bg: '#2F2748', alpha: 0.9, border: p[j] > 0.15 ? '#FFD98A' : 'rgba(251,246,234,0.35)', c: p[j] > 0.15 ? '#FFD98A' : 'rgba(251,246,234,0.75)' });
        });
        let best = -1; p.forEach((v, j) => { if (j !== this.sel && (best < 0 || v > p[best])) best = j; });
        g.fillStyle = 'rgba(239,227,201,0.95)'; rr(g, 40, 850, 920, 115, 20); g.fill();
        txt(g, `«${W[this.sel]}» смотрит на «${W[best]}»: ${pct(p[best])}`, 500, 925, 46, { a: 'center', w: 700, maxW: 890 });
        void sc;
      },
      tick(dt) { this.t += dt; },
      tap(x, y) { if (this.intro) { this.intro = 0; this.sync(); return true; } const P = this.pos(); let b = -1; P.forEach(([px, py, wd], j) => { if (Math.abs(x - px) < wd / 2 + 10 && Math.abs(y - py) < 60) b = j; }); if (b < 0) return false; this.sel = b; AUDIO.pluck(b / 4 - 1); this.sync(); return true; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k !== 'intro') this.intro = 0; },
      press(k) { if (k === 'intro') { this.intro = 1; return; } this.intro = 0; if (k.startsWith('w:')) this.sel = +k.slice(2); if (k === 'end') { this.end = OTHER(this.end); AUDIO.chime(true); } },
      controls(box) { box.innerHTML = this.words().map((w, i) => bt(w, 'w:' + i)).join('') + bt('конец фразы: «' + OTHER(this.end) + '»', 'end') + bt('откуда ключи', 'intro') + '<div class="info"></div>'; wire(box, this, () => ''); },
      syncExtra(box) { const W = this.words(); box.querySelectorAll('[data-b^="w:"]').forEach((b) => { const i = +b.dataset.b.slice(2); b.textContent = W[i]; b.classList.toggle('on', i === this.sel); }); box.querySelector('[data-b="end"]').textContent = 'конец фразы: «' + OTHER(this.end) + '»'; },
      infoText() { if (this.intro) return 'из 11 чисел слова сеть делает ключ и вопрос · ткни доску, покажу фразу'; const W = this.words(), { sc, p } = this.att(this.sel); const top = W.map((w, j) => [w, sc[j], p[j]]).filter((_, j) => j !== this.sel).sort((a, b) => b[2] - a[2]).slice(0, 2); return `сходство вопроса «${W[this.sel]}» с ключами: ` + top.map(([w, s, q]) => `${w} ${f1(s)} → <b>${pct(q)}</b>`).join(', ') + (W[this.sel] === 'она' ? `. Конец «${this.end}» подмешан в вопрос «она»: так делают прошлые слои` : ''); },
    };
    m._att = (i) => m.att(i);
    models.push(m);
  }

  // =========================================================================
  // 11. Языковая модель: дерево продолжений и температура
  // =========================================================================
  {
    // та же фраза стенда 10, только конец спрятан: «Ромашка стояла в вазе, и она …»
    const L1 = [['завяла', 2.2], ['засохла', 1.8], ['цвела', 1.3], ['разбилась', 1.0], ['улетела', -1.2]];
    const L2 = {
      'завяла': [['к утру', 1.8], ['без воды', 1.4], ['и поникла', 1.1], ['в шляпе', -0.6]],
      'засохла': [['за неделю', 2.0], ['на окне', 1.4], ['и осыпалась', 1.0], ['в галстуке', -0.9]],
      'цвела': [['всё лето', 1.6], ['и пахла', 1.2], ['для нас', 0.8], ['с биноклем', -1.1]],
      'разбилась': [['на куски', 1.6], ['вместе с вазой', 1.5], ['о пол', 0.9], ['в позе йоги', -0.7]],
      'улетела': [['на Луну', 0.8], ['в окно', 0.6], ['и машет нам', 0.5], ['без визы', 0.2]],
    };
    const M10 = models[9], PRE = ['Ромашка', 'стояла', 'в вазе,', 'и она'];
    const m = {
      T: 1.0, a: 0, b: -1, anim: null, phrase: '', count: 0, intro: 0, dirty: true,
      p1() { return softmax(L1.map(([, l]) => l / this.T)); },
      p2(a) { return softmax(L2[L1[a][0]].map(([, l]) => l / this.T)); },
      draw(g) {
        if (this.intro) {
          const keep = [M10.end, M10.sel, M10.intro]; M10.end = 'завяла'; M10.sel = 5; M10.intro = 0; M10.draw(g); [M10.end, M10.sel, M10.intro] = keep;
          pill(g, 'фраза стенда 10: прячем «завяла»', 500, 80, 40, { a: 'center', bg: PAL.sun });
          return;
        }
        const p1 = this.p1(), a = this.a, p2 = this.p2(a), list = L2[L1[a][0]];
        const RB = [22, 330, 226, 360], X1 = 280, W1 = 285, X2 = 610, W2 = 360;
        const ys = L1.map((_, i) => 190 + i * 160), y2s = list.map((_, j) => 230 + j * 180);
        // branches first, boxes on top
        L1.forEach((_, i) => {
          const y = ys[i], hi = i === a && (this.b >= 0 || this.anim);
          g.save(); g.lineCap = 'round'; g.strokeStyle = hi ? PAL.orange : rgba(PAL.inkSoft, 0.5); g.lineWidth = 3 + 34 * p1[i];
          g.beginPath(); g.moveTo(RB[0] + RB[2] - 10, RB[1] + RB[3] / 2); g.bezierCurveTo(X1 - 40, RB[1] + RB[3] / 2, X1 - 50, y, X1 + 10, y); g.stroke(); g.restore();
        });
        list.forEach((_, j) => {
          const y = y2s[j], hi = j === this.b;
          g.save(); g.lineCap = 'round'; g.strokeStyle = hi ? PAL.orange : rgba(PAL.tealDeep, 0.5); g.lineWidth = 3 + 30 * p2[j];
          g.beginPath(); g.moveTo(X1 + W1 - 10, ys[a]); g.bezierCurveTo(X2 - 30, ys[a], X2 - 40, y, X2 + 10, y); g.stroke(); g.restore();
        });
        g.fillStyle = PAL.sun; rr(g, ...RB, 18); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; rr(g, ...RB, 18); g.stroke();
        PRE.forEach((w, k) => txt(g, w, RB[0] + RB[2] / 2, RB[1] + 76 + k * 76, 44, { a: 'center', w: 700, serif: true, maxW: RB[2] - 20 }));
        L1.forEach(([w], i) => {
          const y = ys[i], hi = i === a;
          g.fillStyle = hi ? '#F8D990' : PAL.paper; rr(g, X1, y - 62, W1, 124, 16); g.fill(); g.lineWidth = hi ? 5 : 3; g.strokeStyle = PAL.ink; rr(g, X1, y - 62, W1, 124, 16); g.stroke();
          txt(g, w, X1 + 18, y - 4, 46, { w: 700, maxW: W1 - 118 });
          g.fillStyle = rgba(PAL.orange, 0.85); g.fillRect(X1 + 18, y + 18, (W1 - 36) * p1[i], 14);
          txt(g, pct(p1[i]), X1 + W1 - 14, y - 4, 40, { a: 'right', w: 700, c: '#A8321F' });
        });
        list.forEach(([w], j) => {
          const y = y2s[j], hi = j === this.b;
          g.fillStyle = hi ? '#F8D990' : PAL.paper; rr(g, X2, y - 66, W2, 132, 16); g.fill(); g.lineWidth = hi ? 5 : 3; g.strokeStyle = PAL.ink; rr(g, X2, y - 66, W2, 132, 16); g.stroke();
          txt(g, w, X2 + 16, y - 10, 40, { w: 700, maxW: W2 - 30 });
          g.fillStyle = rgba(PAL.teal, 0.8); g.fillRect(X2 + 16, y + 14, (W2 - 130) * p2[j], 14);
          txt(g, pct(p2[j]), X2 + W2 - 14, y + 42, 40, { a: 'right', w: 700, c: PAL.tealDeep });
        });
        if (this.phrase) { g.fillStyle = 'rgba(42,28,19,0.9)'; rr(g, 30, 905, 940, 76, 14); g.fill(); txt(g, this.phrase, 500, 958, 44, { a: 'center', w: 700, c: '#FFE08A', maxW: 910 }); }
        else txt(g, 'жми «сгенерировать»', 500, 958, 40, { a: 'center', c: PAL.inkSoft });
      },
      sample(p) { let r = Math.random(), k = 0; for (; k < p.length - 1; k++) { r -= p[k]; if (r <= 0) break; } return k; },
      tick(dt) {
        if (!this.anim) return;
        const A = this.anim; A.t += dt;
        if (A.stage === 0 && A.t > 0.12) { A.t = 0; A.spin++; this.a = A.spin < 8 ? Math.floor(Math.random() * L1.length) : A.a; this.b = -1; AUDIO.pluck(this.a / 3 - 0.7, 0.6); if (A.spin >= 8) { A.stage = 1; A.spin = 0; } this.dirty = true; }
        else if (A.stage === 1 && A.t > 0.12) { A.t = 0; A.spin++; this.b = A.spin < 8 ? Math.floor(Math.random() * 4) : A.b; AUDIO.pluck(this.b / 3 - 0.3, 0.6); if (A.spin >= 8) { this.anim = null; this.count++; this.phrase = `…и она ${L1[this.a][0]} ${L2[L1[this.a][0]][this.b][0]}`; AUDIO.chime(true); this.sync(); } this.dirty = true; }
      },
      gen() { const a = this.sample(this.p1()), b = this.sample(this.p2(a)); this.anim = { stage: 0, t: 0, spin: 0, a, b }; this.phrase = ''; },
      tap(x, y) { if (this.intro) { this.intro = 0; this.sync(); return true; } if (x > 260 && x < 570) { const i = Math.round((y - 190) / 160); if (i >= 0 && i < 5) { this.a = i; this.b = -1; this.phrase = ''; AUDIO.pluck(i / 3 - 0.7); this.sync(); return true; } } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k !== 'intro') this.intro = 0; },
      press(k) { if (k === 'intro') { this.intro = 1; return; } this.intro = 0; if (k === 'gen' && !this.anim) this.gen(); },
      controls(box) { box.innerHTML = sl('температура', 'T', 0.1, 2.5, 0.05, this.T) + bt('сгенерировать', 'gen') + '<div class="info"></div>'; wire(box, this, (k, v) => f2(v)); },
      infoText() { const p = this.p1(); if (this.intro) return 'это доска стенда 10: «она» смотрит на «ромашку» · ткни доску, покажу угадывание'; const t = this.T < 0.4 ? 'холодно: почти всегда «завяла»' : this.T > 1.6 ? 'жарко: и улететь может' : 'тепло: обычно разумно, иногда чудит'; return `${t} · «${L1[0][0]}» ${pct(p[0])}, «улетела» ${pct(p[4])}${this.phrase ? `<br>последняя фраза: <b>${this.phrase}</b>` : ''}`; },
    };
    models.push(m);
  }

  // =========================================================================
  // 12. Диффузия: те же 64 числа ромашки тонут в шуме и проявляются обратно
  // =========================================================================
  {
    // считаем от серого: число − 128, тогда шум прибавляется честно в обе стороны
    const NAMES = ['ромашка', 'василёк', 'колокольчик'];
    const GAL = {}; for (const n of NAMES) GAL[n] = pix8(n).map((b) => (b - 128) / 128);
    const show = (u) => clamp(Math.round(128 + 128 * u), 0, 255);
    const abar = (t) => Math.max(1e-4, Math.cos(t * Math.PI / 2) ** 2);
    const GX = 30, GY = 100, GC = 68;
    const m = {
      src: 'ромашка', t: 0, x: null, guess: null, w: null, run: null, seed: 1, dirty: true,
      newNoise() { const R = mulberry(this.seed++ * 7919), e = new Float32Array(64); for (let i = 0; i < 64; i++) e[i] = gauss(R); this.eps = e; },
      forward() { const a = abar(this.t), s = Math.sqrt(a), r = Math.sqrt(1 - a), x0 = GAL[this.src], x = new Float32Array(64); for (let i = 0; i < 64; i++) x[i] = s * x0[i] + r * this.eps[i]; this.x = x; this.denoise(); },
      // сеть, которая помнит три картинки стенда 1: веса по сходству с каждой (смягчены, чтобы сомневалась дольше), потом ожидаемая картинка
      denoise() {
        const a = abar(this.t), s = Math.sqrt(a), x = this.x, lg = NAMES.map((n) => { const g0 = GAL[n]; let d = 0; for (let i = 0; i < 64; i++) { const u = x[i] - s * g0[i]; d += u * u; } return -d / (2 * Math.max(1e-4, 1 - a)) / 3; });
        if (this.run && this.cond) { const k = NAMES.indexOf(this.cond); if (k >= 0) lg[k] += 3; } // подсказка словом: каждый шаг чуть тянет к названной картинке
        this.w = softmax(lg); const gs = new Float32Array(64); NAMES.forEach((n, k) => { const g0 = GAL[n], wk = this.w[k]; for (let i = 0; i < 64; i++) gs[i] += wk * g0[i]; }); this.guess = gs;
      },
      init() { if (!this.eps) { this.newNoise(); this.forward(); } },
      draw(g) {
        this.init();
        const v = Array.from(this.x, show), nz = 1 - abar(this.t);
        txt(g, this.run ? 'проявляем из шума' : nz < 0.005 ? `${this.src} со стенда 1: те же 64 числа` : `${this.src} в шуме`, GX, GY - 24, 38, { w: 700, maxW: 600 });
        drawVals(g, v, GX, GY, GC, { grid: true, nums: 25, fw: 5 });
        txt(g, 'догадка сети', 640, 110, 36, { w: 700, c: PAL.inkSoft });
        drawVals(g, Array.from(this.guess, show), 640, 130, 40, { fw: 4 });
        txt(g, 'шум', 640, 520, 40, { w: 700 });
        g.fillStyle = PAL.paperShade; g.fillRect(640, 540, 320, 40); g.fillStyle = PAL.inkSoft; g.fillRect(640, 540, 320 * nz, 40); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.strokeRect(640, 540, 320, 40);
        txt(g, pct(nz), 960, 520, 42, { a: 'right', w: 700 });
        txt(g, 'на что похоже:', GX, 690, 38, { w: 700, c: PAL.inkSoft });
        NAMES.forEach((n, k) => {
          const x = GX + k * 320, y = 715, TS = 120, on = n === this.src && !this.run;
          drawVals(g, pix8(n), x, y, TS / 8, { frame: on ? PAL.orange : PAL.ink, fw: on ? 8 : 3 });
          txt(g, pct(this.w[k]), x + TS + 12, y + 56, 40, { w: 700, c: this.w[k] > 0.5 ? '#A8321F' : PAL.ink, maxW: 160 });
          g.fillStyle = rgba(PAL.orange, 0.8); g.fillRect(x + TS + 12, y + 76, 150 * this.w[k], 14);
          txt(g, n, x, y + TS + 46, 36, { c: PAL.ink, w: 600 });
        });
      },
      tick(dt) {
        if (!this.run) return;
        this.run.t += dt; if (this.run.t < 0.07) return; this.run.t = 0;
        // один шаг очистки (DDIM) от t к t − 1/40 по догадке сети
        const t0 = this.t, t1 = Math.max(0, t0 - 1 / 40), a0 = abar(t0), a1 = t1 <= 0 ? 1 : abar(t1);
        this.denoise();
        const x = this.x, x0 = this.guess, nx = new Float32Array(64), s0 = Math.sqrt(a0), r0 = Math.sqrt(Math.max(1e-6, 1 - a0));
        for (let i = 0; i < 64; i++) { const e = (x[i] - s0 * x0[i]) / r0; nx[i] = Math.sqrt(a1) * x0[i] + Math.sqrt(1 - a1) * e; }
        this.x = nx; this.t = t1; this.denoise();
        if (this.t <= 0) { this.run = null; this.src = NAMES[this.w.indexOf(Math.max(...this.w))]; AUDIO.chime(true); this.sync(); }
        else { AUDIO.pluck(1 - this.t * 2, 0.4); if (Math.round(this.t * 40) % 5 === 0) this.sync(); }
        this.dirty = true;
      },
      tap(x, y) { if (y > 700 && y < 900) { const k = Math.floor((x - GX) / 320); if (k >= 0 && k < 3) { this.src = NAMES[k]; this.run = null; this.init(); this.forward(); this.sync(); return true; } } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k === 't') { this.run = null; this.init(); this.forward(); } },
      press(k) {
        this.init();
        if (k === 'gen' || k.startsWith('gen:')) { this.cond = k.startsWith('gen:') ? k.slice(4) : null; this.newNoise(); this.t = 1; this.x = this.eps.slice(); this.run = { t: 0 }; this.denoise(); }
        if (k.startsWith('p:')) { this.src = k.slice(2); this.run = null; this.forward(); }
      },
      controls(box) { box.innerHTML = sl('утопить в шуме', 't', 0, 1, 0.01, this.t) + bt('проявить из чистого шума', 'gen') + bt('проявить «ромашку»', 'gen:ромашка') + NAMES.map((n) => bt(n, 'p:' + n)).join('') + '<div class="info"></div>'; wire(box, this, (k, v) => pct(1 - abar(v))); },
      syncExtra(box) { box.querySelectorAll('[data-b^="p:"]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'p:' + this.src && !this.run)); },
      infoText() { return this.run ? `шаг ${40 - Math.round(this.t * 40)} из 40: каждый шаг чуть чистит шум по догадке сети${this.cond ? `, а слово «${this.cond}» подталкивает догадку` : ''}` : 'сеть здесь выучила три картинки стенда 1: ромашку, василёк и колокольчик. Из чистого шума она проявит одну из них, какую, решает случай'; },
    };
    m._init = () => m.init(); m._GAL = GAL;
    models.push(m);
  }

  // =========================================================================
  // 13. Обучение наградой: пчела, лабиринт и ромашка
  // =========================================================================
  {
    const MAP = ['S...#.', '##.#..', '...#.#', '.#....', '.###L.', '.....B'];
    const NR = 6, NC = 6, A = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const m = {
      intro: 0, Q: null, eps: 0.2, ep: 0, lastLen: 0, pos: [0, 0], steps: 0, play: false, fast: 0, t: 0, trail: [], dirty: true, bestLen: null,
      reset() { this.Q = Array.from({ length: NR * NC }, () => [0, 0, 0, 0]); this.ep = 0; this.lastLen = 0; this.pos = [0, 0]; this.steps = 0; this.play = false; this.fast = 0; this.trail = []; this.bestLen = null; },
      cell(r, c) { return MAP[r][c]; },
      stepOnce() {
        const [r, c] = this.pos, s = r * NC + c, q = this.Q[s];
        let a; if (Math.random() < this.eps) a = Math.floor(Math.random() * 4); else { const mx = Math.max(...q), best = [0, 1, 2, 3].filter((k) => q[k] === mx); a = best[Math.floor(Math.random() * best.length)]; }
        let nr = r + A[a][0], nc = c + A[a][1], rew = -0.04, done = false;
        if (nr < 0 || nc < 0 || nr >= NR || nc >= NC || MAP[nr][nc] === '#') { nr = r; nc = c; rew = -0.08; }
        const ch = MAP[nr][nc];
        if (ch === 'B') { rew = 1; done = true; } else if (ch === 'L') rew = -0.5; // B ромашка, L паутина
        const ns = nr * NC + nc, target = rew + (done ? 0 : 0.9 * Math.max(...this.Q[ns]));
        q[a] += 0.5 * (target - q[a]);
        this.pos = [nr, nc]; this.steps++; this.trail.push([nr, nc]); if (this.trail.length > 30) this.trail.shift();
        if (done || this.steps >= 120) { this.ep++; this.lastLen = this.steps; if (done && (this.bestLen === null || this.steps < this.bestLen)) this.bestLen = this.steps; this.pos = [0, 0]; this.steps = 0; this.trail = []; return done ? 'found' : 'tired'; }
        return ch === 'L' ? 'splash' : '';
      },
      greedyLen() { let [r, c] = [0, 0]; for (let k = 0; k < 40; k++) { if (MAP[r][c] === 'B') return k; const q = this.Q[r * NC + c], a = q.indexOf(Math.max(...q)); if (Math.max(...q) === 0 && Math.min(...q) === 0) return null; const nr = r + A[a][0], nc = c + A[a][1]; if (nr < 0 || nc < 0 || nr >= NR || nc >= NC || MAP[nr][nc] === '#') return null; r = nr; c = nc; } return null; },
      draw(g) {
        const X0 = 50, Y0 = 90, C = 150;
        let vmax = 0.01; for (const q of this.Q) vmax = Math.max(vmax, Math.max(...q));
        for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
          const x = X0 + c * C, y = Y0 + r * C, ch = MAP[r][c], q = this.Q[r * NC + c], v = Math.max(...q);
          if (ch === '#') { g.fillStyle = '#6A5A86'; g.fillRect(x, y, C, C); g.strokeStyle = 'rgba(42,28,19,0.4)'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, y + k * C / 4); g.lineTo(x + C, y + k * C / 4); g.stroke(); } continue; }
          g.fillStyle = css(v > 0 ? mixc(C_PAPER, [0.58, 0.72, 0.45], Math.min(1, v / vmax)) : v < 0 ? mixc(C_PAPER, [0.85, 0.6, 0.55], Math.min(1, -v * 2)) : C_PAPER); g.fillRect(x, y, C, C);
          if (ch === 'L') { g.save(); g.strokeStyle = 'rgba(70,60,80,0.75)'; g.lineWidth = 2.5; const cx = x + C / 2, cy = y + C / 2 - 8; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 50); g.stroke(); } for (const rr0 of [16, 32, 48]) { g.beginPath(); for (let k = 0; k <= 8; k++) { const a = k / 8 * TAU; const px = cx + Math.cos(a) * rr0 * 1.15, py = cy + Math.sin(a) * rr0; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); } g.restore(); txt(g, 'паутина', x + C / 2, y + C - 10, 30, { a: 'center', c: '#3A2E4A', w: 700 }); }
          if (ch === 'B') { drawVals(g, DAISY64, x + 11, y + 11, 16, { frame: F_DAISY, fw: 5 }); continue; }
          if (ch !== 'B' && (q[0] || q[1] || q[2] || q[3])) {
            const a = q.indexOf(Math.max(...q)), conf = Math.min(1, Math.max(0, v) / vmax), L = 30 + 30 * conf;
            arrow(g, x + C / 2 - A[a][1] * L * 0.6, y + C / 2 - A[a][0] * L * 0.6, x + C / 2 + A[a][1] * L, y + C / 2 + A[a][0] * L, 6 + 4 * conf, v > 0 ? '#2F5F2A' : '#9A4A3A', 26);
          }
          g.strokeStyle = rgba(PAL.inkFaint, 0.5); g.lineWidth = 2; g.strokeRect(x, y, C, C);
        }
        inkRect(g, X0, Y0, C * NC, C * NR, 5, PAL.ink, 7);
        txt(g, 'старт', X0 + 8, Y0 + C - 12, 30, { w: 700, c: PAL.inkSoft });
        // trail and the dog
        if (this.trail.length > 1) quickStroke(g, this.trail.map(([r, c]) => [X0 + c * C + C / 2, Y0 + r * C + C / 2]), 5, rgba(PAL.orange, 0.5), 1, [8, 8]);
        const [r, c] = this.pos, dx = X0 + c * C + C / 2, dy = Y0 + r * C + C / 2;
        // пчела
        g.fillStyle = 'rgba(220,240,255,0.85)'; g.strokeStyle = PAL.ink; g.lineWidth = 3;
        g.beginPath(); g.ellipse(dx - 14, dy - 30, 16, 24, -0.5, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(dx + 14, dy - 30, 16, 24, 0.5, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#F2B824'; g.beginPath(); g.ellipse(dx, dy, 40, 27, 0, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.ellipse(dx, dy, 40, 27, 0, 0, TAU); g.clip(); g.fillStyle = '#2A1C13'; for (const sx0 of [-14, 4, 22]) g.fillRect(dx + sx0 - 5, dy - 30, 10, 60); g.restore();
        g.lineWidth = 4; g.strokeStyle = PAL.ink; g.beginPath(); g.ellipse(dx, dy, 40, 27, 0, 0, TAU); g.stroke();
        g.fillStyle = PAL.ink; g.beginPath(); g.arc(dx - 28, dy - 6, 4, 0, TAU); g.fill();
        if (this.intro) {
          g.fillStyle = 'rgba(239,227,201,0.96)'; rr(g, 60, 110, 470, 520, 20); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; rr(g, 60, 110, 470, 520, 20); g.stroke();
          txt(g, 'ромашка со стенда 1', 295, 170, 38, { a: 'center', w: 700 });
          drawVals(g, DAISY64, 175, 200, 30, { frame: F_DAISY, fw: 6 });
          pill(g, 'награда +1', 295, 500, 46, { a: 'center', bg: PAL.sun });
          txt(g, 'те же 64 числа', 295, 585, 34, { a: 'center', c: PAL.inkSoft });
          arrow(g, 530, 520, X0 + 5 * C + 20, Y0 + 5 * C + 20, 7, PAL.orange, 30);
        }
        txt(g, `полётов ${this.ep}${this.lastLen ? ` · последний ${this.lastLen} шагов` : ''}`, 500, 62, 42, { a: 'center', w: 700, maxW: 900 });
      },
      tick(dt) {
        if (this.fast > 0) { let n = 0; while (this.fast > 0 && n < 4000) { const e = this.stepOnce(); n++; if (e === 'found' || e === 'tired') this.fast--; } if (this.fast <= 0) { AUDIO.chime(true); this.sync(); } this.dirty = true; return; }
        if (!this.play) return;
        this.t += dt; if (this.t < 0.13) return; this.t = 0;
        const e = this.stepOnce(); this.dirty = true;
        if (e === 'found') { AUDIO.chime(true); this.sync(); } else if (e === 'splash') AUDIO.pluck(-1); else AUDIO.pluck(0.2, 0.3);
      },
      tap() { if (this.intro) { this.intro = 0; this.dirty = true; this.sync(); return true; } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k !== 'intro') this.intro = 0; },
      press(k) { if (k !== 'intro') this.intro = 0; if (k === 'intro') this.intro = 1; if (k === 'play') this.play = !this.play; if (k === 'fast') { this.fast = 20; this.play = false; } if (k === 'reset') this.reset(); },
      controls(box) { box.innerHTML = bt('▶ летать', 'play') + bt('▶▶ 20 полётов', 'fast') + bt('заново', 'reset') + bt('где награда', 'intro') + sl('любопытство', 'eps', 0, 0.6, 0.05, this.eps) + '<div class="info"></div>'; wire(box, this, (k, v) => pct(v)); },
      syncExtra(box) { const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ летать'; },
      infoText() { if (this.intro) return 'награда это ромашка со стенда 1 в правом нижнем углу · ткни доску'; const gl = this.greedyLen(); return `полётов <b>${this.ep}</b>${gl ? ` · по стрелкам до ромашки <b>${gl}</b> шагов` : ' · стрелки пока не довели до ромашки'} · ромашка +1, паутина −0,5, шаг −0,04`; },
    };
    m.reset();
    models.push(m);
  }

  models.drawHero = (g, x, y, c) => drawVals(g, DAISY64, x, y, c, { frame: F_DAISY, fw: 5 });
  models.forEach((m, i) => { m.n = i + 1; if (!m.sync) m.sync = () => { m.dirty = true; }; });
  return models;
}
