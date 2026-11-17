const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Religion +17: Substantive nach Häufigkeit (keine passenden A1/A2-Wörter mehr)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'Рождество': ['Weihnachten', 'A2', 'n'], 'судьба': ['Schicksal', 'A2', 'f'], 'чудо': ['Wunder', 'A2', 'n'], 'дух': ['Geist', 'A2', 'm'],
      'дьявол': ['Teufel|Satan', 'B1', 'm'], 'вечность': ['Ewigkeit', 'B1', 'f'], 'проклятие': ['Fluch', 'B2', 'n'], 'пастор': ['Pastor|Pfarrer', 'B2', 'm'],
      'богиня': ['Göttin', 'B2', 'f'], 'епископ': ['Bischof', 'C1', 'm'], 'Библия': ['Bibel', 'C1', 'f'], 'спаситель': ['Erlöser|Heiland', 'C1', 'm'],
      'колокол': ['Glocke', 'C1', 'm'], 'монах': ['Mönch', 'C1', 'm'], 'католик': ['Katholik', 'C1', 'm'], 'христианин': ['Christ', 'C1', 'm'], 'мусульманин': ['Muslim', 'C1', 'm'] };
    const kl = getAllWordsOfCat('Religion');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Religion, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Religion 70 (17.11.: auf 70 erweitert)', kl.length === 70, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
