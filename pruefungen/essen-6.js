const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Essen +6 (A1 nach FIPI, Vormerkliste Gruppe 1): пирожок, булочка, пицца, борщ, щи, шаурма
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'пирожок': ['piroschok', 'Piroschka|Teigtasche'], 'булочка': ['bulotschka', 'Brötchen'], 'пицца': ['pizza', 'Pizza'],
      'борщ': ['borschtsch', 'Borschtsch'], 'щи': ['schtschi', 'Kohlsuppe'], 'шаурма': ['schaurma', 'Schawarma|Döner'] };
    const essen = getAllWordsOfCat('Essen');
    Object.entries(NEU).forEach(([ru, [tr, de]]) => {
      const w = essen.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Essen, Umschrift, nur bestätigte Übersetzung', w && w.tr === tr && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe A1, Beispielsatz A1 mit Wort und Übersetzung', w && wordLevel(w) === 'A1' && s && sentenceLevel(s.ru) === 'A1'
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0]), s ? s.ru + ' / ' + s.de : 'kein Satz');
    });
    ok('пиццу nicht mehr als A2-Satzform', SENT_FORM_LEVEL.get('пиццу') !== 'A2');
    ok('щи nicht als „nur Plural“ abgefragt, пирожок/борщ männlich, булочка/пицца/шаурма weiblich',
      genderOf('щи') === null && ['пирожок', 'борщ'].every(r => genderOf(r).g === 'm') && ['булочка', 'пицца', 'шаурма'].every(r => genderOf(r).g === 'f'));
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Essen 70 (17.11.: auf 70 erweitert)', essen.length === 70, String(essen.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
