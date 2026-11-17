const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Tiere +15: A2-Wort животное, dann Substantive nach Häufigkeit (keine A1-Wörter mehr)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'животное': ['Tier', 'A2', 'n'], 'хвост': ['Schwanz', 'B1', 'm'], 'зверь': ['wildes Tier', 'B2', 'm'], 'пёс': ['Hund', 'B2', 'm'],
      'пони': ['Pony', 'B2', 'm'], 'крыло': ['Flügel', 'B2', 'n'], 'конь': ['Ross', 'B2', 'm'], 'щенок': ['Welpe', 'B2', 'm'], 'бык': ['Stier', 'C1', 'm'],
      'осёл': ['Esel', 'C1', 'm'], 'стадо': ['Herde', 'C1', 'n'], 'муха': ['Fliege', 'C1', 'f'], 'перо': ['Feder', 'C1', 'n'], 'цыплёнок': ['Küken', 'C1', 'm'],
      'стая': ['Schwarm', 'C1', 'f'] };
    const kl = getAllWordsOfCat('Tiere');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Tiere, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Tiere 70 (17.11.: auf 70 erweitert)', kl.length === 70, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
