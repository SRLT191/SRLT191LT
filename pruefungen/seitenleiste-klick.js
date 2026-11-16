const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Seitenleiste: Oberkategorien (Substantive, Alltag, Verben …) klappen mit einem Klick auf und zu,
// ein Doppelklick übt alle Wörter aller Unterkategorien; Unterkategorien (z. B. Kleidung) mit einem Klick ganz.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  await p.evaluate(() => { setAppView('vocab'); selectMainCat('all'); });
  const st = () => p.evaluate(() => ({ a: activeMain, em: expandedMain, et: expandedTheme, n: getPool().length }));
  const tile = t => p.locator('#main-row .tile', { hasText: new RegExp('^' + t + '$') }).first();
  const sub = t => p.locator('#main-row .sub-btn', { hasText: t }).first();
  const warte = () => p.waitForTimeout(450);

  let s = await st(); const alle = s.n;
  await tile('Substantive').click(); s = await st();
  ok('Substantive: ein Klick klappt nur auf, Auswahl bleibt „Alle“', s.em === 'Substantive' && s.a === 'all', JSON.stringify(s));
  await warte(); await tile('Substantive').click(); s = await st();
  ok('Substantive: zweiter Klick (später) klappt wieder zu', s.em === null && s.a === 'all', JSON.stringify(s));
  await warte(); await tile('Substantive').dblclick(); s = await st();
  ok('Substantive: Doppelklick übt alle Substantive und bleibt aufgeklappt', s.a === 'Substantive' && s.em === 'Substantive' && s.n > 1000 && s.n < alle, JSON.stringify(s));
  await warte(); await p.evaluate(() => selectMainCat('all')); await tile('Substantive').click(); await warte();
  await sub('Alltag').click(); s = await st();
  ok('Alltag: ein Klick klappt nur auf', s.et === 'Alltag' && s.a === 'all', JSON.stringify(s));
  await warte(); await sub('Alltag').dblclick(); s = await st();
  const soll = await p.evaluate(() => catGroupCats('Alltag').reduce((a, c) => a + getAllWordsOfCat(c).length, 0));
  ok('Alltag: Doppelklick übt alle Wörter der 6 Unterkategorien', s.a === 'Alltag' && s.et === 'Alltag' && s.n === soll, JSON.stringify(s) + ' soll ' + soll);
  await warte();
  // Teilauswahl vorher setzen, dann ein Klick auf Kleidung → ganze Kategorie
  await p.evaluate(() => { selectedBlocksByCat['Kleidung'] = new Set([0]); buildNav(); });
  await sub('Kleidung').click(); s = await st();
  const kl = await p.evaluate(() => getAllWordsOfCat('Kleidung').length);
  const offen = await p.evaluate(() => document.getElementById('overlay-blocks').classList.contains('open'));
  ok('Kleidung: ein Klick übt sofort alle Wörter, kein Auswahlfenster', s.a === 'Kleidung' && s.n === kl && !offen, JSON.stringify(s) + ' / ' + kl);
  ok('Blockknopf nur bei der gewählten Kategorie sichtbar', await p.evaluate(() => [...document.querySelectorAll('#main-row .tile-blocks-btn')].filter(x => x.offsetParent).map(x => x.getAttribute('aria-label')).join() === 'Kleidung: Blöcke einzeln wählen'));
  await p.locator('#main-row .tile-wrap-active .tile-blocks-btn').click();
  ok('Knopf neben der Kategorie öffnet weiterhin die Blockauswahl', await p.evaluate(() => document.getElementById('overlay-blocks').classList.contains('open')));
  await p.evaluate(() => closeOverlay('overlay-blocks'));
  await warte(); await tile('Verben').click(); s = await st();
  ok('Verben: ein Klick klappt nur auf', s.et === 'Verben' && s.a === 'Kleidung', JSON.stringify(s));
  await warte(); await tile('Verben').dblclick(); s = await st();
  const verben = await p.evaluate(() => catGroupCats('Verben').reduce((a, c) => a + getAllWordsOfCat(c).length, 0));
  ok('Verben: Doppelklick übt alle Verben', s.a === 'Verben' && s.et === 'Verben' && s.n === verben, JSON.stringify(s) + ' soll ' + verben);
  await warte(); await p.locator('#main-row .sub-btn', { hasText: 'Bewegungsverben' }).first().click(); s = await st();
  ok('Bewegungsverben: ein Klick übt die ganze Kategorie', s.a === 'Bewegungsverben' && s.n === await p.evaluate(() => getAllWordsOfCat('Bewegungsverben').length), JSON.stringify(s));
  ok('Hinweis im Tooltip der Oberkategorien', await p.evaluate(() => /Doppelklick/.test([...document.querySelectorAll('#main-row .tile')].find(x => /Verben/.test(x.textContent)).title)));
  const ud = await p.evaluate(() => allVocabWords().find(w => w.ru === 'удобный').de.join('|'));
  ok('удобный: bequem, praktisch', ud === 'bequem|praktisch', ud);
  // Handy: Doppeltipp auf Oberkategorie übt alle und schließt die Seitenleiste
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
  const r = await m.evaluate(async () => { setAppView('vocab'); selectMainCat('all');
    const t = () => [...document.querySelectorAll('#main-row .tile')].find(x => x.textContent.trim() === 'Adjektive');
    t().click(); const auf = expandedTheme; t().click();
    return { auf, a: activeMain, et: expandedTheme }; });
  ok('Handy: Doppeltipp auf Adjektive übt alle Adjektive', r.auf === 'Adjektive' && r.a === 'Adjektive' && r.et === 'Adjektive', JSON.stringify(r));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
