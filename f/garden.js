/* Общая обвязка садов (19.10.2026, слово Влада 00:22: «во всех садах должен быть… спросить ассистента…
   музыка включённой сама, и экран загрузки… научный, естественный… чувак Да Винчи может вращаться»).
   1) Заставка с вращающимся витрувианским человеком, пока сад грузится; кнопка «Войти» включает музыку
      (браузер не даёт звуку стартовать без касания, поэтому касание входа и есть включатель).
   2) Кнопка «спросить ассистента» с чатом, если у сада нет своего. Ответы пишет сервер neuro-sad/api. */
(function () {
  if (window.__gardenKit) return; window.__gardenKit = 1;
  var NAME = location.pathname.split('/').filter(Boolean).pop() || '';
  var API = 'https://vladdervish.duckdns.org/demo/neuro-sad/api/';
  var INK = '#2A1C13';
  var KEY = '';
  try { var mk = location.hash.match(/k=([\w-]+)/); if (mk) { localStorage.setItem('gx-key', mk[1]); } KEY = localStorage.getItem('gx-key') || ''; } catch (e) {}
  var EDIT = /^(сделай|сделать|поменяй|измени|добавь|убери|удали|перекрась|замени|покрась|увеличь|уменьши|передвинь|перенеси|пусть|давай сделаем|нарисуй|вставь|поставь|напиши на|переименуй|раскрась|сделаем)|можно сделать|можешь сделать|хочу,? чтобы|хочу чтоб/i;
  var UNDO = /^\s*(верни( всё| все)?( как было| обратно| назад)?|откати|отмени)[\s.!]*$/i;
  window.__gxEditing = false;
  function diag(what, e) { try { navigator.sendBeacon(API + 'diag', JSON.stringify({ g: NAME, what: what, name: e && e.name, msg: e && e.message, ua: navigator.userAgent, top: window.top === window, key: !!KEY })); } catch (x) {} }
  window.__gxDiag = diag;
  try { var md = navigator.mediaDevices, gum = md && md.getUserMedia && md.getUserMedia.bind(md);
    // Сады ставят navigator.audioSession.type='playback' (музыка при беззвучном), а в нём айфон запись запрещает:
    // InvalidStateError «AudioSession category is not compatible with audio capture» (пойман /diag 19.10.2026 01:48).
    var AS = navigator.audioSession, asPrev = null;
    function asRec() { try { if (AS && AS.type !== 'play-and-record') { asPrev = AS.type; AS.type = 'play-and-record'; } } catch (e) {} }
    function asBack() { try { if (AS && asPrev) { AS.type = asPrev; asPrev = null; } } catch (e) {} }
    if (gum) md.getUserMedia = function (c) {
      if (c && c.audio) asRec();
      return gum(c).then(function (st) {
        diag('mic-ok'); var left = st.getTracks().length;
        st.getTracks().forEach(function (t) { var stop = t.stop.bind(t); t.stop = function () { stop(); if (--left <= 0) asBack(); }; });
        return st;
      }, function (e) { diag('mic', e); asBack(); throw e; });
    }; } catch (e) {}
  var of = window.fetch.bind(window);
  if (document.querySelector('script') && KEY) window.fetch = function (u, o) {
    try {
      if (typeof u === 'string' && /neuro-sad\/api\/ask$/.test(u) && o && o.body && !window.__gxKit) {
        var b = JSON.parse(o.body), t = (b.text || '').trim(), m = UNDO.test(t) ? 'undo' : 'edit';
        if (m) { window.__gxEditing = true; b.course = NAME; b.key = KEY; b.where = (document.title + '\n' + (document.body.innerText || '').slice(0, 2000));
          return of(API + m, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { setTimeout(function () { window.__gxEditing = false; }, 4000); return r; }, function (e) { window.__gxEditing = false; throw e; }); }
      }
    } catch (e) {}
    return of(u, o);
  };
  var ver = 0;
  function poll() {
    of(API + 'ver?g=' + NAME, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.v) return; if (!ver) { ver = j.v; return; }
      if (j.v !== ver) {
        try { var L = document.getElementById('gx-log'), bx = document.getElementById('gx-chat');
          sessionStorage.setItem('gx-live', JSON.stringify({ log: L ? L.innerHTML : '', hist: window.__gxHist || [], y: scrollY, x: scrollX, open: !!(bx && bx.classList.contains('on')), place: place() })); } catch (e) {}
        flash(true); setTimeout(function () { location.reload(); }, 260);
      }
    }).catch(function () {});
  }
  window.__gxPoll = poll;
  setInterval(function () { if (!document.hidden && !window.__gxEditing) poll(); }, 2500); poll();
  // Место, где стоял Влад (слово Влада 19.10.2026 01:52: «после правки я оказывался на том же месте… всё уходит в белое и из белого возвращается»).
  function pathOf(e) { var p = []; while (e && e !== document.body && e.parentElement) { p.unshift(Array.prototype.indexOf.call(e.parentElement.children, e)); e = e.parentElement; } return p.join('.'); }
  function byPath(p) { var e = document.body; p.split('.').forEach(function (i) { e = e && e.children[+i]; }); return e; }
  var SEL = /(^|\s)(on|active|sel|selected|cur|current)(\s|$)/;
  function place() {
    var sc = [], on = [];
    document.querySelectorAll('body *').forEach(function (e) {
      if (e.closest('#gx-chat,#gx-intro,#gx-white')) return;
      if (e.scrollTop > 2 || e.scrollLeft > 2) sc.push([pathOf(e), e.scrollTop, e.scrollLeft]);
      if ((e.tagName === 'BUTTON' || e.getAttribute('role') === 'tab' || e.tagName === 'A' || e.tagName === 'LI') && (SEL.test(e.className) || e.getAttribute('aria-selected') === 'true'))
        on.push([pathOf(e), (e.textContent || '').trim().slice(0, 40)]);
    });
    var cv = {}; try { if (window.__gardenState) cv = window.__gardenState(); } catch (e) {}
    var sn = document.getElementById('snd'), v = document.querySelector('video');
    return { sc: sc.slice(0, 40), on: on.slice(0, 20), hash: location.hash, st: cv, snd: !!((sn && sn.classList.contains('on')) || (v && !v.paused)) };
  }
  function restore(P) {
    if (!P) return;
    (P.on || []).forEach(function (o) {
      var e = byPath(o[0]);
      if (!e || (e.textContent || '').trim().slice(0, 40) !== o[1]) {  // разметка сдвинулась: ищем по тексту
        e = null; document.querySelectorAll('button,[role=tab],a,li').forEach(function (b) { if (!e && (b.textContent || '').trim().slice(0, 40) === o[1]) e = b; });
      }
      if (e && !SEL.test(e.className) && e.getAttribute('aria-selected') !== 'true') try { e.click(); } catch (x) {}
    });
    setTimeout(function () { (P.sc || []).forEach(function (o) { var e = byPath(o[0]); if (e) { e.scrollTop = o[1]; e.scrollLeft = o[2]; } }); }, 120);
    try { if (window.__gardenRestore && P.st) window.__gardenRestore(P.st); } catch (e) {}
  }
  function flash(on) {
    var w = document.getElementById('gx-white');
    if (!w) { w = document.createElement('div'); w.id = 'gx-white'; w.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:2147483647;pointer-events:none;opacity:0;transition:opacity .25s ease'; document.documentElement.appendChild(w); }
    if (on) { w.style.transition = 'opacity .25s ease'; requestAnimationFrame(function () { w.style.opacity = 1; }); }
    else { w.style.transition = 'opacity .7s ease'; w.style.opacity = 0; setTimeout(function () { w.remove(); }, 800); }
    return w;
  }
  var LIVE = null; try { LIVE = JSON.parse(sessionStorage.getItem('gx-live') || 'null'); sessionStorage.removeItem('gx-live'); } catch (e) {}
  var css = document.createElement('style');
  css.textContent = [
    '#gx-intro{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;',
    'background:radial-gradient(ellipse at 50% 40%,#f6ecd6 0%,#e9d9b8 60%,#d6c096 100%);color:' + INK + ';font-family:Georgia,"Times New Roman",serif;',
    '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation;transition:opacity .7s ease,visibility .7s}',
    '#gx-intro.out{opacity:0;visibility:hidden}',
    '#gx-intro:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.35;',
    'background-image:linear-gradient(rgba(90,59,34,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(90,59,34,.12) 1px,transparent 1px);background-size:28px 28px}',
    '#gx-stage{position:relative;width:min(72vw,300px);aspect-ratio:1;perspective:900px}',
    '#gx-stage svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}',
    '#gx-ring{animation:gxspin 70s linear infinite}',
    '#gx-man{animation:gxturn 9s linear infinite;transform-style:preserve-3d}',
    '@keyframes gxspin{to{transform:rotate(-360deg)}}',
    '@keyframes gxturn{from{transform:rotateY(0)}to{transform:rotateY(360deg)}}',
    '#gx-t{font:700 clamp(22px,6vw,34px)/1.15 Georgia,serif;text-align:center;max-width:88vw;letter-spacing:.01em}',
    '#gx-s{font:italic 16px/1.3 Georgia,serif;color:#6b4d33;min-height:1.3em;text-align:center}',
    '#gx-bar{width:min(60vw,240px);height:3px;background:rgba(42,28,19,.15);border-radius:3px;overflow:hidden}',
    '#gx-bar i{display:block;height:100%;width:0;background:' + INK + ';transition:width .4s ease}',
    '#gx-go{font:700 18px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:15px 30px;border:2px solid ' + INK + ';border-radius:16px;',
    'background:#F2C14E;color:' + INK + ';box-shadow:4px 5px 0 rgba(42,28,19,.32);opacity:0;transform:translateY(8px);transition:opacity .4s,transform .4s;pointer-events:none}',
    '#gx-go.on{opacity:1;transform:none;pointer-events:auto}',
    '#gx-ask{position:fixed;z-index:2147482000;left:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;align-items:center;gap:7px;',
    'font:700 15px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:12px 15px;border:2px solid ' + INK + ';border-radius:14px;',
    'background:#F3C9BC;color:' + INK + ';box-shadow:3px 4px 0 rgba(42,28,19,.32)}',
    '#gx-chat{position:fixed;z-index:2147482001;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);max-height:62vh;max-height:62dvh;',
    'display:none;flex-direction:column;box-sizing:border-box;padding:10px 12px 12px;background:#F6EEDC;border:2px solid ' + INK + ';border-radius:16px;',
    'box-shadow:4px 5px 0 rgba(42,28,19,.32);color:' + INK + ';font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '@media (min-width:760px){#gx-chat{left:auto;width:480px}}',
    '#gx-chat.on{display:flex}',
    '#gx-chat .h{display:flex;align-items:center;justify-content:space-between;font:700 17px Georgia,serif;margin-bottom:6px}',
    '#gx-chat .x{border:0;background:none;font:700 24px/1 sans-serif;color:' + INK + ';padding:0 4px}',
    '#gx-log{flex:1 1 auto;min-height:60px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;-webkit-user-select:text;user-select:text}',
    '#gx-log .m{margin:6px 0;padding:8px 10px;border-radius:12px;background:#fff8e8;border:1px solid rgba(42,28,19,.18);overflow-wrap:anywhere}',
    '#gx-log .q{background:#e7f0e0;margin-left:18%}',
    '#gx-log .e{background:#f6d6cc}',
    '#gx-st{font:600 13px/1.3 sans-serif;color:#6b4d33;min-height:1.3em;margin:4px 2px}',
    '#gx-chat .r{display:flex;gap:8px;margin-top:4px}',
    '#gx-in{flex:1;min-width:0;font:17px/1.2 sans-serif;padding:11px 12px;border:2px solid ' + INK + ';border-radius:14px;background:#FBF6EA;color:' + INK + '}',
    '#gx-chat .b{font:700 16px/1 sans-serif;padding:0 14px;border:2px solid ' + INK + ';border-radius:14px;background:#F2C14E;color:' + INK + ';min-height:46px}',
    '#gx-mic{background:#F3C9BC!important}#gx-mic.rec{background:#c0392b!important;color:#fff!important}',
    '#dock .btn{white-space:nowrap;font-size:14px!important;padding:11px 10px!important}#dock{gap:6px!important}#dock .ic{width:16px;height:16px}',
    '#gx-intro *,#gx-ask,#gx-chat button{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}'
  ].join('');
  (document.head || document.documentElement).appendChild(css);

  // Знак Влада (слово Влада 19.10.2026 01:35: «гораздо более лаконичное… из алхимии, про знания… круг вокруг уберём»):
  // алхимический Меркурий (Гермес: знание и вестник), линии прорисовываются, в сердце пульсирует золотое зерно.
  // кружащийся дервиш (Urban Dervish), юбка-ханг с бегущим краем, рука к путеводной звезде, кольцо-созвездие второго мозга.
  // 19.10.2026 02:15 слово Влада: «пусть там просто будет страница загрузки и кнопка без логотипа». Знак снят.
  var man = '';
  var ring = '';
  var title = (document.title || 'Сад').split(/[:—|]/)[0].trim();
  var LINES = ['меряю пропорции…', 'расставляю стенды…', 'настраиваю свет…', 'считаю числа…', 'сад почти готов…'];
  var intro = document.createElement('div');
  intro.id = 'gx-intro';
  intro.innerHTML = '<div id="gx-t"></div><div id="gx-s"></div><div id="gx-bar"><i></i></div><button id="gx-go">Войти ♪</button>';
  intro.querySelector('#gx-t').textContent = title;
  if (!LIVE) (document.body || document.documentElement).appendChild(intro);
  else {
    var w0 = flash(true); w0.style.transition = 'none'; w0.style.opacity = 1;
    var back = function () { restore(LIVE.place); scrollTo(LIVE.x || 0, LIVE.y || 0); setTimeout(function () { scrollTo(LIVE.x || 0, LIVE.y || 0); flash(false); }, 350); };
    if (document.readyState === 'complete') setTimeout(back, 150); else window.addEventListener('load', function () { setTimeout(back, 150); });
    setTimeout(function () { if (document.getElementById('gx-white')) flash(false); }, 4000);
    // звук сам не стартует без касания: возвращаем его на первом касании
    if (LIVE.place && LIVE.place.snd) { var once = function (e) { document.removeEventListener('pointerdown', once, true); if (!(e.target.closest && e.target.closest('#snd,#play'))) music(); }; document.addEventListener('pointerdown', once, true); }
  }
  var t0 = Date.now(), li = 0, ready = false, bar = intro.querySelector('#gx-bar i'), sub = intro.querySelector('#gx-s');
  sub.textContent = LINES[0];
  var tick = setInterval(function () {
    var p = ready ? 100 : Math.min(92, (Date.now() - t0) / 60);
    bar.style.width = p + '%';
    if ((Date.now() - t0) / 1400 > li + 1 && !ready) { li++; sub.textContent = LINES[li % LINES.length]; }
  }, 200);
  function done() {
    if (ready) return; ready = true;
    setTimeout(function () { bar.style.width = '100%'; sub.textContent = 'сад готов'; intro.querySelector('#gx-go').classList.add('on'); clearInterval(tick); },
      Math.max(0, 1800 - (Date.now() - t0)));
  }
  if (document.readyState === 'complete') setTimeout(done, 600); else window.addEventListener('load', function () { setTimeout(done, 600); });
  setTimeout(done, 12000);
  function music() {
    try {
      var s = document.getElementById('snd');
      if (s) { if (!s.classList.contains('on')) s.click(); return; }
      var v = document.querySelector('video'), p = document.getElementById('play');
      if (v && p && v.paused) p.click();
    } catch (e) {}
  }
  intro.querySelector('#gx-go').addEventListener('click', function () {
    music(); intro.classList.add('out');
    setTimeout(function () { intro.remove(); }, 800);
  });

  // ---------- спросить ассистента ----------
  function kit() {
    if (document.getElementById('chat') || document.getElementById('gx-ask')) return;
    var mic = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
    var btn = document.createElement('button'); btn.id = 'gx-ask'; btn.innerHTML = mic + 'спросить ассистента';
    var box = document.createElement('div'); box.id = 'gx-chat';
    box.innerHTML = '<div class="h"><span>Ассистент</span><button class="x" aria-label="Закрыть">×</button></div><div id="gx-log"></div><div id="gx-st"></div>' +
      '<div class="r"><input id="gx-in" placeholder="Спроси про то, что видишь" enterkeyhint="send"><button class="b" id="gx-send">→</button></div>' +
      '<div class="r"><button class="b" id="gx-mic" style="flex:1">' + mic.replace('width="18" height="18"', 'width="18" height="18" style="vertical-align:-3px;margin-right:6px"') + 'сказать голосом</button></div>';
    var nav = document.getElementById('nav'), turn = document.getElementById('turn');
    if (nav) {
      btn.className = 'btn'; btn.style.cssText = 'position:static;flex-basis:100%;justify-content:center;background:#F3C9BC';
      nav.style.flexWrap = 'wrap'; nav.style.justifyContent = 'flex-end'; nav.style.maxWidth = '270px'; nav.insertBefore(btn, nav.firstChild);
    } else if (turn) {
      btn.style.cssText = 'position:static;background:#F3C9BC;box-shadow:none;padding:9px 12px;font-size:14px;margin-left:6px';
      turn.parentNode.appendChild(btn);
    } else document.body.appendChild(btn);
    document.body.appendChild(box);
    var $ = function (id) { return document.getElementById(id); };
    var hist = [], busy = false, rec = null, chunks = [];
    window.__gxKit = 1;
    function open(on) { box.classList.toggle('on', on); btn.style.display = on ? 'none' : ''; }
    function add(cls, t) { var d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = t; $('gx-log').appendChild(d); $('gx-log').scrollTop = 1e9; return d; }
    function where() {
      var out = [], seen = 0;
      document.querySelectorAll('#card,.card,#panel,#info,.paper,#intro,main,section').forEach(function (e) {
        if (seen > 2200 || e.closest('#gx-chat,#gx-intro') || !e.offsetParent) return;
        var t = (e.innerText || '').trim(); if (t.length < 20 || out.indexOf(t) >= 0) return;
        out.push(t); seen += t.length;
      });
      if (!out.length) out.push((document.body.innerText || '').slice(0, 2000));
      return (title + '\n' + out.join('\n---\n')).slice(0, 2400);
    }
    function ask(text) {
      text = (text || '').trim(); if (!text || busy) return;
      var mode = !KEY ? 'ask' : UNDO.test(text) ? 'undo' : 'edit';
      busy = true; add('q', text); var p = add('a', mode === 'ask' ? 'Ассистент думает…' : mode === 'undo' ? 'Откатываю…' : 'Думаю, а если надо, правлю сад…'); var t0 = Date.now();
      if (mode !== 'ask') window.__gxEditing = true;
      var tk = mode === 'edit' ? setInterval(function () { $('gx-st').textContent = 'работаю… ' + Math.round((Date.now() - t0) / 1000) + ' с'; }, 1000) : 0;
      fetch(API + (mode === 'ask' ? 'ask' : mode), { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: NAME, where: where(), text: text, history: hist.slice(-3), key: KEY }) })
        .then(function (r) { return r.json().catch(function () { return { error: 'Сервер ответил непонятно.' }; }); })
        .then(function (j) {
          if (j.error) { p.className = 'm e'; p.textContent = j.error; }
          else { p.textContent = j.answer; hist.push([text, j.answer]); window.__gxHist = hist; $('gx-st').textContent = 'ответ за ' + Math.round((Date.now() - t0) / 100) / 10 + ' с'; }
        })
        .catch(function () { p.className = 'm e'; p.textContent = 'Нет связи с сервером. Попробуй ещё раз.'; })
        .then(function () { clearInterval(tk); busy = false; window.__gxEditing = false; $('gx-log').scrollTop = 1e9; if (mode !== 'ask') { if (!$('gx-st').textContent.indexOf('работаю')) $('gx-st').textContent = ''; window.__gxPoll(); } });
    }
    function stopRec() { if (rec && rec.state !== 'inactive') rec.stop(); }
    function startRec() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { $('gx-st').textContent = 'Голос тут не работает, напиши текстом.'; return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        chunks = []; rec = new MediaRecorder(stream);
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          $('gx-mic').classList.remove('rec'); $('gx-st').textContent = 'расшифровываю…';
          var blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          fetch(API + 'transcribe', { method: 'POST', headers: { 'Content-Type': (blob.type || 'audio/webm').split(';')[0] }, body: blob })
            .then(function (r) { return r.json(); })
            .then(function (j) { $('gx-st').textContent = ''; if (j.error) $('gx-st').textContent = j.error; else ask(j.text); })
            .catch(function () { $('gx-st').textContent = 'Не получилось расшифровать, напиши текстом.'; });
        };
        rec.start(); $('gx-mic').classList.add('rec'); $('gx-st').textContent = 'слушаю… нажми ещё раз, когда договоришь';
      }).catch(function (e) { var n = e && e.name || '';
        if (n === 'NotAllowedError') { $('gx-in').focus(); }
        $('gx-st').textContent = n === 'NotAllowedError' ? 'Браузер не дал микрофон. Жми микрофон на клавиатуре (диктовка) и говори. Разрешить сайту: аА слева от адреса → Настройки веб-сайта → Микрофон.'
          : 'Микрофон не включился (' + (n || 'нет ответа') + '). Попробуй в Safari или напиши текстом.'; });
    }
    if (LIVE) { $('gx-log').innerHTML = LIVE.log || ''; hist = LIVE.hist || []; if (LIVE.open) open(true); $('gx-st').textContent = 'сад обновился ✓'; $('gx-log').scrollTop = 1e9; }
    if (KEY) $('gx-in').placeholder = 'Спроси или скажи «сделай…», «верни как было»';
    btn.addEventListener('click', function () { open(true); });
    box.querySelector('.x').addEventListener('click', function () { stopRec(); open(false); });
    $('gx-send').addEventListener('click', function () { var v = $('gx-in').value; $('gx-in').value = ''; $('gx-in').blur(); ask(v); });
    $('gx-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('gx-send').click(); } });
    $('gx-mic').addEventListener('click', function () { if (rec && rec.state === 'recording') stopRec(); else startRec(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kit); else kit();
})();
