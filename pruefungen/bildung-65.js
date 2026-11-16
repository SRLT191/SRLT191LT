const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Bildung +15: A2-Wörter (Lexikalisches Minimum) nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'образование': ['Bildung', 'A2', 'n'], 'текст': ['Text', 'A2', 'm'], 'учительница': ['Lehrerin', 'A2', 'f'], 'институт': ['Institut|Hochschule', 'A2', 'm'],
      'страница': ['Seite', 'A2', 'f'], 'математика': ['Mathematik', 'A2', 'f'], 'буква': ['Buchstabe', 'A2', 'f'], 'чтение': ['Lesen', 'A2', 'n'], 'упражнение': ['Übung', 'A2', 'n'],
      'философия': ['Philosophie', 'A2', 'f'], 'аудитория': ['Hörsaal', 'A2', 'f'], 'цифра': ['Ziffer', 'A2', 'f'], 'литература': ['Literatur', 'A2', 'f'],
      'психология': ['Psychologie', 'A2', 'f'], 'ударение': ['Betonung', 'A2', 'n'] };
    const kl = getAllWordsOfCat('Bildung');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Bildung, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Bildung 67 (16.11.: Wörter verschoben)', kl.length === 67, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
