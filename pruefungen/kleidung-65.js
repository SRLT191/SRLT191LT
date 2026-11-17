const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Kleidung +15: джинсы, толстовка, ботинки (A1 nach FIPI), übrige nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'джинсы': ['Jeans', 'A1', 'pl'], 'толстовка': ['Sweatshirt', 'A1', 'f'], 'ботинки': ['Schuhe|Schnürschuhe', 'A1', null],
      'трусы': ['Unterhose', 'B1', 'pl'], 'шляпа': ['Hut', 'B2', 'f'], 'карман': ['Tasche|Hosentasche', 'B2', 'm'], 'ткань': ['Stoff', 'B2', 'f'],
      'мода': ['Mode', 'C1', 'f'], 'рукав': ['Ärmel', 'C1', 'm'], 'униформа': ['Uniform', 'C1', 'f'], 'капюшон': ['Kapuze', 'C1', 'm'],
      'колготки': ['Strumpfhose', 'C1', 'pl'], 'фартук': ['Schürze', 'C1', 'm'], 'шнурок': ['Schnürsenkel', 'C1', 'm'], 'пуховик': ['Daunenjacke', 'C1', 'm'] };
    const kl = getAllWordsOfCat('Kleidung');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Kleidung, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0]) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('ботинки (Plural von ботинок) nicht im Geschlechter-Werkzeug', genderOf('ботинки') === null);
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Kleidung 70 (17.11.: auf 70 erweitert)', kl.length === 70, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
