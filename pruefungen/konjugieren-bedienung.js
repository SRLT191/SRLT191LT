const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Konjugieren (7.11.): Reihenfolge und „Auch Verben ohne Tabelle“ im ⋯-Menü, in der Leiste nur Aspekt, Zeit
// und die Schalter „Muster“ (Konjugationsklasse neben dem Verb) und „Nur Endungen“ (Stamm vorgegeben);
// Sitzungszähler heißt „In dieser Sitzung: …“
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    setAppView('grammar'); openConjugate(); const out = {};
    const leiste = document.querySelector('#overlay-conjugate .gt-settings-row, .grammar-panel.open .gt-settings-row');
    // seit 11.11. stehen alle Einstellungen in der Leiste (einheitlich), im ⋯-Menü nur „Leeren“
    out.leiste = !!leiste.querySelector('#conj-sort-btn') && !!leiste.querySelector('#conj-scope-btn') && !!leiste.querySelector('#conj-class-toggle') && !!leiste.querySelector('#conj-endings-toggle') && !!leiste.querySelector('.grammar-note-toggle');
    const menu = document.querySelector('.grammar-panel.open .gt-more-menu');
    out.menu = !menu.querySelector('#conj-sort-btn') && !menu.querySelector('#conj-scope-btn') && !menu.querySelector('.grammar-note-toggle') && /Leeren/.test(menu.textContent);
    out.sort = document.getElementById('conj-sort-btn').textContent.trim();
    toggleConjScope(); const sc = document.getElementById('conj-scope-btn'); out.scope = [sc.getAttribute('aria-pressed'), sc.classList.contains('gt-on'), sc.textContent.trim(), [...document.querySelectorAll('#conj-verb-select option')].length];
    toggleConjScope(); out.scopeAus = [sc.getAttribute('aria-pressed'), sc.textContent.trim(), [...document.querySelectorAll('#conj-verb-select option')].length];
    // Muster
    document.getElementById('conj-verb-select').value = 'строить'; renderConjugationTable();
    out.chipAus = !document.querySelector('#conj-de-hint .conj-class-chip');
    toggleConjClassHint(); out.chip = (document.querySelector('#conj-de-hint .conj-class-chip') || {}).textContent;
    document.getElementById('conj-verb-select').value = 'печь'; renderConjugationTable(); out.chipSonder = (document.querySelector('#conj-de-hint .conj-class-chip') || {}).textContent;
    setConjTense('past'); out.chipPast = !document.querySelector('#conj-de-hint .conj-class-chip'); setConjTense('nonpast');
    // Nur Endungen
    document.getElementById('conj-verb-select').value = 'писать'; toggleConjEndings();
    const ins = [...document.querySelectorAll('#conj-grid input')];
    out.stamm = [...document.querySelectorAll('#conj-grid .conj-stem')].map(x => x.textContent);
    ins.forEach(i => i.value = i.dataset.answer.slice(i.dataset.stem.length)); checkConjugationTable();
    out.richtig = document.getElementById('conj-result').textContent; out.srs = (loadGrammarSrs().conj || {})['писать'];
    renderConjugationTable(); revealConjugationRow(0); out.aufgedeckt = [document.getElementById('conj-input-0').value, document.getElementById('conj-input-0').dataset.stem];
    ins.slice(0, 0); document.querySelectorAll('#conj-grid input').forEach(i => i.value = 'x'); checkConjugationTable(); out.falsch = document.getElementById('conj-result').textContent;
    setConjTense('future'); out.futur = document.querySelectorAll('#conj-grid .conj-stem').length;
    setConjTense('past'); out.vgh = [...new Set([...document.querySelectorAll('#conj-grid .conj-stem')].map(x => x.textContent))];
    out.sum = document.querySelector('.grammar-panel.open .gt-settings-sum').textContent;
    out.score = document.getElementById('conj-score').textContent;
    out.stems = { хотеть: conjStem(Object.values(conjugationData['хотеть'].nonPast)), быть: conjStem(['буду', 'будешь', 'будет', 'будем', 'будете', 'будут']), zweiWort: conjStem(['буду жить', 'будешь жить']) };
    return out;
  });
  ok('Leiste: alle Einstellungen (auch Reihenfolge, Umfang, Erklärung zur Form); im ⋯-Menü nur Leeren', r.leiste && r.menu && r.sort === 'Reihenfolge: Regel → Sonderfall', JSON.stringify([r.leiste, r.menu, r.sort]));
  ok('„Auch Verben ohne Tabelle“ als Schalter in der Leiste, erweitert die Liste', r.scope[0] === 'true' && r.scope[1] && /mit Tabelle\)$/.test(r.scope[2]) && r.scope[3] > r.scopeAus[2] && r.scopeAus[0] === 'false' && r.scopeAus[1] === 'Auch Verben ohne Tabelle', JSON.stringify([r.scope, r.scopeAus]));
  ok('Muster: aus = kein Abzeichen; an = „2. Konj.“ / „Sonderfall“; nicht in der Vergangenheit', r.chipAus && r.chip === '2. Konj.' && r.chipSonder === 'Sonderfall' && r.chipPast, JSON.stringify([r.chipAus, r.chip, r.chipSonder, r.chipPast]));
  ok('Nur Endungen: Stamm пиш vorgegeben, Endungen genügen, wird gespeichert', r.stamm.length === 6 && r.stamm.every(x => x === 'пиш') && /^6 \/ 6 richtig/.test(r.richtig) && r.srs && r.srs.correct === 1, JSON.stringify([r.stamm, r.richtig, r.srs]));
  ok('Aufdecken zeigt nur die Endung; falsche Endung wird erkannt', r.aufgedeckt[0] === 'у' && r.aufgedeckt[1] === 'пиш' && /^0 \/ 6 richtig/.test(r.falsch), JSON.stringify([r.aufgedeckt, r.falsch]));
  ok('kein Stamm beim буду-Futur; Vergangenheit писа|л; Wechsel bleibt sichtbar (хо|чу, хо|тим)', r.futur === 0 && r.vgh.join() === 'писа' && r.stems.хотеть === 'хо' && r.stems.zweiWort === '' && r.stems.быть === 'буд', JSON.stringify([r.futur, r.vgh, r.stems]));
  ok('Kurzfassung nennt eingeschaltete Schalter; Zähler „In dieser Sitzung“', /Muster · Nur Endungen/.test(r.sum) && /^In dieser Sitzung: \d+ von \d+ Tabellen richtig$/.test(r.score), JSON.stringify([r.sum, r.score]));
  await p.reload(); await p.waitForTimeout(400);
  const gemerkt = await p.evaluate(() => { setAppView('grammar'); openConjugate(); return [conjState.classHint, conjState.endings, document.getElementById('conj-endings-toggle').getAttribute('aria-pressed')]; });
  ok('Schalter bleiben nach dem Neuladen', gemerkt.join() === 'true,true,true', JSON.stringify(gemerkt));
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openConjugate(); conjState.endings = true; renderConjugationTable(); const i = document.getElementById('conj-input-0').getBoundingClientRect(); return { ueber: document.documentElement.scrollWidth - innerWidth, breite: Math.round(i.width) }; });
  ok('Handy mit Stamm: kein Überlauf, Feld breit genug', h.ueber <= 0 && h.breite >= 80, JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
