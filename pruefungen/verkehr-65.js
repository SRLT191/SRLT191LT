const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Verkehr +15: A1-Wörter (FIPI-Vormerkliste), dann Substantive nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'станция': ['Station', 'A1', 'f'], 'транспорт': ['Verkehrsmittel', 'A1', 'm'], 'троллейбус': ['Oberleitungsbus', 'A1', 'm'], 'проезд': ['Fahrt', 'A1', 'm'],
      'проездной': ['Monatskarte', 'A1', 'm'], 'автовокзал': ['Busbahnhof', 'A1', 'm'], 'перрон': ['Bahnsteig', 'A1', 'm'], 'контролёр': ['Kontrolleur', 'A1', 'm'],
      'движение': ['Verkehr', 'B1', 'n'], 'права': ['Führerschein', 'B1', 'pl'], 'фургон': ['Lieferwagen', 'B1', 'm'], 'линия': ['Linie', 'B1', 'f'], 'сиденье': ['Sitz', 'B2', 'n'],
      'топливо': ['Kraftstoff', 'B2', 'n'], 'эскалатор': ['Rolltreppe', 'C1', 'm'] };
    const kl = getAllWordsOfCat('Verkehr');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Verkehr, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Verkehr 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
