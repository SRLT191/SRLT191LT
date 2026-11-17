const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Freizeit & Kultur +11: 5 aus der A1-Liste (FIPI), 6 aus der A2-Liste
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'кафе': ['Café', 'A1', 'n'], 'ресторан': ['Restaurant', 'A1', 'm'], 'столовая': ['Kantine|Mensa', 'A1', 'f'],
      'кинотеатр': ['Kino|Lichtspielhaus', 'A1', 'm'], 'парикмахерская': ['Friseursalon', 'A1', 'f'], 'фильм': ['Film', 'A2', 'm'],
      'песня': ['Lied', 'A2', 'f'], 'танец': ['Tanz', 'A2', 'm'], 'искусство': ['Kunst', 'A2', 'n'], 'культура': ['Kultur', 'A2', 'f'], 'цирк': ['Zirkus', 'A2', 'm'] };
    const kl = getAllWordsOfCat('Freizeit & Kultur');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Freizeit & Kultur, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0]) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Freizeit & Kultur 70 (17.11.: auf 70 erweitert)', kl.length === 70, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
