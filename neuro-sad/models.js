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
    const PICS = {
      'смайлик': ['..####..', '.#....#.', '#.#..#.#', '#......#', '#.#..#.#', '#..##..#', '.#....#.', '..####..'],
      'сердце': ['........', '.##..##.', '########', '########', '.######.', '..####..', '...##...', '........'],
      'домик': ['...##...', '..####..', '.######.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.######.'],
    };
    const MODES = ['как фото', 'как таблица чисел', 'как звуковая волна'];
    const m = {
      pic: 'смайлик', mode: 0, br: 0, sel: -1, dirty: true, playT: -1,
      vals() {
        const rows = PICS[this.pic], out = [];
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
          const base = rows[i][j] === '#' ? 30 + ((i * 7 + j * 3) % 5) * 7 : 200 + ((i * 3 + j * 5) % 7) * 6;
          out.push(clamp(Math.round(base + this.br), 0, 255));
        }
        return out;
      },
      draw(g) {
        const v = this.vals();
        txt(g, MODES[this.mode], 500, 92, 56, { a: 'center', serif: true, w: 700 });
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
        if (k.startsWith('pic:')) this.pic = k.slice(4);
        else if (k.startsWith('mode:')) this.mode = +k.slice(5);
        else if (k === 'play') this.play();
      },
      controls(box) {
        box.innerHTML = Object.keys(PICS).map((p) => bt(p, 'pic:' + p)).join('') + '<br>' +
          MODES.map((s, i) => bt(['фото', 'таблица', 'звук'][i], 'mode:' + i)).join('') + bt('▶ послушать', 'play') +
          sl('яркость', 'br', -120, 120, 1, this.br) + '<div class="info"></div>';
        wire(box, this, (k, v) => (v > 0 ? '+' : '') + Math.round(v));
      },
      syncExtra(box) { box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'pic:' + this.pic || b.dataset.b === 'mode:' + this.mode)); },
      infoText() { const v = this.vals(); const avg = Math.round(v.reduce((a, b) => a + b, 0) / 64); return this.sel >= 0 ? `клетка: ряд ${(this.sel >> 3) + 1}, место ${(this.sel & 7) + 1}, число <b>${v[this.sel]}</b>` : `средняя яркость <b>${avg}</b> из 255 · ткни клетку`; },
    };
    models.push(m);
  }

  // =========================================================================
  // 2. Нейрон: взвешенная сумма и порог
  // =========================================================================
  {
    const R = mulberry(5), pts = [];
    while (pts.length < 14) { const a = 6.6 + gauss(R) * 1.05, b = 3.1 + gauss(R) * 0.95; if (a - b > 1.2 && a < 9.6 && b > 0.4) pts.push([a, b, 1]); }
    while (pts.length < 28) { const a = 3.1 + gauss(R) * 0.95, b = 6.5 + gauss(R) * 1.05; if (b - a > 1.2 && b < 9.6 && a > 0.4) pts.push([a, b, -1]); }
    const X0 = 120, X1 = 950, Y0 = 70, Y1 = 860, sx = (v) => X0 + (X1 - X0) * v / 10, sy = (v) => Y1 - (Y1 - Y0) * v / 10;
    const m = {
      w1: 0.3, w2: 0.6, th: 4, sel: -1, auto: false, t: 0, dirty: true,
      s(p) { return this.w1 * p[0] + this.w2 * p[1] - this.th; },
      errs() { return pts.filter((p) => Math.sign(this.s(p) || -1) !== p[2]); },
      draw(g) {
        const n = 28;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const a = (j + 0.5) / n * 10, b = 10 - (i + 0.5) / n * 10, s = this.w1 * a + this.w2 * b - this.th;
          g.fillStyle = s > 0 ? 'rgba(241,191,74,0.30)' : 'rgba(62,143,196,0.20)';
          g.fillRect(X0 + (X1 - X0) * j / n, Y0 + (Y1 - Y0) * i / n, (X1 - X0) / n + 1, (Y1 - Y0) / n + 1);
        }
        inkRect(g, X0, Y0, X1 - X0, Y1 - Y0, 4, PAL.ink, 2);
        txt(g, 'длина лепестка →', (X0 + X1) / 2, 935, 42, { a: 'center', c: PAL.inkSoft });
        g.save(); g.translate(62, (Y0 + Y1) / 2); g.rotate(-Math.PI / 2); txt(g, 'ширина лепестка →', 0, 0, 42, { a: 'center', c: PAL.inkSoft }); g.restore();
        // the fence: w1·x + w2·y = порог
        const seg = [];
        const { w1, w2, th } = this;
        if (Math.abs(w2) > 1e-6) { for (const a of [0, 10]) { const b = (th - w1 * a) / w2; seg.push([a, b]); } }
        else if (Math.abs(w1) > 1e-6) { const a = th / w1; seg.push([a, 0], [a, 10]); }
        if (seg.length === 2) {
          // clip to the box
          let [[ax, ay], [bx, by]] = seg; const cl = [];
          const pts2 = [[ax, ay], [bx, by]];
          const inside = (p) => p[0] >= -1e-9 && p[0] <= 10 + 1e-9 && p[1] >= -1e-9 && p[1] <= 10 + 1e-9;
          for (const e of [0, 10]) { if (Math.abs(by - ay) > 1e-9) { const t = (e - ay) / (by - ay); const p = [ax + (bx - ax) * t, e]; if (inside(p)) cl.push(p); } }
          for (const p of pts2) if (inside(p)) cl.push(p);
          if (cl.length >= 2) { cl.sort((p, q) => p[0] - q[0] || p[1] - q[1]); const a = cl[0], b = cl[cl.length - 1]; inkStroke(g, [[sx(a[0]), sy(a[1])], [sx(b[0]), sy(b[1])]], 9, PAL.wood, { seed: 3 }); inkStroke(g, [[sx(a[0]), sy(a[1])], [sx(b[0]), sy(b[1])]], 3, PAL.ink, { seed: 5, double: false }); }
        }
        const bad = new Set(this.errs());
        pts.forEach((p, k) => {
          const x = sx(p[0]), y = sy(p[1]);
          if (p[2] > 0) { g.fillStyle = '#FBF6EA'; for (let q = 0; q < 6; q++) { const a = q / 6 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 13, y + Math.sin(a) * 13, 11, 6, a, 0, TAU); g.fill(); } g.fillStyle = PAL.sun; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
          else { g.fillStyle = '#3E6FC4'; for (let q = 0; q < 7; q++) { const a = q / 7 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 10, 6, a, 0, TAU); g.fill(); } g.fillStyle = '#23336E'; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
          inkCircle(g, x, y, 21, 2.2, PAL.ink, k + 2);
          if (bad.has(p)) { g.lineWidth = 6; g.strokeStyle = PAL.red; g.beginPath(); g.arc(x, y, 31, 0, TAU); g.stroke(); }
          if (k === this.sel) { g.lineWidth = 5; g.strokeStyle = PAL.orange; g.beginPath(); g.arc(x, y, 40, 0, TAU); g.stroke(); }
        });
        const e = bad.size;
        pill(g, e ? `ошибок: ${e} из 28` : 'ошибок нет!', X0 + 20, Y0 + 70, 46, { bg: e ? PAL.paper : PAL.sun, c: e ? PAL.red : PAL.ink });
        pill(g, 'ромашка', X1 - 20, Y1 - 30, 36, { a: 'right', bg: '#F8E7B0' });
        pill(g, 'василёк', X0 + 20, Y0 + 160, 36, { bg: '#C9DDF2' });
      },
      tick(dt) {
        if (!this.auto) return;
        this.t += dt; if (this.t < 0.22) return; this.t = 0;
        const bad = this.errs();
        if (!bad.length) { this.auto = false; AUDIO.chime(true); this.sync(); return; }
        const p = bad[Math.floor(Math.random() * bad.length)], eta = 0.06;
        this.w1 += eta * p[2] * p[0] / 5; this.w2 += eta * p[2] * p[1] / 5; this.th -= eta * p[2] * 1.2;
        this.w1 = clamp(this.w1, -1.5, 1.5); this.w2 = clamp(this.w2, -1.5, 1.5); this.th = clamp(this.th, -10, 10);
        AUDIO.pluck(-0.3); this.sync();
      },
      tap(x, y) {
        let b = -1, bd = 50;
        pts.forEach((p, k) => { const d = Math.hypot(sx(p[0]) - x, sy(p[1]) - y); if (d < bd) { bd = d; b = k; } });
        if (b < 0) return false; this.sel = b; AUDIO.pluck(pts[b][2] * 0.6); this.sync(); return true;
      },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; this.auto = false; },
      press(k) { if (k === 'auto') this.auto = !this.auto; if (k === 'reset') { this.w1 = 0.3; this.w2 = 0.6; this.th = 4; this.auto = false; } },
      controls(box) {
        box.innerHTML = sl('вес длины w1', 'w1', -1.5, 1.5, 0.05, this.w1) + sl('вес ширины w2', 'w2', -1.5, 1.5, 0.05, this.w2) + sl('порог', 'th', -10, 10, 0.1, this.th) +
          bt('▶ подобрать само', 'auto') + bt('сбросить', 'reset') + '<div class="info"></div>';
        wire(box, this, (k, v) => f2(v));
      },
      syncExtra(box) { const b = box.querySelector('[data-b="auto"]'); b.classList.toggle('on', this.auto); b.textContent = this.auto ? '❚❚ стоп' : '▶ подобрать само'; },
      infoText() {
        if (this.sel < 0) return `ошибок <b>${this.errs().length}</b> из 28 · ткни цветок, покажу счёт`;
        const p = pts[this.sel], s = this.w1 * p[0] + this.w2 * p[1];
        return `${f2(this.w1)}×${f1(p[0])} + ${f2(this.w2)}×${f1(p[1])} = <b>${f2(s)}</b> ${s > this.th ? '&gt;' : '&lt;'} ${f1(this.th)} → ${s > this.th ? 'ромашка' : 'василёк'}${(s > this.th ? 1 : -1) === p[2] ? ' ✓' : ' <b style="color:#BF3F2C">ошибка</b>'}`;
      },
    };
    models.push(m);
  }

  // =========================================================================
  // 3. Ошибка и градиентный спуск
  // =========================================================================
  {
    const f = (w) => 0.08 * w ** 4 - 0.6 * w * w + 0.25 * w + 2.0;
    const df = (w) => 0.32 * w ** 3 - 1.2 * w + 0.25;
    const X0 = 80, X1 = 950, Y0 = 70, Y1 = 790, WMAX = 3.6, FMAX = 7;
    const sx = (w) => X0 + (X1 - X0) * (w + WMAX) / (2 * WMAX), sy = (v) => Y1 - (Y1 - Y0) * v / FMAX;
    const m = {
      w: 3.0, lr: 0.25, steps: 0, trail: [], play: false, t: 0, hop: null, out: false, dirty: true,
      draw(g) {
        // valley paper fill
        const curve = []; for (let i = 0; i <= 200; i++) { const w = -WMAX + 2 * WMAX * i / 200; curve.push([sx(w), sy(Math.min(f(w), FMAX + 0.5))]); }
        g.save(); g.beginPath(); g.rect(X0, Y0 - 10, X1 - X0, Y1 - Y0 + 10); g.clip();
        g.beginPath(); curve.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.lineTo(X1, Y1); g.lineTo(X0, Y1); g.closePath();
        g.fillStyle = 'rgba(148,164,127,0.45)'; g.fill();
        for (let k = 1; k < 6; k++) quickStroke(g, [[X0, sy(k)], [X1, sy(k)]], 1.5, rgba(PAL.inkFaint, 0.35), 1, [8, 10]);
        inkStroke(g, curve, 7, PAL.ink, { seed: 7 });
        g.restore();
        quickStroke(g, [[X0, Y1], [X1, Y1]], 3, PAL.ink);
        txt(g, 'вес →', X1, Y1 + 50, 40, { a: 'right', c: PAL.inkSoft });
        txt(g, 'ошибка', X0 + 8, Y0 + 30, 40, { c: PAL.inkSoft });
        // trail with hops
        const tr = this.trail;
        for (let i = 1; i < tr.length; i++) {
          const a = tr[i - 1], b = tr[i], ax = sx(clamp(a, -WMAX, WMAX)), bx = sx(clamp(b, -WMAX, WMAX)), ay = sy(f(clamp(a, -WMAX, WMAX))), by = sy(f(clamp(b, -WMAX, WMAX)));
          const al = 0.25 + 0.6 * i / tr.length;
          g.save(); g.globalAlpha = al; g.strokeStyle = PAL.orange; g.lineWidth = 4; g.setLineDash([10, 9]);
          g.beginPath(); g.moveTo(ax, ay - 26); g.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 40 - Math.abs(bx - ax) * 0.25, bx, by - 26); g.stroke(); g.restore();
          g.fillStyle = rgba(PAL.orange, al); g.beginPath(); g.arc(ax, ay - 26, 8, 0, TAU); g.fill();
        }
        // ball (possibly mid-hop)
        let bw = this.w, lift = 0;
        if (this.hop) { const k = this.hop.t; bw = lerp(this.hop.a, this.hop.b, k); lift = Math.sin(k * Math.PI) * (40 + Math.abs(this.hop.b - this.hop.a) * 60); }
        const cw = clamp(bw, -WMAX, WMAX), bx = sx(cw), by = sy(Math.min(f(cw), FMAX)) - 26 - lift;
        if (!this.hop && !this.out) { const s = df(this.w), d = 0.9; quickStroke(g, [[sx(this.w - d), sy(f(this.w) - s * d) - 26], [sx(this.w + d), sy(f(this.w) + s * d) - 26]], 5, PAL.annBlue, 0.9); arrow(g, bx, by + 50, bx + clamp(-s * 60, -160, 160), by + 50, 6, PAL.red, 24); }
        g.fillStyle = this.out ? PAL.red : PAL.sun; g.beginPath(); g.arc(bx, by, 26, 0, TAU); g.fill(); inkCircle(g, bx, by, 26, 4, PAL.ink, 5);
        g.fillStyle = '#FFF7DD'; g.beginPath(); g.arc(bx - 8, by - 9, 7, 0, TAU); g.fill();
        txt(g, this.out ? 'улетел за край!' : `шаг ${this.steps} · ошибка ${f2(f(this.w))}`, 500, 890, 50, { a: 'center', w: 700, c: this.out ? PAL.red : PAL.ink });
        txt(g, this.out ? 'шаг слишком большой' : `вес ${f2(this.w)} · наклон ${f2(df(this.w))}`, 500, 950, 42, { a: 'center', c: PAL.inkSoft });
      },
      step() {
        if (this.out) return;
        const a = this.w, b = a - this.lr * df(a);
        this.trail.push(a); if (this.trail.length > 14) this.trail.shift();
        this.w = b; this.steps++; this.hop = { a, b, t: 0 };
        if (Math.abs(b) > WMAX) { this.out = true; this.play = false; AUDIO.chime(false); }
        else AUDIO.pluck(1 - f(b) / 3);
        this.sync();
      },
      tick(dt) {
        if (this.hop) { this.hop.t += dt / 0.32; if (this.hop.t >= 1) this.hop = null; this.dirty = true; }
        if (!this.play) return;
        this.t += dt; if (this.t < 0.45) return; this.t = 0;
        if (Math.abs(df(this.w)) < 0.01 && this.steps > 0) { this.play = false; AUDIO.chime(true); this.sync(); return; }
        this.step();
        if (this.steps > 60) { this.play = false; this.sync(); }
      },
      tap(x, y) { if (x < X0 || x > X1 || y > Y1 + 20) return false; this.w = clamp((x - X0) / (X1 - X0) * 2 * WMAX - WMAX, -WMAX + 0.05, WMAX - 0.05); this.reset(true); return true; },
      reset(keep) { if (!keep) this.w = 3.0; this.steps = 0; this.trail = []; this.out = false; this.hop = null; this.play = false; this.sync(); },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k === 'play') { if (this.out) this.reset(); this.play = !this.play; } if (k === 'step') this.step(); if (k === 'reset') this.reset(); },
      controls(box) { box.innerHTML = sl('размер шага', 'lr', 0.02, 1.6, 0.01, this.lr) + bt('▶ катиться', 'play') + bt('один шаг', 'step') + bt('шарик наверх', 'reset') + '<div class="info"></div>'; wire(box, this, (k, v) => f2(v)); },
      syncExtra(box) { const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ катиться'; },
      infoText() {
        const v = this.lr > 1.0 ? 'шаг огромный: шарик прыгает через низину' : this.lr > 0.6 ? 'шаг большой: шарик скачет туда-сюда' : this.lr < 0.06 ? 'шаг крошечный: шарик ползёт' : 'нормальный шаг';
        return `${v} · ткни кривую, чтобы поставить шарик`;
      },
    };
    models.push(m);
  }

  // =========================================================================
  // 4. Обратное распространение ошибки
  // =========================================================================
  {
    const m = {
      x: 1.5, w1: 0.3, w2: 0.5, tgt: 0.8, lr: 0.5, steps: 0, hist: [], play: false, t: 0, ph: 0, flash: 0, dirty: true,
      fwd() { const h = Math.tanh(this.w1 * this.x), y = this.w2 * h, L = 0.5 * (y - this.tgt) ** 2; const dy = y - this.tgt, dw2 = dy * h, dh = dy * this.w2, dw1 = dh * (1 - h * h) * this.x; return { h, y, L, dy, dw2, dh, dw1 }; },
      draw(g) {
        const F = this.fwd(), NY = 320, NX = [105, 370, 635, 895], R = 80;
        const names = ['вход', 'середина', 'выход', 'ошибка'], vals = [this.x, F.h, F.y, F.L];
        const grads = [Math.abs(F.dw1), Math.abs(F.dw2), Math.abs(F.dy)], gmax = Math.max(0.05, ...grads);
        for (let k = 0; k < 3; k++) {
          const a = NX[k] + R, b = NX[k + 1] - R, th = 12 + 34 * grads[k] / gmax;
          g.fillStyle = PAL.paperDeep; g.fillRect(a, NY - th / 2, b - a, th);
          quickStroke(g, [[a, NY - th / 2], [b, NY - th / 2]], 3, PAL.ink); quickStroke(g, [[a, NY + th / 2], [b, NY + th / 2]], 3, PAL.ink);
          // forward drops (warm) and backward drops (red)
          for (let q = 0; q < 3; q++) {
            const u = (this.ph + q / 3) % 1;
            g.fillStyle = rgba(PAL.sun, 0.95); g.beginPath(); g.arc(a + (b - a) * u, NY - th * 0.15, 6, 0, TAU); g.fill();
            g.fillStyle = rgba(PAL.red, 0.9); g.beginPath(); g.arc(b - (b - a) * u, NY + th * 0.18, 5 + 7 * grads[k] / gmax, 0, TAU); g.fill();
          }
          const cx = (a + b) / 2;
          txt(g, k === 0 ? 'w1' : k === 1 ? 'w2' : 'цель', cx, NY - 128, 40, { a: 'center', c: PAL.inkSoft, w: 700 });
          txt(g, f2(k === 0 ? this.w1 : k === 1 ? this.w2 : this.tgt), cx, NY - 76, 48, { a: 'center', w: 700 });
          txt(g, 'вина', cx, NY + 100, 40, { a: 'center', c: PAL.red, w: 700 });
          txt(g, f2(k === 0 ? F.dw1 : k === 1 ? F.dw2 : F.dy), cx, NY + 152, 48, { a: 'center', w: 700, c: PAL.red });
        }
        NX.forEach((x, k) => {
          g.fillStyle = k === 3 ? (this.flash > 0 ? PAL.sun : '#F3C9BC') : k === 0 ? PAL.stripeSky : PAL.stripeYellow;
          g.beginPath(); g.arc(x, NY, R, 0, TAU); g.fill(); inkCircle(g, x, NY, R, 5, PAL.ink, k + 3);
          txt(g, f2(vals[k]), x, NY + 2, 48, { a: 'center', b: 'middle', w: 700 });
          txt(g, names[k], x, 92, 38, { a: 'center', c: PAL.ink, w: 700 });
        });
        // loss history
        const X0 = 110, X1 = 930, Y0 = 620, Y1 = 930;
        quickStroke(g, [[X0, Y0 - 10], [X0, Y1], [X1, Y1]], 3, PAL.ink);
        txt(g, 'ошибка по шагам', X0 + 16, Y0 + 26, 40, { c: PAL.inkSoft });
        const L = this.hist.concat([F.L]), mx = Math.max(0.05, ...L), n = Math.max(20, L.length);
        if (L.length < 2) txt(g, 'жми «шаг обучения»', (X0 + X1) / 2, (Y0 + Y1) / 2 + 30, 42, { a: 'center', c: PAL.inkFaint });
        if (L.length > 1) inkStroke(g, L.map((v, i) => [X0 + (X1 - X0) * i / (n - 1), Y1 - (Y1 - Y0 - 40) * v / mx]), 6, PAL.red, { seed: 2, double: false });
        txt(g, `шаг ${this.steps}`, X1, Y0 + 26, 44, { a: 'right', w: 700 });
        txt(g, f2(F.L), X1, Y0 + 80, 44, { a: 'right', w: 700, c: PAL.red });
      },
      learn() {
        const F = this.fwd(); this.hist.push(F.L); if (this.hist.length > 60) this.hist.shift();
        this.w1 -= this.lr * F.dw1; this.w2 -= this.lr * F.dw2; this.steps++; this.flash = 0.4;
        AUDIO.pluck(1 - Math.min(2, F.L * 6)); this.sync();
      },
      tick(dt) { this.ph = (this.ph + dt * 0.45) % 1; this.flash = Math.max(0, this.flash - dt); this.dirty = true; if (this.play) { this.t += dt; if (this.t > 0.6) { this.t = 0; this.learn(); if (this.fwd().L < 1e-5 || this.steps > 80) { this.play = false; this.sync(); } } } },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k === 'step') this.learn(); if (k === 'play') this.play = !this.play; if (k === 'reset') { this.w1 = 0.3; this.w2 = 0.5; this.steps = 0; this.hist = []; this.play = false; } },
      controls(box) { box.innerHTML = bt('шаг обучения', 'step') + bt('▶ само', 'play') + bt('заново', 'reset') + sl('цель', 'tgt', -1, 1, 0.05, this.tgt) + '<div class="info"></div>'; wire(box, this, (k, v) => f2(v)); },
      syncExtra(box) { const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ само'; },
      infoText() { const F = this.fwd(); return `y = ${f2(F.y)}, цель ${f2(this.tgt)}, ошибка <b>${fmt(F.L, 3)}</b><br>вина w1 = ${f2(F.dy)} × ${f2(this.w2)} × (1 − ${f2(F.h)}²) × ${f1(this.x)} = <b style="color:#BF3F2C">${fmt(F.dw1, 3)}</b>`; },
    };
    models.push(m);
  }

  // =========================================================================
  // 5. Многослойная сеть на спиралях, учится прямо здесь
  // =========================================================================
  {
    const R = mulberry(17), D = [];
    const NPC = 55;
    for (let c = 0; c < 2; c++) for (let i = 0; i < NPC; i++) { const t = i / NPC, r = 0.1 + 0.85 * t, a = t * 2.6 * Math.PI + c * Math.PI; D.push([r * Math.cos(a) + gauss(R) * 0.025, r * Math.sin(a) + gauss(R) * 0.025, c]); }
    const net = (H, seed) => {
      const r = mulberry(seed), n = { H, W1: [], b1: [], W2: [], b2: 0 };
      for (let h = 0; h < H; h++) { n.W1.push([gauss(r) * 2.2, gauss(r) * 2.2]); n.b1.push(gauss(r) * 0.6); n.W2.push(gauss(r) * 0.5); }
      n.m = new Float64Array(H * 4 + 1); n.v = new Float64Array(H * 4 + 1); n.t = 0;
      return n;
    };
    const fwd = (n, x, y, hid) => { let s = n.b2; for (let h = 0; h < n.H; h++) { const a = Math.tanh(n.W1[h][0] * x + n.W1[h][1] * y + n.b1[h]); if (hid) hid[h] = a; s += n.W2[h] * a; } return 1 / (1 + Math.exp(-s)); };
    const trainStep = (n, lr) => {
      const H = n.H, gr = new Float64Array(H * 4 + 1), hid = new Float64Array(H); let loss = 0, ok = 0;
      for (const [x, y, c] of D) {
        const p = fwd(n, x, y, hid); loss -= Math.log(Math.max(1e-9, c ? p : 1 - p)); if ((p > 0.5) === !!c) ok++;
        const d = p - c; gr[H * 4] += d;
        for (let h = 0; h < H; h++) { gr[h * 4 + 3] += d * hid[h]; const dh = d * n.W2[h] * (1 - hid[h] * hid[h]); gr[h * 4] += dh * x; gr[h * 4 + 1] += dh * y; gr[h * 4 + 2] += dh; }
      }
      const N = D.length; n.t++;
      const b1 = 0.9, b2 = 0.999, bc1 = 1 - b1 ** n.t, bc2 = 1 - b2 ** n.t;
      const upd = (i) => { const gg = gr[i] / N; n.m[i] = b1 * n.m[i] + (1 - b1) * gg; n.v[i] = b2 * n.v[i] + (1 - b2) * gg * gg; return lr * (n.m[i] / bc1) / (Math.sqrt(n.v[i] / bc2) + 1e-8); };
      for (let h = 0; h < H; h++) { n.W1[h][0] -= upd(h * 4); n.W1[h][1] -= upd(h * 4 + 1); n.b1[h] -= upd(h * 4 + 2); n.W2[h] -= upd(h * 4 + 3); }
      n.b2 -= upd(H * 4);
      return { loss: loss / N, acc: ok / N };
    };
    const X0 = 70, X1 = 930, Y0 = 70, Y1 = 930, S = 1.1, sx = (v) => X0 + (X1 - X0) * (v + S) / (2 * S), sy = (v) => Y1 - (Y1 - Y0) * (v + S) / (2 * S);
    const m = {
      H: 10, seed: 3, play: false, ep: 0, loss: 0.69, acc: 0.5, dirty: true,
      reset() { this.net = net(this.H, this.seed); this.ep = 0; const r = this.evalNow(); this.loss = r.loss; this.acc = r.acc; },
      evalNow() { let loss = 0, ok = 0; for (const [x, y, c] of D) { const p = fwd(this.net, x, y); loss -= Math.log(Math.max(1e-9, c ? p : 1 - p)); if ((p > 0.5) === !!c) ok++; } return { loss: loss / D.length, acc: ok / D.length }; },
      draw(g) {
        const n = 46, cw = (X1 - X0) / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const x = -S + 2 * S * (j + 0.5) / n, y = S - 2 * S * (i + 0.5) / n, p = fwd(this.net, x, y);
          g.fillStyle = css(p > 0.5 ? mixc(C_PAPER, [0.95, 0.62, 0.30], Math.min(1, (p - 0.5) * 2.4)) : mixc(C_PAPER, [0.45, 0.66, 0.86], Math.min(1, (0.5 - p) * 2.4)));
          g.fillRect(X0 + j * cw, Y0 + i * cw, cw + 1, cw + 1);
        }
        inkRect(g, X0, Y0, X1 - X0, Y1 - Y0, 4, PAL.ink, 6);
        for (const [x, y, c] of D) { g.fillStyle = c ? PAL.orange : '#2F6EB5'; g.beginPath(); g.arc(sx(x), sy(y), 12, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.stroke(); }
        pill(g, `эпоха ${this.ep} · верно ${pct(this.acc)}`, X0 + 18, Y0 + 66, 44, { bg: this.acc > 0.99 ? PAL.sun : PAL.paper });
        pill(g, `нейронов: ${this.H}`, X1 - 18, Y1 - 26, 40, { a: 'right' });
      },
      tick() {
        if (!this.play) return;
        let r; for (let k = 0; k < 4; k++) { r = trainStep(this.net, 0.03); this.ep++; }
        this.loss = r.loss; this.acc = r.acc; this.dirty = true;
        if ((this.acc >= 1 && this.loss < 0.03) || this.ep >= 8000) { this.play = false; AUDIO.chime(this.acc > 0.95); }
        if (this.ep % 40 === 0 || !this.play) this.sync();
      },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k === 'H') { this.play = false; this.reset(); } },
      press(k) { if (k === 'play') this.play = !this.play; if (k === 'reset') { this.seed++; this.play = false; this.reset(); } },
      controls(box) { box.innerHTML = bt('▶ учиться', 'play') + bt('заново', 'reset') + sl('нейронов в скрытом слое', 'H', 1, 24, 1, this.H) + '<div class="info"></div>'; wire(box, this, (k, v) => String(v)); },
      syncExtra(box) { const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ учиться'; },
      infoText() { return `эпоха ${this.ep} · ошибка <b>${f2(this.loss)}</b> · верно <b>${pct(this.acc)}</b>${this.H <= 2 ? ' · мало нейронов, граница почти прямая' : ''}`; },
    };
    m.reset();
    m._train = trainStep; m._fwd = fwd; m._D = D;
    models.push(m);
  }

  // =========================================================================
  // 6. Переобучение: две кривые ошибки
  // =========================================================================
  {
    const truth = (x) => Math.sin(3 * x) + 0.2 * x;
    const make = (seed) => {
      const R = mulberry(seed), tr = [], va = [];
      for (let i = 0; i < 10; i++) { const x = -0.95 + 1.9 * (i + 0.2 + R() * 0.6) / 10; tr.push([x, truth(x) + gauss(R) * 0.15]); }
      for (let i = 0; i < 10; i++) { const x = -0.95 + 1.9 * (i + R()) / 10; va.push([x, truth(x) + gauss(R) * 0.15]); }
      return { tr, va };
    };
    function fit(pts, d) {
      const n = d + 1, A = Array.from({ length: n }, () => new Float64Array(n + 1));
      for (const [x, y] of pts) { const p = []; let v = 1; for (let k = 0; k < n; k++) { p.push(v); v *= x; } for (let a = 0; a < n; a++) { for (let b = 0; b < n; b++) A[a][b] += p[a] * p[b]; A[a][n] += p[a] * y; } }
      for (let a = 0; a < n; a++) A[a][a] += 1e-9;
      for (let c = 0; c < n; c++) { let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r; [A[c], A[piv]] = [A[piv], A[c]]; for (let r = 0; r < n; r++) { if (r === c) continue; const k = A[r][c] / A[c][c]; for (let q = c; q <= n; q++) A[r][q] -= k * A[c][q]; } }
      return A.map((row, i) => row[n] / row[i]);
    }
    const poly = (c, x) => { let s = 0, v = 1; for (const k of c) { s += k * v; v *= x; } return s; };
    const mse = (c, pts) => pts.reduce((s, [x, y]) => s + (poly(c, x) - y) ** 2, 0) / pts.length;
    const DMAX = 9;
    const m = {
      d: 3, seed: 10, dirty: true,
      recompute() { const { tr, va } = make(this.seed); this.tr = tr; this.va = va; this.fits = []; this.etr = []; this.eva = []; for (let d = 1; d <= DMAX; d++) { const c = fit(tr, d); this.fits.push(c); this.etr.push(mse(c, tr)); this.eva.push(mse(c, va)); } this.best = this.eva.indexOf(Math.min(...this.eva)) + 1; },
      verdict() { if (this.d < this.best - 1 || (this.d < this.best && this.eva[this.d - 1] > 2 * this.eva[this.best - 1])) return ['недоучка: форму не ловит', PAL.annBlue]; if (this.d > this.best + 1 && this.eva[this.d - 1] > 1.5 * this.eva[this.best - 1]) return ['зубрила: учебные наизусть, новые мимо', PAL.red]; return ['в самый раз', '#2F7A35']; },
      draw(g) {
        const X0 = 90, X1 = 940, Y0 = 50, Y1 = 470, sx = (x) => X0 + (X1 - X0) * (x + 1) / 2, sy = (y) => (Y0 + Y1) / 2 - (Y1 - Y0) / 2 * y / 1.7;
        g.save(); g.beginPath(); g.rect(X0, Y0, X1 - X0, Y1 - Y0); g.clip();
        g.fillStyle = 'rgba(226,209,176,0.45)'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
        const c = this.fits[this.d - 1], pts = [];
        for (let i = 0; i <= 200; i++) { const x = -1 + 2 * i / 200; pts.push([sx(x), sy(clamp(poly(c, x), -3, 3))]); }
        inkStroke(g, pts, 7, PAL.ink, { seed: 3, double: false });
        g.restore();
        inkRect(g, X0, Y0, X1 - X0, Y1 - Y0, 4, PAL.ink, 8);
        for (const [x, y] of this.tr) { g.fillStyle = PAL.orange; g.beginPath(); g.arc(sx(x), sy(y), 15, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.stroke(); }
        for (const [x, y] of this.va) { g.fillStyle = PAL.paper; g.beginPath(); g.arc(sx(x), sy(y), 14, 0, TAU); g.fill(); g.lineWidth = 6; g.strokeStyle = '#2F6EB5'; g.stroke(); }
        const [vt, vc] = this.verdict();
        txt(g, vt, 500, 545, 46, { a: 'center', w: 700, c: vc, maxW: 900 });
        // errors vs complexity
        const B0 = 110, B1 = 930, C0 = 600, C1 = 900, CAP = 0.5, bx = (d) => B0 + (B1 - B0) * (d - 1) / (DMAX - 1), by = (e) => C1 - (C1 - C0) * Math.min(e, CAP) / CAP;
        quickStroke(g, [[B0, C0 - 10], [B0, C1], [B1, C1]], 3, PAL.ink);
        quickStroke(g, [[bx(this.d), C0 - 10], [bx(this.d), C1]], 4, PAL.inkFaint, 1, [10, 8]);
        inkStroke(g, this.etr.map((e, i) => [bx(i + 1), by(e)]), 6, PAL.orange, { seed: 2, double: false });
        inkStroke(g, this.eva.map((e, i) => [bx(i + 1), by(e)]), 6, '#2F6EB5', { seed: 4, double: false });
        this.eva.forEach((e, i) => { if (e > CAP) { txt(g, '↑', bx(i + 1), C0 + 10, 40, { a: 'center', w: 700, c: '#2F6EB5' }); } });
        for (const [arr, col] of [[this.etr, PAL.orange], [this.eva, '#2F6EB5']]) { const e = arr[this.d - 1]; g.fillStyle = col; g.beginPath(); g.arc(bx(this.d), by(e), 13, 0, TAU); g.fill(); }
        txt(g, 'учебная', B1, by(this.etr[DMAX - 1]) - 18, 38, { a: 'right', w: 700, c: PAL.orange });
        txt(g, 'проверочная', bx(4.2), by(Math.min(CAP, this.eva[3])) - 34, 38, { a: 'center', w: 700, c: '#2F6EB5' });
        txt(g, 'сложность →', B1, C1 + 60, 40, { a: 'right', c: PAL.inkSoft });
        txt(g, 'простая', B0, C1 + 60, 40, { c: PAL.inkSoft });
      },
      tick() {},
      get(k) { return this[k]; }, set(k, v) { this[k] = v; AUDIO.pluck((v - 5) / 5); },
      press(k) { if (k === 'new') { this.seed++; this.recompute(); } if (k === 'best') this.d = this.best; },
      controls(box) { box.innerHTML = sl('сложность модели', 'd', 1, DMAX, 1, this.d) + bt('новые точки', 'new') + bt('лучшая сложность', 'best') + '<div class="info"></div>'; wire(box, this, (k, v) => String(v)); },
      infoText() { return `<span style="color:#C25A1A">●</span> учебные точки, <span style="color:#2F6EB5">○</span> проверочные · ошибка: учебная <b>${fmt(this.etr[this.d - 1], 3)}</b>, проверочная <b>${fmt(this.eva[this.d - 1], 3)}</b>`; },
    };
    m.recompute();
    models.push(m);
  }

  // =========================================================================
  // 7. Свёртка: окошко 3×3 ползёт по картинке
  // =========================================================================
  {
    const KS = {
      'вертикальные края': [[1, 0, -1], [1, 0, -1], [1, 0, -1]],
      'горизонтальные края': [[1, 1, 1], [0, 0, 0], [-1, -1, -1]],
      'размытие': [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
      'резкость': [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    };
    const PIC = ['........', '.######.', '.#....#.', '.#.##.#.', '.#.##.#.', '.#....#.', '.######.', '........'];
    const m = {
      img: PIC.map((r) => [...r].map((ch) => (ch === '#' ? 1 : 0))), kn: 'вертикальные края', pos: 0, shown: 0, play: true, t: 0, dirty: true,
      conv() { const k = KS[this.kn], out = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += k[a][b] * this.img[i + a][j + b]; out.push(s); } return out; },
      draw(g) {
        const out = this.conv(), mx = Math.max(1, ...out.map(Math.abs)), k = KS[this.kn], pi = Math.floor(this.pos / 6), pj = this.pos % 6;
        const IX = 40, IY = 110, C = 60;
        txt(g, 'картинка', IX, IY - 22, 40, { w: 700 });
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = this.img[i][j] ? '#3A2A20' : '#F6EEDC'; g.fillRect(IX + j * C, IY + i * C, C, C); g.strokeStyle = rgba(PAL.inkFaint, 0.6); g.lineWidth = 1.5; g.strokeRect(IX + j * C, IY + i * C, C, C); }
        inkRect(g, IX, IY, 8 * C, 8 * C, 4, PAL.ink, 2);
        g.fillStyle = 'rgba(241,191,74,0.35)'; g.fillRect(IX + pj * C, IY + pi * C, 3 * C, 3 * C);
        g.lineWidth = 9; g.strokeStyle = PAL.orange; g.strokeRect(IX + pj * C, IY + pi * C, 3 * C, 3 * C);
        const OX = 590, OY = 170;
        txt(g, 'новая грядка', OX, OY - 22, 40, { w: 700 });
        for (let p = 0; p < 36; p++) {
          const i = Math.floor(p / 6), j = p % 6, x = OX + j * C, y = OY + i * C;
          if (p <= this.shown) { g.fillStyle = css(valRGB(out[p] / mx)); g.fillRect(x, y, C, C); txt(g, String(out[p]).replace('-', '−'), x + C / 2, y + C / 2 + 2, 32, { a: 'center', b: 'middle', w: 700 }); }
          else { g.fillStyle = 'rgba(226,209,176,0.5)'; g.fillRect(x, y, C, C); }
          g.strokeStyle = rgba(PAL.inkFaint, 0.6); g.lineWidth = 1.5; g.strokeRect(x, y, C, C);
        }
        inkRect(g, OX, OY, 6 * C, 6 * C, 4, PAL.ink, 4);
        g.lineWidth = 8; g.strokeStyle = PAL.orange; g.strokeRect(OX + pj * C, OY + pi * C, C, C);
        quickStroke(g, [[IX + (pj + 3) * C, IY + (pi + 1.5) * C], [OX + pj * C, OY + (pi + 0.5) * C]], 4, PAL.orange, 0.8, [10, 8]);
        // the arithmetic: kernel × patch = sum
        const KY = 700, KC = 74;
        txt(g, 'ядро', 40, KY - 24, 40, { w: 700 });
        txt(g, 'под окошком', 330, KY - 24, 40, { w: 700 });
        let s = 0;
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
          const v = k[a][b], pv = this.img[pi + a][pj + b]; s += v * pv;
          g.fillStyle = css(valRGB(v / 5 * 1.6)); g.fillRect(40 + b * KC, KY + a * KC, KC, KC); g.strokeStyle = PAL.ink; g.lineWidth = 2; g.strokeRect(40 + b * KC, KY + a * KC, KC, KC);
          txt(g, String(v).replace('-', '−'), 40 + b * KC + KC / 2, KY + a * KC + KC / 2 + 2, 42, { a: 'center', b: 'middle', w: 700 });
          g.fillStyle = pv ? '#3A2A20' : '#F6EEDC'; g.fillRect(330 + b * KC, KY + a * KC, KC, KC); g.strokeStyle = PAL.ink; g.strokeRect(330 + b * KC, KY + a * KC, KC, KC);
          txt(g, String(pv), 330 + b * KC + KC / 2, KY + a * KC + KC / 2 + 2, 42, { a: 'center', b: 'middle', w: 700, c: pv ? '#FBF6EA' : PAL.ink });
        }
        txt(g, '×', 288, KY + 125, 56, { a: 'center', w: 700 });
        txt(g, '→', 600, KY + 125, 64, { a: 'center', w: 700 });
        txt(g, 'сумма', 790, KY + 30, 40, { a: 'center', c: PAL.inkSoft });
        txt(g, String(s).replace('-', '−'), 790, KY + 160, 110, { a: 'center', w: 700, serif: true, c: s > 0 ? '#B5541C' : s < 0 ? '#2F6EB5' : PAL.ink });
      },
      tick(dt) { if (!this.play) return; this.t += dt; if (this.t < 0.55) return; this.t = 0; this.pos = (this.pos + 1) % 36; if (this.pos === 0) this.shown = 0; this.shown = Math.max(this.shown, this.pos); AUDIO.pluck(this.conv()[this.pos] / 4); this.sync(); },
      tap(x, y) { const j = Math.floor((x - 40) / 60), i = Math.floor((y - 110) / 60); if (i < 0 || j < 0 || i > 7 || j > 7) return false; this.img[i][j] ^= 1; AUDIO.pluck(this.img[i][j] ? 0.5 : -0.5); this.sync(); return true; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k.startsWith('k:')) { this.kn = k.slice(2); this.shown = this.pos; } if (k === 'play') this.play = !this.play; if (k === 'all') { this.shown = 35; this.play = false; } },
      controls(box) {
        box.innerHTML = Object.keys(KS).map((n) => bt(n, 'k:' + n)).join('') + bt('❚❚ пауза', 'play') + bt('всё сразу', 'all') +
          '<a class="btn big" href="../cnn-sad/">полный сад свёрточной сети →</a><div class="info"></div>';
        wire(box, this, () => '');
      },
      syncExtra(box) { box.querySelectorAll('[data-b^="k:"]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'k:' + this.kn)); const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ ползти'; },
      infoText() { const pi = Math.floor(this.pos / 6), pj = this.pos % 6; return `окошко на месте ${pi + 1}·${pj + 1}, сумма <b>${String(this.conv()[this.pos]).replace('-', '−')}</b> · ткни клетку картинки`; },
    };
    models.push(m);
  }

  // =========================================================================
  // 8. Что видит сеть изнутри: фильтры первого слоя и карта внимания
  // =========================================================================
  {
    const N = 48;
    const m = {
      sel: 0, mode: 'filter', dirty: true, ready: false,
      init() {
        // a procedural cat portrait, 48×48
        const c = mkCanvas(N, N), g = c.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 0, N); gr.addColorStop(0, '#9CC2EA'); gr.addColorStop(1, '#DCE3CC'); g.fillStyle = gr; g.fillRect(0, 0, N, N);
        g.fillStyle = '#6E8F4F'; g.fillRect(0, 40, N, 8);
        g.fillStyle = '#D8742B';
        g.beginPath(); g.moveTo(9, 20); g.lineTo(12, 4); g.lineTo(21, 13); g.fill();
        g.beginPath(); g.moveTo(39, 20); g.lineTo(36, 4); g.lineTo(27, 13); g.fill();
        g.beginPath(); g.ellipse(24, 26, 16, 14, 0, 0, TAU); g.fill();
        g.fillStyle = '#F3C9A0'; g.beginPath(); g.ellipse(24, 32, 8, 6, 0, 0, TAU); g.fill();
        g.fillStyle = '#E8A0A0'; g.beginPath(); g.moveTo(12.5, 8); g.lineTo(13.5, 15); g.lineTo(18, 13.5); g.fill(); g.beginPath(); g.moveTo(35.5, 8); g.lineTo(34.5, 15); g.lineTo(30, 13.5); g.fill();
        g.fillStyle = '#7FB04A'; g.beginPath(); g.ellipse(18, 23, 3.4, 3.8, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(30, 23, 3.4, 3.8, 0, 0, TAU); g.fill();
        g.fillStyle = '#1A120C'; g.fillRect(17.3, 20.5, 1.6, 5.5); g.fillRect(29.3, 20.5, 1.6, 5.5);
        g.fillStyle = '#C0505A'; g.beginPath(); g.moveTo(22, 29); g.lineTo(26, 29); g.lineTo(24, 31.5); g.fill();
        g.strokeStyle = '#2A1C13'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(24, 31.5); g.lineTo(24, 34); g.moveTo(24, 34); g.lineTo(21, 35.5); g.moveTo(24, 34); g.lineTo(27, 35.5);
        for (const s of [-1, 1]) for (const dy of [-1.5, 1]) { g.moveTo(24 + s * 6, 32 + dy * 0.5); g.lineTo(24 + s * 19, 30 + dy * 2.2); } g.stroke();
        g.fillStyle = '#B85A20'; for (const [x, y] of [[20, 14], [24, 13], [28, 14]]) { g.fillRect(x - 1, y, 2, 4); }
        const d = g.getImageData(0, 0, N, N).data;
        this.R = new Float32Array(N * N); this.G = new Float32Array(N * N); this.B = new Float32Array(N * N); this.L = new Float32Array(N * N);
        for (let p = 0; p < N * N; p++) { this.R[p] = d[p * 4] / 255; this.G[p] = d[p * 4 + 1] / 255; this.B[p] = d[p * 4 + 2] / 255; this.L[p] = 0.3 * this.R[p] + 0.59 * this.G[p] + 0.11 * this.B[p]; }
        this.picCanvas = c;
        // first-layer style filters (7×7): oriented stripes, colour blobs, spots
        const F = [];
        const gab = (th) => { const k = []; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const u = x * Math.cos(th) + y * Math.sin(th); k.push(Math.exp(-(x * x + y * y) / (2 * 2.0 * 2.0)) * Math.cos(TAU * u / 4.2)); } const mu = k.reduce((a, b) => a + b, 0) / 49; return k.map((v) => v - mu); };
        const blob = (s) => { const k = []; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) k.push(Math.exp(-(x * x + y * y) / (2 * s * s))); return k; };
        const dog = (sign) => { const a = blob(1.0), b = blob(2.4), sa = a.reduce((p, q) => p + q, 0), sb = b.reduce((p, q) => p + q, 0); return a.map((v, i) => sign * (v / sa - b[i] / sb) * 20); };
        F.push({ name: 'лежачие полоски', k: gab(Math.PI / 2), ch: 'L' }, { name: 'косые полоски /', k: gab(-Math.PI / 4), ch: 'L' }, { name: 'стоячие полоски', k: gab(0), ch: 'L' }, { name: 'косые полоски \\', k: gab(Math.PI / 4), ch: 'L' });
        F.push({ name: 'рыжее пятно', k: blob(1.6), ch: 'RB' }, { name: 'зелёное пятно', k: blob(1.6), ch: 'G' }, { name: 'тёмная точка', k: dog(-1), ch: 'L' }, { name: 'светлая точка', k: dog(1), ch: 'L' });
        this.F = F;
        this.ready = true;
      },
      chan(ch) { const n = N * N, o = new Float32Array(n); for (let p = 0; p < n; p++) o[p] = ch === 'L' ? this.L[p] - 0.5 : ch === 'RB' ? this.R[p] - this.B[p] - 0.15 : this.G[p] - (this.R[p] + this.B[p]) / 2 - 0.05; return o; },
      respond(fi) {
        const f = this.F[fi], src = this.chan(f.ch), out = new Float32Array(N * N);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const yy = clamp(y + a, 0, N - 1), xx = clamp(x + b, 0, N - 1); s += f.k[(a + 3) * 7 + b + 3] * src[yy * N + xx]; } out[y * N + x] = Math.max(0, s); }
        return out;
      },
      occlusion() {
        if (this.occ) return this.occ;
        // the "network" here is a cat template: blurred cat, mean removed. score = similarity with it.
        const T = new Float32Array(N * N * 3), I = new Float32Array(N * N * 3);
        const ch = [this.R, this.G, this.B];
        for (let c = 0; c < 3; c++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0, n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const yy = clamp(y + a, 0, N - 1), xx = clamp(x + b, 0, N - 1); s += ch[c][yy * N + xx]; n++; } T[c * N * N + y * N + x] = s / n; I[c * N * N + y * N + x] = ch[c][y * N + x]; }
        const mu = T.reduce((a, b) => a + b, 0) / T.length; for (let i = 0; i < T.length; i++) T[i] -= mu;
        const tn = Math.sqrt(T.reduce((a, b) => a + b * b, 0));
        const score = (img) => { let s = 0, nn = 0; const m2 = img.reduce((a, b) => a + b, 0) / img.length; for (let i = 0; i < img.length; i++) { const v = img[i] - m2; s += v * T[i]; nn += v * v; } return s / (Math.sqrt(nn) * tn + 1e-9); };
        const s0 = score(I), map = new Float32Array(N * N), cnt = new Float32Array(N * N), P = 7;
        for (let y0 = -4; y0 < N; y0 += 2) for (let x0 = -4; x0 < N; x0 += 2) {
          const J = I.slice();
          for (let c = 0; c < 3; c++) for (let y = Math.max(0, y0); y < Math.min(N, y0 + P); y++) for (let x = Math.max(0, x0); x < Math.min(N, x0 + P); x++) J[c * N * N + y * N + x] = 0.55;
          const drop = Math.max(0, s0 - score(J));
          for (let y = Math.max(0, y0); y < Math.min(N, y0 + P); y++) for (let x = Math.max(0, x0); x < Math.min(N, x0 + P); x++) { map[y * N + x] += drop; cnt[y * N + x]++; }
        }
        for (let i = 0; i < map.length; i++) map[i] /= Math.max(1, cnt[i]);
        { const srt = Array.from(map).sort((a, b) => a - b), lo = srt[Math.floor(srt.length * 0.35)], hi = srt[srt.length - 1]; for (let i = 0; i < map.length; i++) map[i] = Math.pow(clamp((map[i] - lo) / (hi - lo + 1e-9), 0, 1), 1.4); }
        this.s0 = s0; this.occ = map; return map;
      },
      draw(g) {
        if (!this.ready) this.init();
        // filter tiles
        const TS = 196, GX = 52, GY = 60, GAP = 30;
        this.F.forEach((f, i) => {
          const x0 = GX + (i % 4) * (TS + GAP), y0 = GY + Math.floor(i / 4) * (TS + GAP), mx = Math.max(...f.k.map(Math.abs)), c = TS / 7;
          for (let q = 0; q < 49; q++) {
            const v = f.k[q] / mx; let col;
            if (f.ch === 'L') col = [0.5 + 0.48 * v, 0.5 + 0.48 * v, 0.5 + 0.48 * v];
            else if (f.ch === 'RB') col = [0.5 + 0.45 * v, 0.5 + 0.1 * v, 0.5 - 0.35 * v];
            else col = [0.5 - 0.3 * v, 0.5 + 0.42 * v, 0.5 - 0.3 * v];
            g.fillStyle = css(col); g.fillRect(x0 + (q % 7) * c, y0 + Math.floor(q / 7) * c, c + 0.5, c + 0.5);
          }
          g.lineWidth = this.mode === 'filter' && i === this.sel ? 10 : 3; g.strokeStyle = this.mode === 'filter' && i === this.sel ? PAL.orange : PAL.ink; g.strokeRect(x0, y0, TS, TS);
          txt(g, String(i + 1), x0 + 10, y0 + 44, 38, { w: 700, c: '#FBF6EA' });
        });
        // picture and map
        const PY = 540, PS = 400, PX1 = 50, PX2 = 550;
        g.imageSmoothingEnabled = false; g.drawImage(this.picCanvas, PX1, PY, PS, PS); g.imageSmoothingEnabled = true;
        inkRect(g, PX1, PY, PS, PS, 4, PAL.ink, 3);
        txt(g, 'картинка', PX1, PY - 18, 40, { w: 700 });
        const map = this.mode === 'filter' ? this.respond(this.sel) : this.occlusion();
        const mx = Math.max(1e-6, ...map), cs = PS / N;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const p = y * N + x, v = map[p] / mx, l = this.L[p] * 0.35 + 0.1;
          const col = mixc([l, l, l * 1.1], v < 0.5 ? mixc([0.5, 0.15, 0.1], [0.95, 0.5, 0.15], v * 2) : mixc([0.95, 0.5, 0.15], [1, 0.95, 0.6], (v - 0.5) * 2), Math.min(1, v * 1.6));
          g.fillStyle = css(col); g.fillRect(PX2 + x * cs, PY + y * cs, cs + 0.5, cs + 0.5);
        }
        inkRect(g, PX2, PY, PS, PS, 4, PAL.ink, 5);
        txt(g, this.mode === 'filter' ? `где горит фильтр ${this.sel + 1}` : 'куда смотрела сеть', PX2, PY - 18, 40, { w: 700, maxW: PS + 20 });
      },
      tick() {},
      tap(x, y) {
        const TS = 196, GX = 52, GY = 60, GAP = 30;
        for (let i = 0; i < 8; i++) { const x0 = GX + (i % 4) * (TS + GAP), y0 = GY + Math.floor(i / 4) * (TS + GAP); if (x >= x0 && x <= x0 + TS && y >= y0 && y <= y0 + TS) { this.sel = i; this.mode = 'filter'; AUDIO.pluck(i / 4 - 1); this.sync(); return true; } }
        if (y > 520) { this.mode = this.mode === 'filter' ? 'occ' : 'filter'; this.sync(); return true; }
        return false;
      },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k.startsWith('f:')) { this.sel = +k.slice(2); this.mode = 'filter'; } if (k === 'occ') this.mode = 'occ'; },
      controls(box) { if (!this.ready) this.init(); box.innerHTML = this.F.map((f, i) => bt(String(i + 1), 'f:' + i)).join('') + bt('куда смотрела сеть', 'occ') + '<div class="info"></div>'; wire(box, this, () => ''); },
      syncExtra(box) { box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', this.mode === 'filter' ? b.dataset.b === 'f:' + this.sel : b.dataset.b === 'occ')); },
      infoText() { return this.mode === 'filter' ? `фильтр ${this.sel + 1}: <b>${this.F[this.sel].name}</b>. Светлое справа: здесь он сработал сильнее всего` : 'закрываем серым квадратиком кусок за куском: где уверенность «это кот» падает сильнее, там светлее. Глаза и уши решают'; },
    };
    models.push(m);
  }

  // =========================================================================
  // 9. Слова как векторы
  // =========================================================================
  {
    const DIMS = 10; // власть, женское, взрослый, малыш, человек, зверь, кошачье, еда, сладкое, город
    const RAW = {
      'король': [1, 0, 1, 0, 1, 0, 0, 0, 0, 0], 'королева': [1, 1, 1, 0, 1, 0, 0, 0, 0, 0],
      'мужчина': [0, 0, 1, 0, 1, 0, 0, 0, 0, 0], 'женщина': [0, 1, 1, 0, 1, 0, 0, 0, 0, 0],
      'принц': [0.8, 0, 0, 1, 1, 0, 0, 0, 0, 0], 'принцесса': [0.8, 1, 0, 1, 1, 0, 0, 0, 0, 0],
      'мальчик': [0, 0, 0, 1, 1, 0, 0, 0, 0, 0], 'девочка': [0, 1, 0, 1, 1, 0, 0, 0, 0, 0],
      'кот': [0, 0, 1, 0, 0, 1, 1, 0, 0, 0], 'кошка': [0, 1, 1, 0, 0, 1, 1, 0, 0, 0], 'котёнок': [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
      'собака': [0, 0, 1, 0, 0, 1, 0, 0, 0, 0], 'щенок': [0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      'яблоко': [0, 0, 0, 0, 0, 0, 0, 1, 0.5, 0], 'груша': [0, 0, 0, 0, 0, 0, 0, 1, 0.6, 0], 'торт': [0, 0, 0, 0, 0, 0, 0, 1, 1, 0], 'хлеб': [0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      'Москва': [0.5, 0, 0, 0, 0, 0, 0, 0, 0, 1], 'Париж': [0.4, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    };
    const R = mulberry(31), WORDS = Object.keys(RAW), V = {};
    for (const w of WORDS) V[w] = RAW[w].map((x) => x + (R() - 0.5) * 0.12);
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), norm = (a) => Math.sqrt(dot(a, a)), cos = (a, b) => dot(a, b) / (norm(a) * norm(b) + 1e-9);
    // карта: 10 чисел слова рисуем на плоскости одной и той же линейной проекцией,
    // поэтому сложение и вычитание векторов видно на карте стрелками
    //            власть жен  взросл малыш чел  зверь кошач еда  сладк город
    const PX = [0, 1.5, 0, 0, 0, 3.6, 0, -3.6, 0, -1.6];
    const PY = [1.5, 0, 1.0, -1.1, 0, 0, 1.6, 0, 2.0, -3.2];
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
    const EQ = [['король', 'мужчина', 'женщина'], ['принц', 'мальчик', 'девочка'], ['котёнок', 'кот', 'собака'], ['кошка', 'кот', 'король']];
    const R2 = mulberry(77), stars = []; for (let i = 0; i < 160; i++) stars.push([R2() * 1000, R2() * 1000, R2()]);
    const m = {
      eq: 0, sel: '', t: 0, dirty: true,
      calc() {
        const [a, b, c] = EQ[this.eq], v = V[a].map((x, i) => x - V[b][i] + V[c][i]);
        const ranked = WORDS.filter((w) => w !== a && w !== b && w !== c).map((w) => [w, cos(v, V[w])]).sort((p, q) => q[1] - p[1]);
        return { a, b, c, v, best: ranked[0] };
      },
      near(w) { return WORDS.filter((x) => x !== w).map((x) => [x, cos(V[w], V[x])]).sort((p, q) => q[1] - p[1]).slice(0, 3); },
      draw(g) {
        g.fillStyle = '#1B2245'; g.fillRect(16, 16, 968, 968);
        for (const [x, y, s] of stars) { g.fillStyle = `rgba(255,246,220,${0.2 + 0.5 * s * (0.6 + 0.4 * Math.sin(this.t * (1 + s * 2) + s * 30))})`; g.beginPath(); g.arc(x, y, 1 + s * 2, 0, TAU); g.fill(); }
        const E = this.calc(), pa = P2[E.a], pb = P2[E.b], pc = P2[E.c], pr = proj(E.v);
        const A = [sx(pa[0]), sy(pa[1])];
        const end = [sx(pr[0]), sy(pr[1])];
        // draw the vector −мужчина + женщина starting from король
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
      tap(x, y) { let b = '', bd = 60; for (const w of WORDS) { const l = LAB[w]; const d = Math.min(Math.hypot(sx(P2[w][0]) - x, sy(P2[w][1]) - y), x > l.x && x < l.x + l.wd && y > l.y && y < l.y + l.h ? 0 : 1e9); if (d < bd) { bd = d; b = w; } } if (!b) return false; this.sel = b; AUDIO.pluck(0.4); this.sync(); return true; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k.startsWith('eq:')) { this.eq = +k.slice(3); AUDIO.chime(true); } },
      controls(box) { box.innerHTML = EQ.map((e, i) => bt(`${e[0]} − ${e[1]} + ${e[2]}`, 'eq:' + i)).join('') + '<div class="info"></div>'; wire(box, this, () => ''); },
      syncExtra(box) { box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'eq:' + this.eq)); },
      infoText() { if (!this.sel) return 'у каждого слова 10 чисел (власть, женское, взрослое, зверь, еда…). Карта рисует их на плоскости. Ткни слово'; return `ближе всего к «${this.sel}»: ` + this.near(this.sel).map(([w, s]) => `${w} <b>${f2(s)}</b>`).join(', '); },
    };
    m._calc = () => m.calc();
    models.push(m);
  }

  // =========================================================================
  // 10. Внимание: слова-фонари и нити
  // =========================================================================
  {
    // ключи (k) и вопросы (q) в 4 числах: [живое, предмет, действие, служебное]
    const K4 = { 'кот': [3, 0, 0.3, 0], 'лёг': [0.3, 0, 2.5, 0], 'на': [0, 0, 0, 1.5], 'ковёр': [0, 3, 0, 0], 'потому': [0, 0, 0, 1.5], 'что': [0, 0, 0, 1.5], 'он': [0, 0, 0, 0.8], 'устал': [0.5, 0, 1.6, 0], 'мягкий': [0, 0.6, 0.4, 0] };
    const Q4 = { 'кот': [0, 0, 2.2, 0], 'лёг': [1.6, 1.4, 0, 0], 'на': [0, 2.2, 0, 0], 'ковёр': [0, 0, 1.6, 0.6], 'потому': [0, 0, 1.6, 0.6], 'что': [0, 0, 1.0, 1.2], 'устал': [2.0, 0, 0, 0], 'мягкий': [0, 2.0, 0, 0] };
    const ABOUT = { 'устал': [1, 0, 0, 0], 'мягкий': [0, 1, 0, 0] }; // о ком обычно бывает это слово
    const m = {
      end: 'устал', sel: 6, t: 0, dirty: true,
      words() { return ['кот', 'лёг', 'на', 'ковёр', 'потому', 'что', 'он', this.end]; },
      query(w) { if (w === 'он') return ABOUT[this.end].map((x) => x * 2.2); return Q4[w]; },
      att(i) { const W = this.words(), q = this.query(W[i]); const sc = W.map((w) => K4[w].reduce((s, k, j) => s + k * q[j], 0) / 2); return { sc, p: softmax(sc) }; },
      pos() { const W = this.words(), out = []; const r1 = W.slice(0, 4), r2 = W.slice(4); const c = mkCanvas(8, 8).getContext('2d'); c.font = `700 52px ${SANS}`;
        for (const [row, y, off] of [[r1, 300, 0], [r2, 720, 4]]) { const ws = row.map((w) => c.measureText(w).width + 60), tot = ws.reduce((a, b) => a + b, 0) + (row.length - 1) * 30; let x = 500 - tot / 2; row.forEach((w, k) => { out[off + k] = [x + ws[k] / 2, y, ws[k]]; x += ws[k] + 30; }); }
        return out; },
      draw(g) {
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
      tap(x, y) { const P = this.pos(); let b = -1; P.forEach(([px, py, wd], j) => { if (Math.abs(x - px) < wd / 2 + 10 && Math.abs(y - py) < 60) b = j; }); if (b < 0) return false; this.sel = b; AUDIO.pluck(b / 4 - 1); this.sync(); return true; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k.startsWith('w:')) this.sel = +k.slice(2); if (k === 'end') { this.end = this.end === 'устал' ? 'мягкий' : 'устал'; AUDIO.chime(true); } },
      controls(box) { box.innerHTML = this.words().map((w, i) => bt(w, 'w:' + i)).join('') + bt('поменять конец: ' + (this.end === 'устал' ? 'мягкий' : 'устал'), 'end') + '<div class="info"></div>'; wire(box, this, () => ''); },
      syncExtra(box) { const W = this.words(); box.querySelectorAll('[data-b^="w:"]').forEach((b) => { const i = +b.dataset.b.slice(2); b.textContent = W[i]; b.classList.toggle('on', i === this.sel); }); box.querySelector('[data-b="end"]').textContent = 'конец фразы: ' + (this.end === 'устал' ? '«мягкий»' : '«устал»'); },
      infoText() { const W = this.words(), { sc, p } = this.att(this.sel); const top = W.map((w, j) => [w, sc[j], p[j]]).filter((_, j) => j !== this.sel).sort((a, b) => b[2] - a[2]).slice(0, 2); return `сходство вопроса «${W[this.sel]}» с ключами: ` + top.map(([w, s, q]) => `${w} ${f1(s)} → <b>${pct(q)}</b>`).join(', ') + (W[this.sel] === 'он' ? `. Конец «${this.end}» подмешан в вопрос «он»: так делают прошлые слои` : ''); },
    };
    m._att = (i) => m.att(i);
    models.push(m);
  }

  // =========================================================================
  // 11. Языковая модель: дерево продолжений и температура
  // =========================================================================
  {
    const L1 = [['окне', 2.2], ['диване', 1.8], ['крыше', 1.3], ['ковре', 1.0], ['луне', -1.2]];
    const L2 = {
      'окне': [['и смотрит на птиц', 1.8], ['и спит', 1.4], ['весь день', 1.1], ['как начальник', -0.6]],
      'диване': [['и спит', 2.0], ['и мурчит', 1.4], ['весь день', 1.0], ['с пультом', -0.9]],
      'крыше': [['и смотрит на звёзды', 1.6], ['и орёт', 1.2], ['под дождём', 0.8], ['с биноклем', -1.1]],
      'ковре': [['и спит', 1.6], ['и вылизывается', 1.5], ['и рвёт его', 0.9], ['в позе йоги', -0.7]],
      'луне': [['в скафандре', 0.8], ['и ест сыр', 0.6], ['и машет нам', 0.5], ['без визы', 0.2]],
    };
    const m = {
      T: 1.0, a: 0, b: -1, anim: null, phrase: '', count: 0, dirty: true,
      p1() { return softmax(L1.map(([, l]) => l / this.T)); },
      p2(a) { return softmax(L2[L1[a][0]].map(([, l]) => l / this.T)); },
      draw(g) {
        const p1 = this.p1(), a = this.a, p2 = this.p2(a), list = L2[L1[a][0]];
        const RB = [28, 410, 214, 270], X1 = 280, W1 = 285, X2 = 610, W2 = 360;
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
        ['Кот', 'сидит', 'на'].forEach((w, k) => txt(g, w, RB[0] + RB[2] / 2, RB[1] + 82 + k * 70, 50, { a: 'center', w: 700, serif: true, maxW: RB[2] - 20 }));
        L1.forEach(([w], i) => {
          const y = ys[i], hi = i === a;
          g.fillStyle = hi ? '#F8D990' : PAL.paper; rr(g, X1, y - 62, W1, 124, 16); g.fill(); g.lineWidth = hi ? 5 : 3; g.strokeStyle = PAL.ink; rr(g, X1, y - 62, W1, 124, 16); g.stroke();
          txt(g, w, X1 + 18, y - 4, 46, { w: 700 });
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
        else if (A.stage === 1 && A.t > 0.12) { A.t = 0; A.spin++; this.b = A.spin < 8 ? Math.floor(Math.random() * 4) : A.b; AUDIO.pluck(this.b / 3 - 0.3, 0.6); if (A.spin >= 8) { this.anim = null; this.count++; this.phrase = `Кот сидит на ${L1[this.a][0]} ${L2[L1[this.a][0]][this.b][0]}`; AUDIO.chime(true); this.sync(); } this.dirty = true; }
      },
      gen() { const a = this.sample(this.p1()), b = this.sample(this.p2(a)); this.anim = { stage: 0, t: 0, spin: 0, a, b }; this.phrase = ''; },
      tap(x, y) { if (x > 260 && x < 570) { const i = Math.round((y - 190) / 160); if (i >= 0 && i < 5) { this.a = i; this.b = -1; this.phrase = ''; AUDIO.pluck(i / 3 - 0.7); this.sync(); return true; } } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k === 'gen' && !this.anim) this.gen(); },
      controls(box) { box.innerHTML = sl('температура', 'T', 0.1, 2.5, 0.05, this.T) + bt('сгенерировать', 'gen') + '<div class="info"></div>'; wire(box, this, (k, v) => f2(v)); },
      infoText() { const p = this.p1(); const t = this.T < 0.4 ? 'холодно: почти всегда «окне»' : this.T > 1.6 ? 'жарко: и на луну залезет' : 'тепло: обычно разумно, иногда чудит'; return `${t} · «${L1[0][0]}» ${pct(p[0])}, «луне» ${pct(p[4])}${this.phrase ? `<br>последняя фраза: <b>${this.phrase}</b>` : ''}`; },
    };
    models.push(m);
  }

  // =========================================================================
  // 12. Диффузия: картинка тонет в шуме и проявляется обратно
  // =========================================================================
  {
    const N = 32, D3 = N * N * 3;
    const draws = {
      'дом': (g) => { g.fillStyle = '#9CC2EA'; g.fillRect(0, 0, N, N); g.fillStyle = '#6E8F4F'; g.fillRect(0, 25, N, 7); g.fillStyle = '#E3B1A1'; g.fillRect(8, 14, 16, 12); g.fillStyle = '#BF3F2C'; g.beginPath(); g.moveTo(5, 15); g.lineTo(16, 5); g.lineTo(27, 15); g.fill(); g.fillStyle = '#5B4331'; g.fillRect(14, 19, 4, 7); g.fillStyle = '#FFE08A'; g.fillRect(10, 17, 3, 3); g.fillRect(20, 17, 3, 3); },
      'солнце': (g) => { g.fillStyle = '#4E3F6E'; g.fillRect(0, 0, N, N); g.fillStyle = '#E3B1A1'; g.fillRect(0, 20, N, 12); g.fillStyle = '#F1BF4A'; g.beginPath(); g.arc(16, 18, 8, 0, TAU); g.fill(); g.fillStyle = '#3C8783'; g.fillRect(0, 26, N, 6); },
      'ёлка': (g) => { g.fillStyle = '#EFE3C9'; g.fillRect(0, 0, N, N); g.fillStyle = '#3F6E66'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(16, 3 + k * 7); g.lineTo(6 - k * 1, 14 + k * 7); g.lineTo(26 + k * 1, 14 + k * 7); g.fill(); } g.fillStyle = '#A8784C'; g.fillRect(14, 27, 4, 5); g.fillStyle = '#BF3F2C'; g.fillRect(12, 15, 2, 2); g.fillRect(19, 21, 2, 2); },
      'кот': (g) => { g.fillStyle = '#DCE3CC'; g.fillRect(0, 0, N, N); g.fillStyle = '#2A1C13'; g.beginPath(); g.moveTo(7, 12); g.lineTo(9, 3); g.lineTo(14, 9); g.fill(); g.beginPath(); g.moveTo(25, 12); g.lineTo(23, 3); g.lineTo(18, 9); g.fill(); g.beginPath(); g.ellipse(16, 17, 11, 10, 0, 0, TAU); g.fill(); g.fillStyle = '#F1BF4A'; g.beginPath(); g.arc(12, 15, 2.5, 0, TAU); g.arc(20, 15, 2.5, 0, TAU); g.fill(); g.fillStyle = '#E3B1A1'; g.fillRect(15, 19, 2, 2); },
    };
    const NAMES = Object.keys(draws);
    const abar = (t) => Math.max(1e-4, Math.cos(t * Math.PI / 2) ** 2);
    const m = {
      src: 'дом', t: 0.6, x: null, guess: null, w: null, run: null, ready: false, seed: 1, dirty: true,
      init() {
        this.gal = {}; this.cv = mkCanvas(N, N); this.cv2 = mkCanvas(N, N); this.thumbs = {};
        for (const n of NAMES) { const c = mkCanvas(N, N), g = c.getContext('2d'); draws[n](g); const d = g.getImageData(0, 0, N, N).data, v = new Float32Array(D3); for (let p = 0; p < N * N; p++) for (let ch = 0; ch < 3; ch++) v[ch * N * N + p] = d[p * 4 + ch] / 127.5 - 1; this.gal[n] = v; this.thumbs[n] = c; }
        this.newNoise(); this.ready = true; this.forward();
      },
      newNoise() { const R = mulberry(this.seed++ * 7919), e = new Float32Array(D3); for (let i = 0; i < D3; i++) e[i] = gauss(R); this.eps = e; },
      forward() { const a = abar(this.t), s = Math.sqrt(a), r = Math.sqrt(1 - a), x0 = this.gal[this.src], x = new Float32Array(D3); for (let i = 0; i < D3; i++) x[i] = s * x0[i] + r * this.eps[i]; this.x = x; this.denoise(); },
      // denoiser that remembers four pictures: weights over the gallery (softened /30, so it doubts longer, like a real net), then the expected picture
      denoise() {
        const a = abar(this.t), s = Math.sqrt(a), x = this.x, lg = NAMES.map((n) => { const g0 = this.gal[n]; let d = 0; for (let i = 0; i < D3; i++) { const u = x[i] - s * g0[i]; d += u * u; } return -d / (2 * Math.max(1e-4, 1 - a)) / 30; });
        this.w = softmax(lg); const gs = new Float32Array(D3); NAMES.forEach((n, k) => { const g0 = this.gal[n], wk = this.w[k]; for (let i = 0; i < D3; i++) gs[i] += wk * g0[i]; }); this.guess = gs;
      },
      paint(cv, v) { const g = cv.getContext('2d'), id = g.createImageData(N, N); for (let p = 0; p < N * N; p++) { for (let ch = 0; ch < 3; ch++) id.data[p * 4 + ch] = clamp((v[ch * N * N + p] + 1) * 127.5, 0, 255); id.data[p * 4 + 3] = 255; } g.putImageData(id, 0, 0); },
      draw(g) {
        if (!this.ready) this.init();
        this.paint(this.cv, this.x); this.paint(this.cv2, this.guess);
        g.imageSmoothingEnabled = false;
        g.drawImage(this.cv, 40, 90, 580, 580); inkRect(g, 40, 90, 580, 580, 5, PAL.ink, 3);
        txt(g, this.run ? 'проявляем из шума' : 'картинка в шуме', 40, 68, 42, { w: 700 });
        g.drawImage(this.cv2, 660, 130, 300, 300); inkRect(g, 660, 130, 300, 300, 4, PAL.ink, 4);
        g.imageSmoothingEnabled = true;
        txt(g, 'догадка сети', 660, 112, 40, { w: 700, c: PAL.inkSoft });
        const nz = 1 - abar(this.t);
        txt(g, 'шум', 660, 510, 42, { w: 700 });
        g.fillStyle = PAL.paperShade; g.fillRect(660, 530, 300, 40); g.fillStyle = PAL.inkSoft; g.fillRect(660, 530, 300 * nz, 40); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.strokeRect(660, 530, 300, 40);
        txt(g, pct(nz), 960, 510, 44, { a: 'right', w: 700 });
        txt(g, 'на что похоже:', 40, 735, 40, { w: 700, c: PAL.inkSoft });
        NAMES.forEach((n, k) => {
          const x = 40 + k * 235, y = 760, TS = 124;
          g.imageSmoothingEnabled = false; g.drawImage(this.thumbs[n], x, y, TS, TS); g.imageSmoothingEnabled = true;
          g.lineWidth = n === this.src && !this.run ? 8 : 3; g.strokeStyle = n === this.src && !this.run ? PAL.orange : PAL.ink; g.strokeRect(x, y, TS, TS);
          txt(g, pct(this.w[k]), x + TS + 6, y + 56, 38, { w: 700, c: this.w[k] > 0.5 ? '#A8321F' : PAL.ink, maxW: 98 });
          txt(g, n, x, y + TS + 48, 38, { c: PAL.ink, w: 600 });
          g.fillStyle = rgba(PAL.orange, 0.8); g.fillRect(x + TS + 6, y + 76, 90 * this.w[k], 14);
        });
      },
      tick(dt) {
        if (!this.run) return;
        this.run.t += dt; if (this.run.t < 0.07) return; this.run.t = 0;
        // one DDIM step from t to t − 1/40, using the denoiser's guess
        const t0 = this.t, t1 = Math.max(0, t0 - 1 / 40), a0 = abar(t0), a1 = t1 <= 0 ? 1 : abar(t1);
        this.denoise();
        const x = this.x, x0 = this.guess, nx = new Float32Array(D3), s0 = Math.sqrt(a0), r0 = Math.sqrt(Math.max(1e-6, 1 - a0));
        for (let i = 0; i < D3; i++) { const e = (x[i] - s0 * x0[i]) / r0; nx[i] = Math.sqrt(a1) * x0[i] + Math.sqrt(1 - a1) * e; }
        this.x = nx; this.t = t1; this.denoise();
        if (this.t <= 0) { this.run = null; this.src = NAMES[this.w.indexOf(Math.max(...this.w))]; AUDIO.chime(true); this.sync(); }
        else { AUDIO.pluck(1 - this.t * 2, 0.4); if (Math.round(this.t * 40) % 5 === 0) this.sync(); }
        this.dirty = true;
      },
      tap(x, y) { if (y > 750 && y < 960) { const k = Math.floor((x - 40) / 235); if (k >= 0 && k < 4) { this.src = NAMES[k]; this.run = null; this.forward(); this.sync(); return true; } } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k === 't') { this.run = null; this.forward(); } },
      press(k) {
        if (!this.ready) this.init();
        if (k === 'gen') { this.newNoise(); this.t = 1; this.x = this.eps.slice(); this.denoise(); this.run = { t: 0 }; }
        if (k.startsWith('p:')) { this.src = k.slice(2); this.run = null; this.forward(); }
      },
      controls(box) { box.innerHTML = sl('утопить в шуме', 't', 0, 1, 0.01, this.t) + bt('проявить из чистого шума', 'gen') + NAMES.map((n) => bt(n, 'p:' + n)).join('') + '<div class="info"></div>'; wire(box, this, (k, v) => pct(1 - abar(v))); },
      syncExtra(box) { box.querySelectorAll('[data-b^="p:"]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'p:' + this.src && !this.run)); },
      infoText() { return this.run ? `шаг ${40 - Math.round(this.t * 40)} из 40: каждый шаг чуть чистит шум по догадке сети` : 'сеть здесь выучила четыре картинки. Из чистого шума она каждый раз проявит одну из них, какую, решает случай'; },
    };
    m._init = () => m.init();
    models.push(m);
  }

  // =========================================================================
  // 13. Обучение наградой: собака, лабиринт и косточка
  // =========================================================================
  {
    const MAP = ['S...#.', '##.#..', '...#.#', '.#....', '.###L.', '.....B'];
    const NR = 6, NC = 6, A = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const m = {
      Q: null, eps: 0.2, ep: 0, lastLen: 0, pos: [0, 0], steps: 0, play: false, fast: 0, t: 0, trail: [], dirty: true, bestLen: null,
      reset() { this.Q = Array.from({ length: NR * NC }, () => [0, 0, 0, 0]); this.ep = 0; this.lastLen = 0; this.pos = [0, 0]; this.steps = 0; this.play = false; this.fast = 0; this.trail = []; this.bestLen = null; },
      cell(r, c) { return MAP[r][c]; },
      stepOnce() {
        const [r, c] = this.pos, s = r * NC + c, q = this.Q[s];
        let a; if (Math.random() < this.eps) a = Math.floor(Math.random() * 4); else { const mx = Math.max(...q), best = [0, 1, 2, 3].filter((k) => q[k] === mx); a = best[Math.floor(Math.random() * best.length)]; }
        let nr = r + A[a][0], nc = c + A[a][1], rew = -0.04, done = false;
        if (nr < 0 || nc < 0 || nr >= NR || nc >= NC || MAP[nr][nc] === '#') { nr = r; nc = c; rew = -0.08; }
        const ch = MAP[nr][nc];
        if (ch === 'B') { rew = 1; done = true; } else if (ch === 'L') rew = -0.5;
        const ns = nr * NC + nc, target = rew + (done ? 0 : 0.9 * Math.max(...this.Q[ns]));
        q[a] += 0.5 * (target - q[a]);
        this.pos = [nr, nc]; this.steps++; this.trail.push([nr, nc]); if (this.trail.length > 30) this.trail.shift();
        if (done || this.steps >= 120) { this.ep++; this.lastLen = this.steps; if (done && (this.bestLen === null || this.steps < this.bestLen)) this.bestLen = this.steps; this.pos = [0, 0]; this.steps = 0; this.trail = []; return done ? 'bone' : 'tired'; }
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
          if (ch === 'L') { g.fillStyle = 'rgba(62,143,196,0.55)'; g.beginPath(); g.ellipse(x + C / 2, y + C / 2, 55, 34, 0, 0, TAU); g.fill(); txt(g, 'лужа', x + C / 2, y + C - 14, 32, { a: 'center', c: '#23336E', w: 700 }); }
          if (ch === 'B') { g.save(); g.translate(x + C / 2, y + C / 2); g.rotate(-0.5); g.fillStyle = '#FBF6EA'; g.strokeStyle = PAL.ink; g.lineWidth = 4; g.beginPath(); g.rect(-38, -10, 76, 20); for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.moveTo(sx * 40 + 12, sy * 12); g.arc(sx * 40, sy * 12, 13, 0, TAU); } g.fill(); g.stroke(); g.restore(); continue; }
          if (ch !== 'B' && (q[0] || q[1] || q[2] || q[3])) {
            const a = q.indexOf(Math.max(...q)), conf = Math.min(1, Math.max(0, v) / vmax), L = 30 + 30 * conf;
            arrow(g, x + C / 2 - A[a][1] * L * 0.6, y + C / 2 - A[a][0] * L * 0.6, x + C / 2 + A[a][1] * L, y + C / 2 + A[a][0] * L, 6 + 4 * conf, v > 0 ? '#2F5F2A' : '#9A4A3A', 26);
          }
          g.strokeStyle = rgba(PAL.inkFaint, 0.5); g.lineWidth = 2; g.strokeRect(x, y, C, C);
        }
        inkRect(g, X0, Y0, C * NC, C * NR, 5, PAL.ink, 7);
        txt(g, 'старт', X0 + 8, Y0 + 36, 30, { w: 700, c: PAL.inkSoft });
        // trail and the dog
        if (this.trail.length > 1) quickStroke(g, this.trail.map(([r, c]) => [X0 + c * C + C / 2, Y0 + r * C + C / 2]), 5, rgba(PAL.orange, 0.5), 1, [8, 8]);
        const [r, c] = this.pos, dx = X0 + c * C + C / 2, dy = Y0 + r * C + C / 2;
        g.fillStyle = '#A8784C'; g.beginPath(); g.ellipse(dx - 30, dy - 18, 14, 26, 0.5, 0, TAU); g.ellipse(dx + 30, dy - 18, 14, 26, -0.5, 0, TAU); g.fill();
        g.fillStyle = '#D9A86C'; g.beginPath(); g.arc(dx, dy, 34, 0, TAU); g.fill(); g.lineWidth = 4; g.strokeStyle = PAL.ink; g.stroke();
        g.fillStyle = PAL.ink; g.beginPath(); g.arc(dx - 12, dy - 6, 5, 0, TAU); g.arc(dx + 12, dy - 6, 5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(dx, dy + 10, 9, 6, 0, 0, TAU); g.fill();
        txt(g, `прогулок ${this.ep}${this.lastLen ? ` · последняя ${this.lastLen} шагов` : ''}`, 500, 62, 42, { a: 'center', w: 700, maxW: 900 });
      },
      tick(dt) {
        if (this.fast > 0) { let n = 0; while (this.fast > 0 && n < 4000) { const e = this.stepOnce(); n++; if (e === 'bone' || e === 'tired') this.fast--; } if (this.fast <= 0) { AUDIO.chime(true); this.sync(); } this.dirty = true; return; }
        if (!this.play) return;
        this.t += dt; if (this.t < 0.13) return; this.t = 0;
        const e = this.stepOnce(); this.dirty = true;
        if (e === 'bone') { AUDIO.chime(true); this.sync(); } else if (e === 'splash') AUDIO.pluck(-1); else AUDIO.pluck(0.2, 0.3);
      },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k === 'play') this.play = !this.play; if (k === 'fast') { this.fast = 20; this.play = false; } if (k === 'reset') this.reset(); },
      controls(box) { box.innerHTML = bt('▶ гулять', 'play') + bt('▶▶ 20 прогулок', 'fast') + bt('заново', 'reset') + sl('любопытство', 'eps', 0, 0.6, 0.05, this.eps) + '<div class="info"></div>'; wire(box, this, (k, v) => pct(v)); },
      syncExtra(box) { const b = box.querySelector('[data-b="play"]'); b.classList.toggle('on', this.play); b.textContent = this.play ? '❚❚ пауза' : '▶ гулять'; },
      infoText() { const gl = this.greedyLen(); return `прогулок <b>${this.ep}</b>${gl ? ` · по стрелкам до косточки <b>${gl}</b> шагов` : ' · стрелки пока не довели до косточки'} · косточка +1, лужа −0,5, шаг −0,04`; },
    };
    m.reset();
    models.push(m);
  }

  models.forEach((m, i) => { m.n = i + 1; if (!m.sync) m.sync = () => { m.dirty = true; }; });
  return models;
}
