const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Fixes der Gesamtprüfung 26.10.: Tippflächen in Kategorienauswahl, Suche und Konjugation am Handy, Satz bei ой
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const m = await b.newPage({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  const errs = []; m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  await check('Hörtrainer-Kategorien: Zeilen, Häkchen-Fläche, Alle/Keine und Suche mindestens 44 px', () => m.evaluate(async () => {
    setAppView('listening'); showListeningPanel('hoertrainer'); openHoerCats('ht'); await new Promise(r => setTimeout(r, 80));
    const vis = sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent);
    const row = vis('.cat-group-title[data-cats]')[0], hit = vis('.cat-group-hit')[0], links = vis('.picker-quick a'), su = document.getElementById('ht-cat-search');
    const r = e => e.getBoundingClientRect();
    const info = ['Zeile ' + Math.round(r(row).height), 'Häkchen ' + Math.round(r(hit).width) + 'x' + Math.round(r(hit).height), 'Links ' + links.map(a => Math.round(r(a).width) + 'x' + Math.round(r(a).height)).join('/'), 'Suche ' + Math.round(r(su).height)];
    const ok = r(row).height >= 44 && r(hit).width >= 44 && r(hit).height >= 44 && links.every(a => r(a).width >= 44 && r(a).height >= 44) && r(su).height >= 44;
    return { ok, info: info.join(', ') };
  }));
  await check('Häkchen der Gruppe wählt alle aus, ohne die Gruppe zuzuklappen', () => m.evaluate(async () => {
    setAppView('listening'); showListeningPanel('hoertrainer'); openHoerCats('ht'); await new Promise(r => setTimeout(r, 80));
    const t = [...document.querySelectorAll('.cat-group-title[data-sub]')].find(e => e.offsetParent);
    if (!t) return { ok: false, info: 'keine Untergruppe' };
    const cats = t.dataset.cats.split('|'); const vorher = getComputedStyle(t.parentElement.querySelector('input[data-cat="' + cats[0] + '"]').closest('label, div')).display;
    // Hörtrainer übernimmt beim Start ggf. schon eine Auswahl: erwartet wird der umgekehrte Stand des Gruppenhäkchens
    const soll = !t.querySelector('.cat-group-check').checked;
    t.querySelector('.cat-group-hit').click();
    const alle = cats.every(c => { const cb = t.parentElement.querySelector('input[data-cat="' + c + '"]'); return !cb || cb.checked === soll; });
    const nachher = getComputedStyle(t.parentElement.querySelector('input[data-cat="' + cats[0] + '"]').closest('label, div')).display;
    t.querySelector('.cat-group-hit').click(); closeOverlay('overlay-hoercats');
    return { ok: alle && vorher === nachher, info: 'alle ' + alle + ', Anzeige ' + vorher + ' → ' + nachher };
  }));
  await check('Konjugieren: Eingabefelder am Handy 44 px hoch', () => m.evaluate(() => { setAppView('grammar'); showGrammarPanel('conjugate'); const h = document.getElementById('conj-input-0').getBoundingClientRect().height; return { ok: h >= 44, info: h + ' px' }; }));
  await check('ой: deutscher Satz passt zur Karte („Aua“)', () => m.evaluate(() => { const s = getWordSentence(allVocabWords().find(x => x.ru === 'ой')); return { ok: /^Aua,/.test(s.de), info: s.de }; }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  if (R.some(r => r[0] !== 'OK ')) process.exitCode = 1;
  await b.close();
})();
