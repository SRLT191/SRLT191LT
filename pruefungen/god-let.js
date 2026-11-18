const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// год / лет (18.11.): Einzahl/Mehrzahl auf einer Karte wie лист / листья – Stufe A1, Lernstand von год übernommen,
// „лет“ im Text führt zur Karte, nicht im Werkzeug Geschlecht
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const w = getAllWordsOfCat('Zeit').find(x => x.ru === 'год / лет');
    return { w: w && { tr: w.tr, de: w.de.join('|'), alt: (w.ruAlt || []).join('|') }, alt: allVocabWords().some(x => x.ru === 'год'),
      merged: JSON.stringify(MERGED_CARDS['год / лет']), lv: w && wordLevel(w), lesen: (readKarte('лет') || {}).ru, lesen2: (readKarte('года') || {}).ru,
      gex: GENDER_EXCLUDE.has('лет') && !GENDER_EXCLUDE.has('год') };
  });
  ok('Karte „год / лет“ in Zeit', !!r.w && r.w.tr === 'god / let' && r.w.de === 'Jahr|Jahre' && r.w.alt === 'год|лет|год/лет', JSON.stringify(r.w));
  ok('Keine Einzelkarte год mehr, MERGED_CARDS übernimmt den Lernstand', !r.alt && r.merged === '["год","лет"]', r.merged);
  ok('Stufe A1', r.lv === 'A1', r.lv);
  ok('„лет“ und „года“ im Text führen zur Karte', r.lesen === 'год / лет' && r.lesen2 === 'год / лет', r.lesen + ' · ' + r.lesen2);
  ok('лет nicht im Werkzeug Geschlecht, год schon', r.gex);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
