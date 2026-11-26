// Umgangssprache +10 (26.11.): ладно (A1), ага, чувак, мужик, круто, окей, ерунда, супер, угу, пацан (A2, Häufigkeit OpenSubtitles,
// umgangssprachlich höchstens A2) hinten angehängt, je ein eigener Satz mit Wort und Kartenübersetzung, nicht schwerer als das Wort.
const { chromium } = require('playwright');
const path = require('path');
let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 600) : '')); } };
const NEU = [['ладно', 'okay|na gut', 'A1'], ['ага', 'ja (ugs.)|aha', 'A2'], ['чувак', 'Typ|Alter', 'A2'], ['мужик', 'Kerl', 'A2'], ['круто', 'cool|krass', 'A2'],
  ['окей', 'okay', 'A2'], ['ерунда', 'Unsinn|Quatsch', 'A2'], ['супер', 'super', 'A2'], ['угу', 'mhm', 'A2'], ['пацан', 'Junge (ugs.)|Kumpel', 'A2']];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fehlerJs = []; page.on('pageerror', e => fehlerJs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(300);
  const r = await page.evaluate(NEU => {
    const ws = getAllWordsOfCat('Umgangssprache'), L = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const alle = Object.keys(vocab).flatMap(c => getAllWordsOfCat(c).map(w => w.ru));
    return { anzahl: ws.length, hinten: ws.slice(-10).map(w => w.ru), worte: NEU.map(([ru]) => {
      const w = ws.find(x => x.ru === ru); const satz = w ? getWordSentence(w) : null;
      return w ? { ru, de: w.de.join('|'), tr: w.tr, regel: trLetters(ru), lvl: wordLevel(w), doppelt: alle.filter(x => x === ru).length,
        satz, satzLvl: satz ? sentenceLevel(satz.ru, [ru]) : null } : { ru, fehlt: true };
    }) };
  }, NEU);
  ok('Umgangssprache hat 20 Wörter', r.anzahl === 20, r.anzahl);
  ok('die 10 neuen stehen hinten in der bestätigten Reihenfolge', r.hinten.join(' ') === NEU.map(x => x[0]).join(' '), r.hinten);
  const falsch = r.worte.filter((w, i) => w.fehlt || w.de !== NEU[i][1] || w.tr !== w.regel || w.lvl !== NEU[i][2] || w.doppelt !== 1);
  ok('Übersetzung, Umschrift nach Regel, Stufe, nur einmal im Wortschatz', !falsch.length, falsch);
  const L = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const ohneSatz = r.worte.filter((w, i) => !w.satz || !w.satz.ru.toLowerCase().replace(/ё/g, 'е').includes(w.ru.replace(/ё/g, 'е')) || L.indexOf(w.satzLvl) > L.indexOf(NEU[i][2])
    || !NEU[i][1].split('|').some(d => w.satz.de.toLowerCase().includes(d.replace(/ \(.*\)/, '').toLowerCase())));
  ok('je ein Satz mit Wort und Übersetzung, nicht schwerer als das Wort', !ohneSatz.length, ohneSatz);
  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
