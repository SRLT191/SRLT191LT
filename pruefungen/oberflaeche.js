const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Benutzeroberfläche (Gesamtprüfung 30.10., Tabelle „Benutzeroberfläche“): Dialoge mit Titel und Fokusführung,
// „Wiederholung“ statt „Stufe“ für die Wiederholungsstufen, Zahlen der Stufen-Übersicht am Handy, Rahmen der
// Eingabefelder ≥ 3 : 1, keine Schrift unter 11 px, „Bewegung reduzieren“
const { chromium } = require('playwright');
const OPEN = {
  'overlay-categories': 'openCategoryPicker()', 'overlay-worddetail': "setAppView('vocab');openWordDetail(currentWord)", 'overlay-levels': 'openLevelOverview()',
  'overlay-placement': 'openPlacement()', 'overlay-settings': 'openSettings()', 'overlay-session': "setAppView('vocab');openSessionSummary()",
  'overlay-formpicker': "setAppView('grammar');showGrammarPanel('conjugate');openFormPicker('conj')", 'overlay-vocab': 'openVocabList()', 'overlay-alphabet': 'openAlphabet()',
};
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);

  // 1 jeder Dialog: Rolle und Titel am Dialogkasten, nicht doppelt am Hintergrund
  const a11y = await p.evaluate(() => [...document.querySelectorAll('.overlay')].map(o => {
    const box = o.querySelector('.overlay-box') || o, id = box.getAttribute('aria-labelledby'), t = id && document.getElementById(id);
    return { id: o.id, ok: box.getAttribute('role') === 'dialog' && !!t && !!t.textContent.trim() && (o === box || !o.hasAttribute('role')) };
  }).filter(x => !x.ok).map(x => x.id));
  ok('1 Jeder Dialog mit Rolle und verknüpftem Titel, keine doppelte Rolle', a11y.length === 0, a11y.join(', '));

  // 2 Fokus: hinein, Tab bleibt drin, Esc → zurück zum Auslöser
  const fok = [];
  for (const [id, js] of Object.entries(OPEN)) {
    await p.evaluate(() => { document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')); });
    await p.waitForTimeout(50);
    await p.evaluate(() => { const bt = document.getElementById('alphabet-btn') || document.querySelector('.hdr-actions button, .tool-btn'); bt.focus(); window.__opener = document.activeElement; });
    await p.evaluate(js); await p.waitForTimeout(120);
    const drin = await p.evaluate(id => document.getElementById(id).contains(document.activeElement), id);
    let tabDrin = true; for (let i = 0; i < 25; i++) { await p.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab'); if (!(await p.evaluate(id => document.getElementById(id).contains(document.activeElement), id))) { tabDrin = false; break; } }
    await p.keyboard.press('Escape'); await p.waitForTimeout(80);
    const zurueck = await p.evaluate(id => !document.getElementById(id).classList.contains('open') && document.activeElement === window.__opener, id);
    if (!(drin && tabDrin && zurueck)) fok.push(id + ' ' + JSON.stringify({ drin, tabDrin, zurueck }));
  }
  ok('2 Fokus springt in jeden Dialog, Tab bleibt darin, Esc gibt ihn dem Auslöser zurück', fok.length === 0, fok.join(' | '));
  const stapel = await p.evaluate(async () => { setAppView('vocab'); openVocabList(); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30))); const inListe = document.activeElement;
    openWordDetail(currentWord); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30))); const inDetail = document.getElementById('overlay-worddetail').contains(document.activeElement);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise(r => setTimeout(r, 30));
    const r = { inDetail, liste: document.getElementById('overlay-vocab').classList.contains('open'), zurueck: document.activeElement === inListe }; closeOverlay('overlay-vocab'); return r; });
  ok('2 Wortdetails über der Vokabelliste: Esc schließt nur die Details, Fokus zurück in die Liste', stapel.inDetail && stapel.liste && stapel.zurueck, JSON.stringify(stapel));

  // 3 „Wiederholung“ für die Wiederholungsstufen
  const txt = await p.evaluate(() => {
    const L = loadLifetime(), now = Date.now(); allVocabWords().slice(0, 40).forEach((w, i) => { L.v[getKey(w)] = { c: 1, w: 0, mb: 1, l: now - 9e8, z: now, d: 1 + (i % 5), dd: now - 30 * 864e5 }; }); saveLifetime();
    setAppView('home'); const home = document.getElementById('home-view').innerHTML; openLevelOverview(); const lv = document.getElementById('level-overview-body').innerHTML; closeOverlay('overlay-levels');
    const leg = [...document.querySelectorAll('#home-stufen .home-legend')].map(x => x.textContent.trim().replace(/\s+/g, ''));
    return { stufeZahl: (home + lv).match(/Stufe \d/g) || [], wdh: /Wiederholung 5 \(sicher\)/.test(home + lv), leg };
  });
  ok('3 Keine „Stufe 1–5“ mehr für Wiederholungsstufen (Startseite, Stufen-Übersicht)', txt.stufeZahl.length === 0 && txt.wdh && txt.leg[0].startsWith('Wiederholung1'), JSON.stringify(txt));

  // 5 Rahmen der Eingabefelder ≥ 3 : 1, hell und dunkel; 6 keine Schrift unter 11 px
  for (const scheme of ['light', 'dark']) {
    const q = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme }); await q.goto('file://' + APP_PATH); await q.waitForTimeout(300);
    const k = await q.evaluate(() => {
      const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const cr = (el, bgEl) => { const a = lum(parse(getComputedStyle(el).borderTopColor)), c = lum(parse(getComputedStyle(bgEl).backgroundColor)); return Math.round((Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05) * 100) / 100; };
      setAppView('vocab'); const inp = document.getElementById('answer-input');
      const out = { antwort: cr(inp, inp), seite: cr(inp, document.body) };
      openVocabList(); const s = document.getElementById('vocab-search'); out.suche = cr(s, s); closeOverlay('overlay-vocab');
      return out;
    });
    ok('5 ' + scheme + ': Rahmen der Eingabefelder ≥ 3 : 1', k.antwort >= 3 && k.suche >= 3, JSON.stringify(k));
    if (scheme === 'light') {
      const klein = await q.evaluate(() => { const out = new Set(); ['home', 'vocab', 'grammar', 'listening'].forEach(v => { setAppView(v); document.querySelectorAll('body *').forEach(e => { if (!e.getClientRects().length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return; if (parseFloat(getComputedStyle(e).fontSize) < 11) out.add(v + ': ' + (e.id || e.className || e.tagName)); }); }); return [...out]; });
      ok('6 Keine sichtbare Schrift unter 11 px (vier Ansichten)', klein.length === 0, klein.slice(0, 5).join(' | '));
    }
    await q.close();
  }

  // 7 Bewegung reduzieren
  const rm = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }); await rm.goto('file://' + APP_PATH); await rm.waitForTimeout(300);
  const t = await rm.evaluate(() => { setAppView('vocab'); const d = s => parseFloat(getComputedStyle(document.querySelector(s)).transitionDuration) || 0; return { feld: d('#answer-input'), knopf: d('.tool-btn') }; });
  const t0 = await p.evaluate(() => { setAppView('vocab'); return parseFloat(getComputedStyle(document.getElementById('answer-input')).transitionDuration) || 0; });
  ok('7 „Bewegung reduzieren“ schaltet Übergänge ab (sonst bleiben sie)', t.feld < 0.001 && t.knopf < 0.001 && t0 > 0.05, JSON.stringify({ reduziert: t, normal: t0 }));
  await rm.close();

  // 4 Handy (Touch, kein Darüberfahren): Antippen einer Stufenzeile zeigt die Zahlen, der Link öffnet den Stufenplan
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
  const h = await m.evaluate(() => { openLevelOverview(); const vorher = document.querySelector('#lvl-plan-tabs .mode-btn.active').dataset.l;
    document.querySelector('#level-overview-body .lvl-row[data-l="B2"]').click(); const det = document.getElementById('lvl-det-B2');
    const r = { hover: matchMedia('(hover: none)').matches, sicht: !det.hidden, text: det.textContent, plan: document.querySelector('#lvl-plan-tabs .mode-btn.active').dataset.l, vorher, aria: document.querySelector('.lvl-row[data-l="B2"]').getAttribute('aria-expanded') };
    det.querySelector('button').click(); r.nachLink = document.querySelector('#lvl-plan-tabs .mode-btn.active').dataset.l; return r; });
  ok('4 Handy: Antippen zeigt Zahlen und Übungsstand, öffnet den Plan erst über den Link', h.hover && h.sicht && /noch nicht geübt/.test(h.text) && /aktuell \(Übungsstand\)/.test(h.text) && h.plan === h.vorher && h.aria === 'true' && h.nachLink === 'B2', JSON.stringify(h));
  const bl = await m.evaluate(() => { setAppView('vocab'); selectWholeCat('Reisen'); const b = document.querySelector('.tile-wrap-active .tile-blocks-btn') || document.querySelector('.tile-blocks-btn');
    b.style.display = 'flex'; const r = b.getBoundingClientRect(), cs = getComputedStyle(b), st = getComputedStyle(b.nextElementSibling || b); return { w: Math.round(r.width), h: Math.round(r.height), icon: parseFloat(getComputedStyle(b.querySelector('i')).fontSize), bg: cs.backgroundColor, stern: Math.round((b.nextElementSibling || b).getBoundingClientRect().width) }; });
  ok('Handy: Blockwahl und Stern in der Seitenleiste 44 px groß mit 18-px-Symbol, Blockwahl als Knopf erkennbar', bl.w >= 44 && bl.h >= 44 && bl.icon >= 18 && bl.stern >= 44 && !/rgba\(0, 0, 0, 0\)|transparent/.test(bl.bg), JSON.stringify(bl));
  await ctx.close();

  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
