const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Körperteile +5: лицо (A2-Liste), губа, щека, горло, кровь (Stufe nach Häufigkeit geschätzt)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'лицо': ['Gesicht', 'A2', 'n'], 'губа': ['Lippe', 'B1', 'f'], 'щека': ['Wange', 'B2', 'f'], 'горло': ['Hals|Kehle', 'B1', 'n'], 'кровь': ['Blut', 'A2', 'f'] };
    const kt = getAllWordsOfCat('Körperteile');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kt.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Körperteile, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0]) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g);
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Körperteile 70 (17.11.: auf 70 erweitert)', kt.length === 70, String(kt.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
