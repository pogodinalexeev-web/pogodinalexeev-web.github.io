// Три живые модели сада «Машинное обучение с нуля». Каждая рисует себя на холсте 1000×1000 (доска на стенде),
// считает по-настоящему и отдаёт кнопки для карточки. Один герой на всех: таблица роста ромашки, 12 измерений.
export const BW = 1000, BH = 1000;

// ---------------------------------------------------------------------------
// Данные: день после посадки → высота ромашки в см. Эти же числа стоят в course.json.
// ---------------------------------------------------------------------------
export const DAYS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
export const HGT = [10, 17, 25, 29, 34, 36, 40, 41, 43, 45, 45, 46];
export const POCKET = [2, 6, 10]; // дни 6, 14, 22 лежат в кармане для проверки
export const TRAIN = DAYS.map((_, i) => i).filter((i) => !POCKET.includes(i));
const r1 = (v) => Math.round(v * 10) / 10;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
export const errOf = (f, idx) => idx.reduce((s, i) => s + Math.abs(HGT[i] - f(DAYS[i])), 0);
// подбор: перебираем наклон a (и изгиб c), сдвиг b берём серединой остатков; ошибка = сумма промахов по 9 учебным точкам
export function fitLine() {
  let best = null;
  for (let ai = 0; ai <= 300; ai++) {
    const a = ai / 100, b = r1(median(TRAIN.map((i) => HGT[i] - a * DAYS[i]))), e = errOf((d) => a * d + b, TRAIN);
    if (!best || e < best.e - 1e-9) best = { a, b, c: 0, e };
  }
  return best;
}
export function fitQuad() {
  let best = null;
  for (let ci = -200; ci <= 0; ci++) {
    const c = ci / 1000;
    for (let ai = 0; ai <= 500; ai++) {
      const a = ai / 100, b = r1(median(TRAIN.map((i) => HGT[i] - a * DAYS[i] - c * DAYS[i] * DAYS[i]))), e = errOf((d) => a * d + b + c * d * d, TRAIN);
      if (!best || e < best.e - 1e-9) best = { a, b, c, e };
    }
  }
  return best;
}

export function makeModels(K) {
  const { PAL, SERIF, SANS, inkStroke, quickStroke, inkRect, inkCircle, rgba, fmt, clamp, lerp, AUDIO } = K;
  const SHOT = !!K.SHOT; // кадры для проверки: анимации сразу в конечное состояние
  const TAU = Math.PI * 2;
  const nf = (v, d = 1) => { const r = Math.round(v * 10 ** d) / 10 ** d; return Number.isInteger(r) ? String(r).replace('-', '−') : fmt(r, d).replace(/0+$/, ''); };

  function txt(g, s, x, y, size = 44, o = {}) {
    g.font = `${o.w || 600} ${o.i ? 'italic ' : ''}${size}px ${o.serif ? SERIF : SANS}`;
    g.fillStyle = o.c || PAL.ink; g.textAlign = o.a || 'left'; g.textBaseline = o.b || 'alphabetic';
    if (o.maxW) { let f = size; while (f > 24 && g.measureText(s).width > o.maxW) { f -= 2; g.font = `${o.w || 600} ${o.i ? 'italic ' : ''}${f}px ${o.serif ? SERIF : SANS}`; } }
    g.fillText(s, x, y);
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function pill(g, s, x, y, size = 44, o = {}) {
    g.font = `${o.w || 700} ${size}px ${o.serif ? SERIF : SANS}`;
    if (o.maxW) { while (size > 24 && g.measureText(s).width + size * 0.9 > o.maxW) { size -= 2; g.font = `${o.w || 700} ${size}px ${o.serif ? SERIF : SANS}`; } }
    const w = g.measureText(s).width + size * 0.9, h = size * 1.45;
    const x0 = o.a === 'center' ? x - w / 2 : o.a === 'right' ? x - w : x;
    g.fillStyle = o.bg || PAL.paper; g.globalAlpha = o.alpha ?? 0.95; rr(g, x0, y - h * 0.72, w, h, 14); g.fill(); g.globalAlpha = 1;
    g.lineWidth = 3; g.strokeStyle = o.border || PAL.ink; rr(g, x0, y - h * 0.72, w, h, 14); g.stroke();
    g.fillStyle = o.c || PAL.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x0 + size * 0.45, y + size * 0.05);
    return { x0, w, h };
  }
  function arrow(g, x0, y0, x1, y1, w, c, head = 22) {
    quickStroke(g, [[x0, y0], [x1, y1]], w, c);
    const a = Math.atan2(y1 - y0, x1 - x0);
    g.fillStyle = c; g.beginPath(); g.moveTo(x1 + Math.cos(a) * head * 0.4, y1 + Math.sin(a) * head * 0.4);
    g.lineTo(x1 - Math.cos(a - 0.45) * head, y1 - Math.sin(a - 0.45) * head); g.lineTo(x1 - Math.cos(a + 0.45) * head, y1 - Math.sin(a + 0.45) * head); g.closePath(); g.fill();
  }
  const C_TRAIN = PAL.orange, C_POCKET = '#2F6EB5', C_MISS = PAL.red, C_LINE = '#2F7A35', C_RULE = '#8E3B9E';

  // таблица: T = {x, y, rh, fs, cols:[{t, w, v(i), c}]}, o.rows (сколько строк), o.bg(i) цвет фона строки, o.alpha
  function table(g, T, o = {}) {
    const W = T.cols.reduce((s, c) => s + c.w, 0), n = o.rows ?? 12;
    g.save(); g.globalAlpha = o.alpha ?? 1;
    g.fillStyle = PAL.paperShade; g.fillRect(T.x, T.y, W, T.rh);
    for (let i = 0; i < n; i++) {
      const y = T.y + T.rh * (i + 1), bg = o.bg ? o.bg(i) : i % 2 ? 'rgba(226,209,176,0.35)' : 'rgba(251,246,234,0.6)';
      if (bg) { g.fillStyle = bg; g.fillRect(T.x, y, W, T.rh); }
    }
    let x = T.x;
    T.cols.forEach((c, k) => {
      txt(g, c.t, x + c.w / 2, T.y + T.rh * 0.68, c.hfs || T.fs * 0.82, { a: 'center', w: 700, c: c.hc || PAL.ink, maxW: c.w - 10 });
      for (let i = 0; i < n; i++) { const s = c.v(i); if (s !== '') txt(g, s, x + c.w / 2, T.y + T.rh * (i + 1.7), T.fs, { a: 'center', w: c.bold ? 700 : 600, c: (c.c && c.c(i)) || PAL.ink }); }
      if (k) quickStroke(g, [[x, T.y], [x, T.y + T.rh * (n + 1)]], 2, rgba(PAL.inkSoft, 0.7));
      x += c.w;
    });
    for (let i = 1; i <= n; i++) quickStroke(g, [[T.x, T.y + T.rh * i], [T.x + W, T.y + T.rh * i]], i === 1 ? 3 : 1.2, rgba(PAL.inkSoft, i === 1 ? 0.9 : 0.4));
    inkRect(g, T.x, T.y, W, T.rh * (n + 1), 4, PAL.ink, 3);
    g.restore();
    return { W, rowY: (i) => T.y + T.rh * (i + 1.5), x1: T.x + W };
  }
  const COL_DAY = (w, t = 'день') => ({ t, w, v: (i) => String(DAYS[i]) });
  const COL_H = (w, t = 'высота, см') => ({ t, w, v: (i) => String(HGT[i]), bold: true });

  // поле: день вправо, высота вверх. F = {X0, Y0, X1, Y1, xmax, ymax}
  function plot(g, F, o = {}) {
    const { X0, Y0, X1, Y1, xmax, ymax } = F, fs = o.fs || 30;
    const sx = (d) => X0 + (X1 - X0) * d / xmax, sy = (h) => Y1 - (Y1 - Y0) * h / ymax;
    g.save(); g.globalAlpha = o.alpha ?? 1;
    g.fillStyle = 'rgba(251,246,234,0.7)'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    const xs = xmax > 30 ? 10 : 4, ys = ymax > 60 ? 20 : 10;
    for (let d = xs; d < xmax; d += xs) quickStroke(g, [[sx(d), Y0], [sx(d), Y1]], 1.4, rgba(PAL.inkFaint, 0.45), 1, [6, 8]);
    for (let h = ys; h < ymax; h += ys) quickStroke(g, [[X0, sy(h)], [X1, sy(h)]], 1.4, rgba(PAL.inkFaint, 0.45), 1, [6, 8]);
    if (o.edge) {
      g.fillStyle = 'rgba(42,28,19,0.16)'; g.fillRect(sx(24), Y0, X1 - sx(24), Y1 - Y0);
      g.save(); g.beginPath(); g.rect(sx(24), Y0, X1 - sx(24), Y1 - Y0); g.clip(); g.strokeStyle = 'rgba(42,28,19,0.22)'; g.lineWidth = 2;
      for (let k = -30; k < 40; k++) { const x = sx(24) + k * 26; g.beginPath(); g.moveTo(x, Y1); g.lineTo(x + (Y1 - Y0), Y0); g.stroke(); }
      g.restore();
      quickStroke(g, [[sx(24), Y0], [sx(24), Y1]], 4, PAL.ink, 1, [12, 8]);
      if (X1 - sx(24) > 200 && o.edgeLab !== false) txt(g, 'за краем данных', (sx(24) + X1) / 2, Y0 + 44, 36, { a: 'center', w: 700, c: PAL.inkSoft });
    }
    inkRect(g, X0, Y0, X1 - X0, Y1 - Y0, 4, PAL.ink, 2);
    if (o.lab !== false) {
      for (let d = 0; d <= xmax; d += xs) txt(g, String(d), sx(d), Y1 + fs * 1.05, fs, { a: 'center', c: PAL.inkSoft });
      for (let h = ys; h <= ymax; h += ys) txt(g, String(h), X0 - 10, sy(h) + fs * 0.33, fs, { a: 'right', c: PAL.inkSoft });
      txt(g, 'день →', X1, Y1 + fs * 2.2, fs * 1.15, { a: 'right', w: 700 });
      g.save(); g.translate(X0 - fs * 2.1, (Y0 + Y1) / 2); g.rotate(-Math.PI / 2); txt(g, 'высота, см →', 0, 0, fs * 1.15, { a: 'center', w: 700 }); g.restore();
    }
    g.save(); g.beginPath(); g.rect(X0, Y0, X1 - X0, Y1 - Y0); g.clip();
    if (o.f) {
      // промахи учебных точек: красные палочки от точки до линии
      if (o.miss) for (const i of TRAIN) quickStroke(g, [[sx(DAYS[i]), sy(HGT[i])], [sx(DAYS[i]), sy(o.f(DAYS[i]))]], 5, rgba(C_MISS, 0.85));
      if (o.pocket === 'bold' && o.miss) for (const i of POCKET) quickStroke(g, [[sx(DAYS[i]), sy(HGT[i])], [sx(DAYS[i]), sy(o.f(DAYS[i]))]], 5, rgba(C_POCKET, 0.9), 1, [8, 6]);
      const pts = []; for (let k = 0; k <= 160; k++) { const d = xmax * k / 160; pts.push([sx(d), sy(clamp(o.f(d), -ymax, ymax * 2))]); }
      inkStroke(g, pts, 7, o.fc || C_LINE, { seed: 7, jitter: 0.4 });
    }
    g.restore();
    const n = o.n ?? 12;
    for (let i = 0; i < n; i++) {
      if (o.skip === i) continue;
      const x = sx(DAYS[i]), y = sy(HGT[i]), pk = POCKET.includes(i);
      if (pk && o.pocket) {
        const a = o.pocket === 'faint' ? 0.35 : 1;
        g.lineWidth = o.pocket === 'bold' ? 7 : 5; g.strokeStyle = rgba(C_POCKET, a); g.fillStyle = rgba('#FBF6EA', a);
        g.beginPath(); g.arc(x, y, o.r || 13, 0, TAU); g.fill(); g.stroke();
      } else {
        g.fillStyle = C_TRAIN; g.beginPath(); g.arc(x, y, o.r || 13, 0, TAU); g.fill(); inkCircle(g, x, y, o.r || 13, 3, PAL.ink, i + 1);
      }
      if (o.sel === i) { g.lineWidth = 5; g.strokeStyle = PAL.annMagenta; g.beginPath(); g.arc(x, y, (o.r || 13) + 11, 0, TAU); g.stroke(); }
    }
    g.restore();
    return { sx, sy };
  }

  // HTML helpers for the card
  const sl = (label, k, min, max, step, v) => `<label>${label}<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><b data-v="${k}"></b></label>`;
  const bt = (label, k) => `<button class="btn" data-b="${k}">${label}</button>`;
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

  const LINE = fitLine(), QUAD = fitQuad();
  const lineF = (d) => LINE.a * d + LINE.b;
  const ALL = DAYS.map((_, i) => i);

  // общий вид: большая таблица по центру. Ей кончается стенд 1 и с неё начинается стенд 2.
  const BIG = { x: 250, y: 130, rh: 60, fs: 42, cols: [COL_DAY(220, 'день'), COL_H(280)] };
  function drawBigTable(g, o = {}) {
    txt(g, o.title || 'Дневник ромашки: 12 измерений', 500, 82, 50, { a: 'center', serif: true, w: 700, maxW: 940 });
    table(g, BIG, { bg: o.bg });
    txt(g, o.foot || 'день после посадки → высота ромашки', 500, 965, 36, { a: 'center', c: PAL.inkSoft, maxW: 940 });
  }

  // вид «таблица и поле»: им кончается стенд 2 и с него начинается стенд 3
  const SMALL = { x: 30, y: 110, rh: 56, fs: 34, cols: [COL_DAY(110), COL_H(160, 'высота')] };
  const F2 = { X0: 500, Y0: 110, X1: 960, Y1: 780, xmax: 26, ymax: 50 };
  const pocketBg = (i) => (POCKET.includes(i) ? 'rgba(47,110,181,0.22)' : i % 2 ? 'rgba(226,209,176,0.35)' : 'rgba(251,246,234,0.6)');
  function drawSplit(g, alpha = 1, F = F2, plotAlpha = 1) {
    if (alpha > 0.01) {
      g.save(); g.globalAlpha = alpha;
      txt(g, 'Таблица → точки на поле', 500, 70, 46, { a: 'center', serif: true, w: 700 });
      table(g, SMALL, { bg: pocketBg });
      for (const i of POCKET) txt(g, 'карман', 306, SMALL.y + SMALL.rh * (i + 1.68), 26, { w: 700, c: C_POCKET });
      g.lineWidth = 0;
      g.fillStyle = C_TRAIN; g.beginPath(); g.arc(140, 900, 14, 0, TAU); g.fill(); inkCircle(g, 140, 900, 14, 3, PAL.ink, 3);
      txt(g, 'учёба: 9 точек', 166, 912, 36, { w: 700 });
      g.lineWidth = 5; g.strokeStyle = C_POCKET; g.fillStyle = '#FBF6EA'; g.beginPath(); g.arc(560, 900, 14, 0, TAU); g.fill(); g.stroke();
      txt(g, 'карман: 3 точки', 586, 912, 36, { w: 700, c: C_POCKET });
      g.restore();
    }
    g.save(); g.globalAlpha = plotAlpha; plot(g, F, { pocket: 'hollow' }); g.restore();
  }

  const models = [];

  // =========================================================================
  // 1. Что такое машинное обучение: программа против модели на одной таблице
  // =========================================================================
  {
    const LX = 30, RX = 510, CW = 460;
    const progF = (d) => 2 * d;
    const m = {
      mode: 0, found: 0, anim: -1, dirty: true,
      side(g, x, kind, active) {
        g.save(); g.globalAlpha = active ? 1 : 0.22;
        g.fillStyle = kind ? 'rgba(148,164,127,0.22)' : 'rgba(200,140,134,0.18)'; rr(g, x - 6, 30, CW + 12, 950, 18); g.fill();
        g.lineWidth = 3; g.strokeStyle = PAL.ink; rr(g, x - 6, 30, CW + 12, 950, 18); g.stroke();
        txt(g, kind ? 'Машинное обучение' : 'Обычная программа', x + CW / 2, 88, 40, { a: 'center', serif: true, w: 700, maxW: CW - 20 });
        const show = kind === 0 || this.found || this.anim >= 0;
        let a = 2, b = 0, f = progF, rule;
        if (kind) {
          if (this.anim >= 0) { const t = this.anim; a = r1(1.4 + Math.sin(t * 23) * 1.2 * (1 - t)); b = r1(17.8 + Math.cos(t * 17) * 15 * (1 - t)); }
          else { a = LINE.a; b = LINE.b; }
          f = (d) => a * d + b;
          rule = show ? `высота = ${nf(a)} × день + ${nf(b)}` : 'высота = ? × день + ?';
          txt(g, 'человек даёт таблицу,', x + CW / 2, 148, 32, { a: 'center', c: PAL.inkSoft });
          txt(g, 'правило машина подбирает сама', x + CW / 2, 188, 32, { a: 'center', c: PAL.inkSoft, maxW: CW - 10 });
        } else {
          rule = 'высота = день × 2';
          txt(g, 'человек сам пишет правило,', x + CW / 2, 148, 32, { a: 'center', c: PAL.inkSoft, maxW: CW - 10 });
          txt(g, 'машина его выполняет', x + CW / 2, 188, 32, { a: 'center', c: PAL.inkSoft });
        }
        pill(g, rule, x + CW / 2, 252, 36, { a: 'center', bg: kind ? '#DCEBCB' : '#F3D9D3', c: kind ? C_LINE : C_RULE, maxW: CW - 6 });
        const T = { x, y: 305, rh: 44, fs: 32, cols: [COL_DAY(100), { t: 'правда', w: 120, v: (i) => String(HGT[i]), bold: true },
          { t: 'правило', w: 125, v: (i) => (show ? nf(f(DAYS[i])) : '?'), c: () => (kind ? C_LINE : C_RULE) },
          { t: 'промах', w: 115, v: (i) => (show ? nf(Math.abs(HGT[i] - f(DAYS[i]))) : ''), c: () => C_MISS }] };
        table(g, T);
        const e = errOf(f, ALL);
        txt(g, show ? `все промахи: ${nf(e)} см` : 'промахи: ждём правило', x + CW / 2, 935, 38, { a: 'center', w: 700, c: show ? C_MISS : PAL.inkSoft, maxW: CW - 10 });
        g.restore();
      },
      draw(g) {
        if (this.mode === 0) { drawBigTable(g); return; }
        if (this.mode === 3) {
          txt(g, 'Где это уже работает', 500, 82, 50, { a: 'center', serif: true, w: 700 });
          const rows = [
            ['день после посадки', 'высота ромашки', '12 измерений линейкой', '#F7E3B5'],
            ['письмо', 'спам или нет', 'письма, которые люди пометили', '#F3D9D3'],
            ['что ты смотрел', 'что подсказать', 'что смотрели похожие люди', '#DCEBCB'],
            ['площадь квартиры', 'цена', 'проданные квартиры', '#D6E4F2'],
          ];
          rows.forEach(([a, b, ex, bg], k) => {
            const y = 140 + k * 205;
            g.fillStyle = bg; rr(g, 40, y, 920, 180, 18); g.fill(); g.lineWidth = k ? 3 : 6; g.strokeStyle = PAL.ink; rr(g, 40, y, 920, 180, 18); g.stroke();
            pill(g, a, 70, y + 70, 36, { maxW: 400 });
            arrow(g, 480, y + 58, 560, y + 58, 6, PAL.ink, 24);
            pill(g, b, 585, y + 70, 36, { maxW: 360, bg: '#FBF6EA' });
            txt(g, 'примеры: ' + ex, 70, y + 150, 32, { c: PAL.inkSoft, maxW: 860 });
          });
          txt(g, 'везде одно: вход → ответ, правило из примеров', 500, 975, 34, { a: 'center', w: 700, maxW: 940 });
          return;
        }
        if (this.mode === 4) {
          txt(g, 'Три слова на дальше', 500, 82, 50, { a: 'center', serif: true, w: 700 });
          // 1. данные: кусок той же таблицы
          g.fillStyle = '#F7E3B5'; rr(g, 40, 120, 920, 330, 18); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; rr(g, 40, 120, 920, 330, 18); g.stroke();
          txt(g, '1. данные', 70, 180, 44, { w: 700 });
          txt(g, 'наша таблица', 70, 230, 32, { c: PAL.inkSoft });
          table(g, { x: 450, y: 140, rh: 46, fs: 32, cols: [COL_DAY(200), COL_H(260)] }, { rows: 5 });
          txt(g, '… и ещё 7 строк', 70, 420, 32, { c: PAL.inkSoft });
          arrow(g, 500, 455, 500, 500, 6, PAL.ink, 24);
          g.fillStyle = '#DCEBCB'; rr(g, 40, 510, 920, 170, 18); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; rr(g, 40, 510, 920, 170, 18); g.stroke();
          txt(g, '2. модель', 70, 570, 44, { w: 700 });
          pill(g, `высота = ${nf(LINE.a)} × день + ${nf(LINE.b)}`, 500, 640, 38, { a: 'center', bg: '#FBF6EA', c: C_LINE, maxW: 860 });
          arrow(g, 500, 685, 500, 730, 6, PAL.ink, 24);
          g.fillStyle = '#D6E4F2'; rr(g, 40, 740, 920, 200, 18); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; rr(g, 40, 740, 920, 200, 18); g.stroke();
          txt(g, '3. предсказание', 70, 800, 44, { w: 700 });
          txt(g, 'нового дня 7 в таблице нет:', 70, 850, 32, { c: PAL.inkSoft });
          pill(g, `день 7 → ${nf(lineF(7))} см`, 500, 905, 40, { a: 'center', bg: '#FBF6EA' });
          return;
        }
        this.side(g, LX, 0, this.mode === 1 || this.mode === 2);
        this.side(g, RX, 1, this.mode === 2);
      },
      tick(dt) { if (this.anim >= 0) { this.anim += dt / 1.4; if (this.anim >= 1) { this.anim = -1; this.found = 1; AUDIO.chime && AUDIO.chime(true); this.sync && this.sync(); } this.dirty = true; } },
      tap() { if (this.mode === 2 && !this.found && this.anim < 0) { this.press('fit'); this.sync(); return true; } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k === 'found' || k === 'mode') this.anim = -1; },
      press(k) {
        if (k.startsWith('mode:')) { this.mode = +k.slice(5); this.anim = -1; }
        else if (k === 'fit') { this.mode = 2; this.found = SHOT ? 1 : 0; this.anim = SHOT ? -1 : 0; }
      },
      controls(box) {
        box.innerHTML = bt('таблица', 'mode:0') + bt('программа', 'mode:1') + bt('машинное обучение', 'mode:2') + bt('▶ подобрать', 'fit') + bt('где в жизни', 'mode:3') + bt('три слова', 'mode:4') + '<div class="info"></div>';
        wire(box, this, () => '');
      },
      syncExtra(box) { box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'mode:' + this.mode)); },
      infoText() {
        if (this.mode === 1) return `правило человека «день × 2» мажет на все <b>${nf(errOf((d) => 2 * d, ALL))} см</b> по 12 строкам`;
        if (this.mode === 2) return this.found && this.anim < 0 ? `правило машины мажет на <b>${nf(errOf(lineF, ALL))} см</b>, у человека было ${nf(errOf((d) => 2 * d, ALL))}` : 'жми «▶ подобрать»: машина ищет правило по таблице';
        if (this.mode === 3) return 'спам, подсказки, цены: везде вход и ответ';
        if (this.mode === 4) return 'данные → модель → предсказание';
        return '12 измерений: день после посадки и высота в см';
      },
    };
    models.push(m);
  }

  // =========================================================================
  // 2. Размеченные данные: строки становятся точками
  // =========================================================================
  {
    const m = {
      mode: 0, n: 12, anim: -1, dirty: true,
      draw(g) {
        if (this.mode === 0) { drawBigTable(g); return; }
        if (this.mode === 1) {
          drawBigTable(g, { title: ' ', bg: (i) => (i === 3 ? 'rgba(241,191,74,0.55)' : i % 2 ? 'rgba(226,209,176,0.35)' : 'rgba(251,246,234,0.6)'), foot: 'признак → метка: вход → ответ' });
          pill(g, 'признак, вход', 462, 92, 30, { a: 'right', bg: '#D6E4F2' });
          pill(g, 'метка, ответ', 480, 92, 30, { bg: '#F7E3B5' });
          const y = BIG.y + BIG.rh * 4.5;
          g.lineWidth = 7; g.strokeStyle = PAL.orange; g.strokeRect(BIG.x - 4, BIG.y + BIG.rh * 4 - 2, 508, BIG.rh + 4);
          txt(g, 'строка', 125, y - 6, 36, { a: 'center', w: 700 }); txt(g, '= пример', 125, y + 34, 36, { a: 'center', w: 700 });
          arrow(g, 200, y + 60, 244, y + 10, 5, PAL.orange, 20);
          txt(g, '12 строк', 875, y - 6, 34, { a: 'center', w: 700 }); txt(g, '= 12', 875, y + 34, 34, { a: 'center', w: 700 }); txt(g, 'примеров', 875, y + 74, 34, { a: 'center', w: 700 });
          return;
        }
        if (this.mode === 3) {
          txt(g, 'Та же таблица без ответов', 500, 70, 46, { a: 'center', serif: true, w: 700 });
          table(g, { ...SMALL, cols: [COL_DAY(110), { t: 'высота', w: 160, v: () => '?', c: () => PAL.inkFaint, bold: true }] });
          const { sx } = plot(g, F2, { n: 0 });
          for (let i = 0; i < 12; i++) txt(g, '?', sx(DAYS[i]), F2.Y1 - 22 - (i % 2) * 40, 38, { a: 'center', w: 700, c: PAL.inkFaint });
          txt(g, 'день знаем, а куда вверх, неизвестно', 500, 905, 38, { a: 'center', w: 700, maxW: 940 });
          txt(g, 'неразмеченные данные: точку не поставить', 500, 960, 34, { a: 'center', c: PAL.inkSoft, maxW: 940 });
          return;
        }
        if (this.mode === 4) { drawSplit(g); return; }
        // mode 2: строки переезжают в точки по одной
        txt(g, 'Таблица → точки на поле', 500, 70, 46, { a: 'center', serif: true, w: 700 });
        const n = this.n, k = n - 1, moving = this.anim >= 0 && k >= 0;
        const T = table(g, SMALL, { bg: (i) => (i === k ? 'rgba(241,191,74,0.6)' : i < n ? 'rgba(226,209,176,0.35)' : 'rgba(251,246,234,0.6)') });
        const { sx, sy } = plot(g, F2, { n, skip: moving ? k : -1, sel: moving ? -1 : k });
        if (k >= 0) {
          const ax = T.x1 + 8, ay = T.rowY(k), tx = sx(DAYS[k]), ty = sy(HGT[k]);
          if (moving) {
            const t = this.anim, e = t * t * (3 - 2 * t), px = lerp(ax, tx, e), py = lerp(ay, ty, e) - Math.sin(t * Math.PI) * 60;
            quickStroke(g, [[ax, ay], [px, py]], 4, rgba(PAL.orange, 0.7), 1, [10, 8]);
            g.fillStyle = C_TRAIN; g.beginPath(); g.arc(px, py, 13, 0, TAU); g.fill(); inkCircle(g, px, py, 13, 3, PAL.ink, 4);
          } else {
            arrow(g, ax, ay, tx - Math.sign(tx - ax) * 24, ty, 4, rgba(PAL.orange, 0.85), 20);
            quickStroke(g, [[tx, ty], [tx, F2.Y1]], 3, rgba(PAL.annMagenta, 0.7), 1, [8, 6]);
            quickStroke(g, [[tx, ty], [F2.X0, ty]], 3, rgba(PAL.annMagenta, 0.7), 1, [8, 6]);
          }
          txt(g, `строка «день ${DAYS[k]}, высота ${HGT[k]}» → точка`, 500, 905, 38, { a: 'center', w: 700, maxW: 940 });
          txt(g, `вправо до ${DAYS[k]}, вверх до ${HGT[k]} · на поле ${n} из 12`, 500, 960, 34, { a: 'center', c: PAL.inkSoft, maxW: 940 });
        } else txt(g, 'жми «+1 строка»', 500, 920, 38, { a: 'center', w: 700 });
      },
      tick(dt) { if (this.anim >= 0) { this.anim += dt / 0.7; if (this.anim >= 1) { this.anim = -1; AUDIO.pluck && AUDIO.pluck(this.n / 12 - 0.5); } this.dirty = true; } },
      add() { if (this.mode !== 2) { this.mode = 2; this.n = 0; } if (this.n >= 12) this.n = 0; this.n++; this.anim = SHOT ? -1 : 0; },
      tap() { if (this.mode === 2 || this.mode === 0) { this.add(); this.sync(); return true; } return false; },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; if (k === 'n' || k === 'mode') this.anim = -1; },
      press(k) { if (k.startsWith('mode:')) { this.mode = +k.slice(5); if (this.mode === 2 && this.n >= 12) this.n = 12; this.anim = -1; } else if (k === 'add') this.add(); },
      controls(box) {
        box.innerHTML = bt('таблица', 'mode:0') + bt('слова', 'mode:1') + bt('в точки', 'mode:2') + bt('+1 строка', 'add') + bt('без ответов', 'mode:3') + bt('делим 9 и 3', 'mode:4') + '<div class="info"></div>';
        wire(box, this, () => '');
      },
      syncExtra(box) { box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'mode:' + this.mode)); },
      infoText() {
        if (this.mode === 1) return 'строка = пример · день = признак · высота = метка';
        if (this.mode === 2) return this.n ? `на поле <b>${this.n}</b> из 12 точек · ткни доску: ещё строка` : 'ткни доску или «+1 строка»';
        if (this.mode === 3) return 'без столбца «высота» данные неразмеченные';
        if (this.mode === 4) return '<b>9</b> точек на учёбу, <b>3</b> в карман: дни 6, 14, 22';
        return '12 строк: день и высота';
      },
    };
    models.push(m);
  }

  // =========================================================================
  // 3. Модель, ошибка, интерполяция и экстраполяция
  // =========================================================================
  {
    const F3 = { X0: 130, Y0: 95, X1: 950, Y1: 620 };
    const mixF = (A, B, t) => ({ X0: lerp(A.X0, B.X0, t), Y0: lerp(A.Y0, B.Y0, t), X1: lerp(A.X1, B.X1, t), Y1: lerp(A.Y1, B.Y1, t), xmax: B.xmax, ymax: B.ymax });
    const m = {
      view: 1, tr: 1, a: 2, b: 0, c: 0, zoom: 0, q: 0, edge: 0, pk: 0, fitA: null, dirty: true,
      f() { const { a, b, c } = this; return (d) => a * d + b + c * d * d; },
      draw(g) {
        if (this.view === 0) { drawSplit(g); return; }
        const t = this.tr, e = t * t * (3 - 2 * t);
        const fz = { ...F3, xmax: this.zoom ? 64 : 26, ymax: this.zoom ? 110 : 50 };
        if (t < 1) {
          drawSplit(g, 1 - e, mixF({ ...F2, xmax: 26, ymax: 50 }, fz, e), 0);
        }
        const F = t < 1 ? mixF({ ...F2, xmax: 26, ymax: 50 }, fz, e) : fz;
        const f = this.f(), bent = Math.abs(this.c) > 1e-9;
        const show = t >= 1;
        const { sx, sy } = plot(g, F, { f: show ? f : null, miss: show, pocket: this.pk ? 'bold' : t < 1 ? 'hollow' : 'faint', edge: show && this.edge, fc: bent ? C_RULE : C_LINE, r: this.zoom ? 10 : 13 });
        if (!show) return;
        // формула модели
        const rule = bent ? `высота = ${nf(this.a, 2)} × день + ${nf(this.b)} ${this.c < 0 ? '−' : '+'} ${nf(Math.abs(this.c), 3)} × день²` : `высота = ${nf(this.a, 2)} × день + ${nf(this.b)}`;
        txt(g, rule, 540, 62, 40, { a: 'center', w: 700, c: bent ? C_RULE : C_LINE, maxW: 900 });
        // вопрос «а на день q?»
        if (this.q) {
          const v = f(this.q), x = sx(this.q), inside = v >= 0 && v <= F.ymax, y = sy(clamp(v, 0, F.ymax));
          quickStroke(g, [[x, F.Y1], [x, y]], 4, PAL.annMagenta, 1, [10, 7]);
          quickStroke(g, [[F.X0, y], [x, y]], 3, rgba(PAL.annMagenta, 0.6), 1, [10, 7]);
          if (inside) { g.fillStyle = PAL.annMagenta; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); inkCircle(g, x, y, 14, 3, PAL.ink, 9); }
          else arrow(g, x, F.Y1 - 120, x, F.Y1 - 8, 7, PAL.annMagenta, 28);
          const lbl = `день ${this.q} → ${nf(v)} см`;
          const right = x > 600, py = inside ? clamp(y + 90, F.Y0 + 60, F.Y1 - 30) : F.Y1 - 140;
          pill(g, lbl, right ? x - 60 : x + 70, py, 38, { a: right ? 'right' : 'left', bg: '#FCE1EE', border: PAL.annMagenta });
        }
        // ошибка внизу
        const e9 = errOf(f, TRAIN);
        txt(g, `ошибка: сумма промахов по 9 точкам ${nf(e9)} см`, 500, 735, 40, { a: 'center', w: 700, c: C_MISS, maxW: 940 });
        const rowTxt = (i) => `день ${DAYS[i]}: правда ${HGT[i]}, модель ${nf(f(DAYS[i]))}, промах ${nf(Math.abs(HGT[i] - f(DAYS[i])))}`;
        txt(g, rowTxt(0), 500, 800, 34, { a: 'center', maxW: 940 });
        txt(g, rowTxt(11), 500, 852, 34, { a: 'center', maxW: 940 });
        if (this.pk) {
          const ep = errOf(f, POCKET);
          txt(g, `карман (дни 6, 14, 22): промах ${nf(ep)} см на 3 точках`, 500, 925, 36, { a: 'center', w: 700, c: C_POCKET, maxW: 940 });
        } else if (this.edge) txt(g, 'тень: дней после 24 в таблице нет', 500, 925, 36, { a: 'center', w: 700, c: PAL.inkSoft, maxW: 940 });
        else txt(g, 'красные палочки: промахи модели', 500, 925, 34, { a: 'center', c: PAL.inkSoft, maxW: 940 });
      },
      tick(dt) {
        if (this.tr < 1) { this.tr = Math.min(1, this.tr + dt / 1.2); this.dirty = true; if (this.tr >= 1) this.sync && this.sync(); }
        if (this.fitA) {
          const A = this.fitA; A.t = Math.min(1, A.t + dt / 1.3); const e = A.t * A.t * (3 - 2 * A.t);
          this.a = lerp(A.from.a, A.to.a, e); this.b = lerp(A.from.b, A.to.b, e); this.c = lerp(A.from.c, A.to.c, e);
          if (A.t >= 1) { this.a = A.to.a; this.b = A.to.b; this.c = A.to.c; this.fitA = null; AUDIO.chime && AUDIO.chime(true); }
          this.sync && this.sync();
        }
      },
      fit(to) { this.view = 1; if (SHOT) { this.a = to.a; this.b = to.b; this.c = to.c; this.fitA = null; return; } this.fitA = { from: { a: this.a, b: this.b, c: this.c }, to: { a: to.a, b: to.b, c: to.c }, t: 0 }; },
      tap(x, y) {
        if (this.view === 0) { this.view = 1; this.tr = 0; this.sync(); return true; }
        if (y > F3.Y1 || x < F3.X0 || x > F3.X1) return false;
        const xmax = this.zoom ? 64 : 26, d = Math.round((x - F3.X0) / (F3.X1 - F3.X0) * xmax);
        this.q = clamp(d, 1, xmax); this.sync(); return true;
      },
      get(k) { return this[k]; },
      set(k, v) {
        if (k === 'view') { if (v === 1 && this.view === 0) this.tr = SHOT ? 1 : 0; else if (v === 1) this.tr = Math.max(this.tr, 1); }
        this[k] = v;
        if (k === 'a' || k === 'b' || k === 'c') this.fitA = null;
      },
      press(k) {
        if (k === 'fit') this.fit(LINE);
        else if (k === 'fitq') this.fit(QUAD);
        else if (k === 'q7') this.q = this.q === 7 ? 0 : 7;
        else if (k === 'q60') { this.q = this.q === 60 ? 0 : 60; if (this.q) this.zoom = 1; }
        else if (k === 'zoom') { this.zoom = this.zoom ? 0 : 1; if (!this.zoom && this.q > 26) this.q = 0; }
        else if (k === 'edge') this.edge = this.edge ? 0 : 1;
        else if (k === 'pk') this.pk = this.pk ? 0 : 1;
        if (this.view === 0) { this.view = 1; this.tr = 0; }
      },
      controls(box) {
        box.innerHTML = sl('наклон a', 'a', 0, 4, 0.01, this.a) + sl('сдвиг b', 'b', -10, 40, 0.1, this.b) + sl('изгиб', 'c', -0.15, 0.05, 0.001, this.c) +
          bt('подобрать само', 'fit') + bt('подобрать с изгибом', 'fitq') + bt('день 7', 'q7') + bt('день 60', 'q60') + bt('край данных', 'edge') + bt('карман', 'pk') + bt('дальше по дням', 'zoom') + '<div class="info"></div>';
        wire(box, this, (k, v) => (k === 'c' ? nf(v, 3) : k === 'a' ? nf(v, 2) : nf(v)));
      },
      syncExtra(box) {
        const on = { q7: this.q === 7, q60: this.q === 60, edge: !!this.edge, pk: !!this.pk, zoom: !!this.zoom };
        box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', !!on[b.dataset.b]));
      },
      infoText() {
        const f = this.f(), e = errOf(f, TRAIN);
        return `ошибка по 9 учебным точкам: <b>${nf(e)} см</b>` + (this.q ? ` · день ${this.q} → <b>${nf(f(this.q))} см</b>` : '') + ' · ткни поле: спросить любой день';
      },
    };
    models.push(m);
  }

  // финальная доска: таблица → точки → линия с зоной за краем, по строке на стенд
  models.drawFinal = (g, visited) => {
    txt(g, 'Путь одной таблицы', 500, 100, 58, { a: 'center', serif: true, w: 700 });
    const rows = [
      ['1', 'таблица: 12 измерений ромашки', PAL.sun],
      ['2', 'строки стали точками, 3 в кармане', PAL.stripeYellow],
      ['3', 'линия, ошибка и край данных', PAL.waterLight],
    ];
    rows.forEach(([n, s, col], k) => {
      const y0 = 140 + k * 262;
      g.fillStyle = 'rgba(251,246,234,0.6)'; rr(g, 40, y0, 920, 240, 18); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; rr(g, 40, y0, 920, 240, 18); g.stroke();
      g.fillStyle = col; g.beginPath(); g.arc(95, y0 + 50, 30, 0, TAU); g.fill(); inkCircle(g, 95, y0 + 50, 30, 3, PAL.ink, k + 2);
      txt(g, n, 95, y0 + 62, 36, { a: 'center', w: 700, serif: true });
      txt(g, s, 145, y0 + 62, 38, { w: 700, maxW: 760 });
      if (visited && visited.has(k)) txt(g, '✓', 935, y0 + 64, 44, { a: 'right', w: 700, c: '#2F7A35' });
      const box = { X0: 140, Y0: y0 + 92, X1: 900, Y1: y0 + 222 };
      if (k === 0) {
        // таблица лёжа: день сверху, высота снизу
        const cw = 860 / 13, x0 = 70, yy = y0 + 100;
        g.fillStyle = PAL.paperShade; g.fillRect(x0, yy, cw, 120);
        txt(g, 'день', x0 + cw / 2, yy + 42, 22, { a: 'center', w: 700 }); txt(g, 'см', x0 + cw / 2, yy + 102, 22, { a: 'center', w: 700 });
        for (let i = 0; i < 12; i++) { const x = x0 + cw * (i + 1); txt(g, String(DAYS[i]), x + cw / 2, yy + 42, 28, { a: 'center' }); txt(g, String(HGT[i]), x + cw / 2, yy + 102, 28, { a: 'center', w: 700 }); }
        quickStroke(g, [[x0, yy + 60], [x0 + cw * 13, yy + 60]], 2, PAL.inkSoft);
        inkRect(g, x0, yy, cw * 13, 120, 3, PAL.ink, 4);
      } else {
        plot(g, { ...box, xmax: k === 2 ? 64 : 26, ymax: k === 2 ? 110 : 50 }, { lab: false, pocket: 'hollow', r: 8, f: k === 2 ? lineF : null, edge: k === 2, edgeLab: false });
      }
    });
    txt(g, 'дальше: обучение, машина сама крутит ползунки', 500, 950, 32, { a: 'center', c: PAL.inkSoft, maxW: 940 });
  };
  models.LINE = LINE; models.QUAD = QUAD;
  models.forEach((m, i) => { m.n0 = i + 1; if (!m.sync) m.sync = () => { m.dirty = true; }; });
  return models;
}
