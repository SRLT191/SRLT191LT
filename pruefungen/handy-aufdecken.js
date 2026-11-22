const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Handy: Kopfbereich in einer Zeile, Kartenaktionen in einer Zeile,
// „Gewusst“/„Nicht gewusst“ beim Aufdecken immer über der Leiste unten sichtbar, ohne die Antwort zu verdecken; PC unverändert
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const errs = [];
  // mit Browserleiste (Vivaldi am Handy) ist der sichtbare Bereich deutlich niedriger
  for (const [w, h] of [[412, 690], [360, 560]]) for (const dir of ['ru-de', 'de-ru']) {
    const m = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    m.on('pageerror', e => errs.push(e.message));
    await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
    await m.evaluate(d => { setAppView('vocab'); setDirection(d); setMode('flip'); window.scrollTo(0, 0); flipReveal(); }, dir);
    await m.waitForTimeout(700);
    await check(w + '×' + h + ' ' + dir + ': aufgedeckte Antwort steht über der Knopfleiste (nicht verdeckt)', () => m.evaluate(() => {
      const a = document.getElementById('correct-reveal').getBoundingClientRect(), k = document.getElementById('flip-row').getBoundingClientRect();
      return { ok: a.top >= 0 && a.bottom <= k.top + 0.5, info: 'Antwort ' + Math.round(a.top) + '–' + Math.round(a.bottom) + ', Knöpfe ab ' + Math.round(k.top) };
    }));
    await m.close();
  }
  for (const [w, h] of [[412, 780], [360, 600], [320, 568]]) {
    const m = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    m.on('pageerror', e => errs.push(e.message));
    await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
    await check(w + '×' + h + ': Aufdecken – Knöpfe ganz über der Leiste unten, ohne Scrollen', () => m.evaluate(async () => {
      setAppView('vocab'); setMode('flip'); flipReveal(); window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 80));
      const k = document.getElementById('flip-known').getBoundingClientRect(), nav = document.getElementById('app-header').getBoundingClientRect();
      return { ok: k.bottom <= nav.top + 0.5 && k.top >= 0, info: Math.round(k.top) + '–' + Math.round(k.bottom) + ', Leiste ab ' + Math.round(nav.top) };
    }));
    await check(w + '×' + h + ': Kategorie, Vokabelliste und Alphabet in einer Zeile; Kartenaktionen in einer Zeile (auch Verbkarte mit Aspektpaar, fünf Knöpfe); kein Überlauf', () => m.evaluate(() => {
      // fester Fall statt zufälliger Karte (22.11.): die breiteste Kartenzeile hat eine Verbkarte mit Aspektpaar (Knopf „Vollendet“)
      selectWholeCat('Alltagsverben'); for (let i = 0; i < 300 && !document.getElementById('pf-btn').offsetParent; i++) nextWord();
      const pfSichtbar = !!document.getElementById('pf-btn').offsetParent;
      const t = document.getElementById('sidebar-mobile-toggle').getBoundingClientRect(), tools = document.getElementById('sidebar-tools').getBoundingClientRect();
      const acts = [...document.querySelectorAll('#card-actions .card-act')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().top));
      const eineZeile = Math.abs(t.top - tools.top) < 2, aktZeile = new Set(acts).size === 1, kein = document.documentElement.scrollWidth <= innerWidth;
      return { ok: eineZeile && aktZeile && kein && pfSichtbar, info: 'Kopf ' + eineZeile + ', Aktionen ' + aktZeile + ' (' + acts.length + ' Knöpfe, „Vollendet“ ' + pfSichtbar + '), Breite ' + document.documentElement.scrollWidth };
    }));
    await m.close();
  }
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  await check('PC: Knöpfe im normalen Fluss, Transliteration mit Beschriftung', () => p.evaluate(() => {
    setAppView('vocab'); setMode('flip'); flipReveal();
    const pos = getComputedStyle(document.getElementById('flip-row')).position, lab = getComputedStyle(document.getElementById('transcription-btn-label')).display;
    return { ok: pos === 'static' && lab !== 'none', info: pos + ', ' + lab };
  }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  if (R.some(r => r[0] !== 'OK ')) process.exitCode = 1;
  await b.close();
})();
