// Länder (23.11.): Израиль ersetzt durch Азербайджан (hinten angehängt, B1, eigener Satz)
const { chromium } = require('playwright');
const path = require('path');
let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); } };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fehlerJs = []; page.on('pageerror', e => fehlerJs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const kl = getAllWordsOfCat('Länder'), az = kl.find(w => w.ru === 'Азербайджан'), satz = az && getWordSentence(az);
    return { israel: allVocabWords().some(w => /Израил/.test(w.ru)), letzte: kl.length ? kl[kl.length - 1].ru : null, anzahl: kl.length,
      az: az ? { de: az.de.join('|'), tr: az.tr, regel: trLetters('Азербайджан'), lvl: wordLevel(az) } : null,
      satz: satz ? { ru: satz.ru, de: satz.de, lvl: sentenceLevel(satz.ru) } : null, geschlecht: (genderOf('Азербайджан') || {}).g };
  });
  ok('Израиль ist nicht mehr im Wortschatz', !r.israel);
  ok('Азербайджан steht hinten in Länder', r.letzte === 'Азербайджан', r.letzte);
  ok('Азербайджан: nur „Aserbaidschan“, Umschrift nach Regel, Stufe B1', r.az && r.az.de === 'Aserbaidschan' && r.az.tr === r.az.regel && r.az.lvl === 'B1', r.az);
  ok('eigener Satz mit Wort und Übersetzung, nicht schwerer als B1', r.satz && /Азербайджан/.test(r.satz.ru) && /Aserbaidschan/.test(r.satz.de) && ['A1', 'A2', 'B1'].includes(r.satz.lvl), r.satz);
  ok('Geschlecht m (Werkzeug Geschlecht)', r.geschlecht === 'm', r.geschlecht);
  ok('Länder hat weiter 70 Wörter', r.anzahl === 70, r.anzahl);
  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
