// Доски сада сетапов: одна схема на версию. Вся начинка лежит в course.json (поле diagram),
// здесь только рисовалка: коробки, провода по слоям, бегущие сигналы, список ролей, плюсы и минусы.
export const BW = 1000, BH = 1000;

export function makeModels(K) {
  const { PAL, SERIF, SANS, quickStroke, inkRect, inkCircle, rgba, clamp, lerp, AUDIO, COURSE } = K;
  const SHOT = !!K.SHOT;
  const TAU = Math.PI * 2;

  // цвета проводов и типов коробок
  const WIRE = {
    audio: { c: '#D8742B', name: 'звук' },
    midi: { c: '#3B8EE0', name: 'MIDI' },
    usb: { c: '#3C8783', name: 'USB' },
    clock: { c: '#E43D8C', name: 'клок', dash: [14, 10] },
  };
  const KIND = {
    ctrl: '#C8C1EF', sampler: '#F1BF4A', synth: '#E3B1A1', fx: '#8CC3BB', mixer: '#DCE3CC',
    comp: '#C9D3D2', human: '#F0D9B5', out: '#FBF6EA', gone: '#D9CDB4',
  };
  const LAYERS = [null, ['audio'], ['midi', 'usb', 'clock']]; // режимы 0..2: какие провода показывать
  // приборы: картинка лицевой панели и пропорция ширина/высота
  const DEV = {
    erae: { img: 'erae', a: 1.43 }, erae_zhora: { img: 'erae_zhora', a: 1.4 }, s4: { img: 's4', a: 1.55 },
    digitakt: { img: 'digitakt', a: 1.1 }, digitone: { img: 'digitone', a: 1.12 }, haken: { img: 'haken', a: 1.94 },
    launchpad: { img: 'launchpad', a: 1 }, l6: { img: 'l6', a: 1.52 }, laptop: { draw: 'laptop', a: 1.5 },
    neotone: { draw: 'neotone', a: 1 }, card: { img: 'umc1820', a: 3 }, twister: { img: 'twister', a: 1 }, speakers: { draw: 'speakers', a: 1.9 },
    mic: { draw: 'mic', a: 1.6 }, faders: { draw: 'faders', a: 1.25 },
  };
  function slot(n) {
    const d = DEV[n.dev] || { a: 1.5 }; let h = n.h, w = h * d.a;
    if (w > n.w) { w = n.w; h = w / d.a; }
    return { x: n.x + (n.w - w) / 2, y: n.y + (n.h - h) / 2, w, h };
  }

  function font(g, size, o = {}) { g.font = `${o.w || 600} ${o.i ? 'italic ' : ''}${size}px ${o.serif ? SERIF : SANS}`; }
  function txt(g, s, x, y, size = 44, o = {}) {
    font(g, size, o);
    g.fillStyle = o.c || PAL.ink; g.textAlign = o.a || 'left'; g.textBaseline = o.b || 'alphabetic';
    if (o.maxW) { let f = size; while (f > 18 && g.measureText(s).width > o.maxW) { f -= 1; font(g, f, o); } }
    g.fillText(s, x, y);
  }
  function wrap(g, s, maxW) {
    const out = []; let line = '';
    for (const w of String(s).split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out;
  }
  function para(g, s, x, y, size, maxW, o = {}) {
    font(g, size, o); g.fillStyle = o.c || PAL.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const L = wrap(g, s, maxW); L.forEach((l, k) => g.fillText(l, x, y + k * size * 1.22));
    return y + L.length * size * 1.22;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // точка на краю коробки по направлению к цели
  function edgePt(n, tx, ty) {
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const k = Math.min(Math.abs(n.w / 2 / (dx || 1e-6)), Math.abs(n.h / 2 / (dy || 1e-6)));
    return [cx + dx * k, cy + dy * k];
  }
  function pathOf(D, e) {
    const a = D.byId[e.a], b = D.byId[e.b]; if (!a || !b) return null;
    const via = e.via || [];
    const ac = [a.x + a.w / 2 + (e.da || 0), a.y + a.h / 2], bc = [b.x + b.w / 2 + (e.db || 0), b.y + b.h / 2];
    const first = via.length ? via[0] : bc, last = via.length ? via[via.length - 1] : ac;
    const p0 = edgePt(a, first[0] - (e.da || 0), first[1]); p0[0] += e.da || 0;
    const p1 = edgePt(b, last[0] - (e.db || 0), last[1]); p1[0] += e.db || 0;
    return [p0, ...via, p1];
  }
  function along(pts, t) {
    let L = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let s = t * L;
    for (let i = 0; i < seg.length; i++) { if (s <= seg[i] || i === seg.length - 1) { const k = seg[i] ? s / seg[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } s -= seg[i]; }
    return pts[0];
  }

  function drawNode(g, n, dim, sel) {
    g.save(); g.globalAlpha = dim ? 0.3 : 1;
    g.fillStyle = KIND[n.kind] || PAL.paper; rr(g, n.x, n.y, n.w, n.h, 16); g.fill();
    if (n.kind === 'gone') { g.save(); rr(g, n.x, n.y, n.w, n.h, 16); g.clip(); g.strokeStyle = rgba(PAL.ink, 0.25); g.lineWidth = 2; for (let q = -n.h; q < n.w; q += 14) { g.beginPath(); g.moveTo(n.x + q, n.y + n.h); g.lineTo(n.x + q + n.h, n.y); g.stroke(); } g.restore(); }
    g.lineWidth = sel ? 7 : 4; g.strokeStyle = sel ? '#E43D8C' : PAL.ink; rr(g, n.x, n.y, n.w, n.h, 16); g.stroke();
    const cx = n.x + n.w / 2, two = !!n.sub;
    txt(g, n.name, cx, n.y + (two ? n.h * 0.44 : n.h * 0.5 + 12), n.fs || 40, { a: 'center', w: 800, maxW: n.w - 18 });
    if (two) txt(g, n.sub, cx, n.y + n.h * 0.44 + 36, 27, { a: 'center', c: PAL.ink, maxW: n.w - 14 });
    if (n.x2) { // сколько штук
      g.fillStyle = PAL.sun; g.beginPath(); g.arc(n.x + n.w - 6, n.y + 6, 24, 0, TAU); g.fill(); inkCircle(g, n.x + n.w - 6, n.y + 6, 24, 3, PAL.ink, 3);
      txt(g, n.x2, n.x + n.w - 6, n.y + 15, 24, { a: 'center', w: 800 });
    }
    g.restore();
  }

  function drawEdges(g, D, show, t, selId) {
    for (const e of D.edges) {
      const on = !show || show.includes(e.k), W = WIRE[e.k] || WIRE.audio, pts = e.pts;
      if (!pts) continue;
      const hot = selId && (e.a === selId || e.b === selId);
      g.save(); g.globalAlpha = on ? (selId && !hot ? 0.25 : 1) : 0.08;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = '#FBF6EA'; g.lineWidth = 12; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      g.strokeStyle = W.c; g.lineWidth = 7; if (W.dash) g.setLineDash(W.dash);
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]);
      // стрелка на конце
      const a = pts[pts.length - 2], b = pts[pts.length - 1], an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      g.fillStyle = W.c; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] - 22 * Math.cos(an - 0.42), b[1] - 22 * Math.sin(an - 0.42)); g.lineTo(b[0] - 22 * Math.cos(an + 0.42), b[1] - 22 * Math.sin(an + 0.42)); g.closePath(); g.fill();
      if (e.both) { const c = pts[1], d = pts[0], am = Math.atan2(d[1] - c[1], d[0] - c[0]); g.beginPath(); g.moveTo(d[0], d[1]); g.lineTo(d[0] - 22 * Math.cos(am - 0.42), d[1] - 22 * Math.sin(am - 0.42)); g.lineTo(d[0] - 22 * Math.cos(am + 0.42), d[1] - 22 * Math.sin(am + 0.42)); g.closePath(); g.fill(); }
      if (on) { // бегущий сигнал
        for (let q = 0; q < 2; q++) { const tt = (t * (e.k === 'clock' ? 0.55 : 0.35) + q * 0.5 + (e.ph || 0)) % 1, p = along(pts, e.both && q ? 1 - tt : tt); g.fillStyle = '#FBF6EA'; g.beginPath(); g.arc(p[0], p[1], 8, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = W.c; g.stroke(); }
        if (e.label) {
          const m = along(pts, e.lt ?? 0.5); font(g, 26, { w: 700 }); const w = g.measureText(e.label).width + 18;
          g.fillStyle = '#FBF6EA'; rr(g, m[0] - w / 2, m[1] - 20, w, 38, 10); g.fill(); g.lineWidth = 2.5; g.strokeStyle = W.c; g.stroke();
          txt(g, e.label, m[0], m[1] + 9, 26, { a: 'center', w: 700 });
        }
      }
      g.restore();
    }
  }

  function legend(g, D, show) {
    const kinds = [...new Set(D.edges.map((e) => e.k))]; let x = 40;
    for (const k of kinds) {
      const W = WIRE[k], on = !show || show.includes(k);
      g.save(); g.globalAlpha = on ? 1 : 0.3; g.strokeStyle = W.c; g.lineWidth = 7; g.lineCap = 'round'; if (W.dash) g.setLineDash(W.dash);
      g.beginPath(); g.moveTo(x, 958); g.lineTo(x + 60, 958); g.stroke(); g.setLineDash([]);
      txt(g, W.name, x + 72, 968, 26, { w: 700 }); g.restore();
      font(g, 28, { w: 700 }); x += 72 + g.measureText(W.name).width + 38;
    }
  }

  function badge(g, D) {
    if (!D.badge) return;
    font(g, 26, { w: 800 }); const w = g.measureText(D.badge).width + 30;
    g.save(); g.translate(960 - w, 22);
    g.fillStyle = D.badgeC || PAL.sun; rr(g, 0, 0, w, 42, 12); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; rr(g, 0, 0, w, 42, 12); g.stroke();
    txt(g, D.badge, 15, 30, 26, { w: 800 }); g.restore();
  }

  function drawList(g, title, rows, y0, col) {
    txt(g, title, 50, y0, 40, { w: 800, serif: true }); let y = y0 + 22;
    for (const r of rows) {
      g.fillStyle = col; g.beginPath(); g.arc(66, y + 26, 11, 0, TAU); g.fill(); inkCircle(g, 66, y + 26, 11, 2.5, PAL.ink, 2);
      y = para(g, r, 94, y + 36, 29, 850) + 4;
    }
    return y;
  }

  const bt = (label, k) => `<button class="btn" data-b="${k}">${label}</button>`;
  const models = [];

  COURSE.forEach((c, i) => {
    const D = c.diagram;
    D.byId = Object.fromEntries(D.nodes.map((n) => [n.id, n]));
    D.edges.forEach((e, k) => { e.pts = pathOf(D, e); e.ph = (k * 0.37) % 1; });
    const m = {
      mode: 0, sel: null, t: 0, dirty: true, D,
      draw(g) {
        txt(g, D.title, 40, 70, 46, { serif: true, w: 700, maxW: D.badge ? 600 : 920 });
        txt(g, D.when, 40, 110, 27, { c: PAL.inkSoft, i: true, maxW: 920 });
        badge(g, D);
        if (this.mode <= 3) {
          const show = this.mode <= 2 ? LAYERS[this.mode] : null;
          let y = 150; this.rows = [];
          for (const n of D.nodes) {
            if (!n.role) continue;
            const used = !show || D.edges.some((e) => show.includes(e.k) && (e.a === n.id || e.b === n.id)), on = this.sel === n.id;
            font(g, 25, { w: 600 }); const L = wrap(g, n.role, 640).slice(0, 3), hh = Math.max(76, L.length * 29 + 18);
            g.save(); g.globalAlpha = used ? 1 : 0.38;
            if (on) { g.fillStyle = rgba('#E43D8C', 0.14); rr(g, 30, y - 8, 940, hh + 2, 14); g.fill(); g.lineWidth = 4; g.strokeStyle = '#E43D8C'; rr(g, 30, y - 8, 940, hh + 2, 14); g.stroke(); }
            g.fillStyle = KIND[n.kind] || PAL.paper; rr(g, 40, y, 250, 64, 14); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; if (n.kind === 'gone') g.setLineDash([9, 7]); rr(g, 40, y, 250, 64, 14); g.stroke(); g.setLineDash([]);
            txt(g, n.name, 165, y + 42, 28, { a: 'center', w: 800, maxW: 232 });
            font(g, 25, { w: 600 }); g.fillStyle = PAL.ink; g.textAlign = 'left';
            L.forEach((l, k) => g.fillText(l, 310, y + (L.length === 1 ? 42 : L.length === 2 ? 28 : 18) + k * 29));
            g.restore();
            this.rows.push([n.id, y - 8, y + hh - 6]);
            y += hh;
          }
          if (this.mode <= 2) { legend(g, D, show); txt(g, D.foot || 'тапни по прибору на ковре или по строке тут', 500, 905, 25, { a: 'center', c: PAL.inkSoft, maxW: 940 }); }
        } else {
          let y = drawList(g, D.plusTitle || 'Что это даёт', D.plus || [], 180, '#7FB069');
          y = drawList(g, D.minusTitle || 'На чём спотыкается', D.minus || [], y + 50, '#BF3F2C');
          if (D.verdict) { g.fillStyle = rgba(PAL.sun, 0.55); rr(g, 40, y + 20, 920, 120, 16); g.fill(); g.lineWidth = 3; g.strokeStyle = PAL.ink; rr(g, 40, y + 20, 920, 120, 16); g.stroke(); para(g, D.verdict, 62, y + 62, 29, 880, { w: 700 }); }
        }
      },
      tick(dt) {},
      tap(x, y) {
        if (this.mode > 3) return false;
        const r = (this.rows || []).find((q) => y >= q[1] && y <= q[2]), n = r && D.byId[r[0]];
        this.sel = n && this.sel !== n.id ? n.id : null; if (n && AUDIO.pluck) AUDIO.pluck((n.x / 1000) - 0.5);
        this.sync && this.sync(); return !!n;
      },
      get(k) { return this[k]; }, set(k, v) { this[k] = v; },
      press(k) { if (k.startsWith('mode:')) { this.mode = +k.slice(5); this.sel = null; } else if (k.startsWith('sel:')) { this.sel = k.slice(4) || null; } },
      controls(box) {
        box.innerHTML = bt('вся схема', 'mode:0') + bt('только звук', 'mode:1') + bt('MIDI и клок', 'mode:2') + bt('кто за что', 'mode:3') + bt('плюсы и минусы', 'mode:4') + '<div class="info"></div>';
        box.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => { this.press(b.dataset.b); this.sync(); }));
        this.info = box.querySelector('.info');
        this.sync = () => {
          box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === 'mode:' + this.mode));
          this.info.innerHTML = this.infoText(); this.dirty = true;
        };
        this.sync();
      },
      infoText() {
        if (this.sel && D.byId[this.sel]) return `<b>${D.byId[this.sel].name}</b>: ${D.byId[this.sel].role || ''}`;
        return ['все провода разом, тапни по прибору', 'куда течёт звук', 'кто кем командует и кто задаёт темп', 'роль каждой коробки одной строкой', 'за что версию любили и почему ушли дальше'][this.mode];
      },
    };
    models.push(m);
  });

  // финальная доска: все версии лесенкой
  models.drawFinal = (g, visited) => {
    txt(g, 'Все версии на одной доске', 500, 78, 50, { a: 'center', serif: true, w: 700 });
    const n = COURSE.length, rh = Math.min(150, 800 / n);
    COURSE.forEach((c, k) => {
      const y0 = 120 + k * rh, D = c.diagram, cur = !!D.current;
      g.fillStyle = cur ? rgba(PAL.sun, 0.6) : 'rgba(251,246,234,0.6)'; rr(g, 40, y0, 920, rh - 14, 18); g.fill(); g.lineWidth = cur ? 5 : 3; g.strokeStyle = PAL.ink; rr(g, 40, y0, 920, rh - 14, 18); g.stroke();
      g.fillStyle = cur ? PAL.orange : PAL.paperShade; g.beginPath(); g.arc(92, y0 + (rh - 14) / 2, 30, 0, TAU); g.fill(); inkCircle(g, 92, y0 + (rh - 14) / 2, 30, 3, PAL.ink, k + 2);
      txt(g, String(k + 1), 92, y0 + (rh - 14) / 2 + 13, 36, { a: 'center', w: 700, serif: true });
      txt(g, D.short || c.title, 140, y0 + rh * 0.36, 33, { w: 800, maxW: 740 });
      txt(g, D.line || '', 140, y0 + rh * 0.36 + 38, 25, { c: PAL.inkSoft, maxW: 780 });
      if (visited && visited.has(k)) txt(g, '✓', 935, y0 + rh * 0.42, 40, { a: 'right', w: 700, c: '#2F7A35' });
    });
    txt(g, 'жёлтая строка: то, с чем ты играешь сейчас', 500, 955, 30, { a: 'center', c: PAL.inkSoft, maxW: 940 });
  };
  models.forEach((m, i) => { m.n0 = i + 1; if (!m.sync) m.sync = () => { m.dirty = true; }; });
  models.DEV = DEV; models.slot = slot; models.WIRE = WIRE; models.LAYERS = LAYERS;
  return models;
}
