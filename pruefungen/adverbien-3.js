// Adverbien +3 (27.11.): Grad & Menge +довольно (A2, Häufigkeit OpenSubtitles), Einschätzung & Verbindung +может быть (A1, Häufigkeit, Grundwortschatz)
// und +по-моему (A2, Lexikalisches Minimum) hinten angehängt, je ein eigener Satz mit Wort und Kartenübersetzung, nicht schwerer als das Wort.
const { chromium } = require('playwright');
const path = require('path');
let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 600) : '')); } };
const NEU = { 'Grad & Menge': [['довольно', 'ziemlich', 'A2']], 'Einschätzung & Verbindung': [['может быть', 'vielleicht', 'A1'], ['по-моему', 'meiner Meinung nach', 'A2']] };
const ANZ = { 'Grad & Menge': 15, 'Einschätzung & Verbindung': 10 };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fehlerJs = []; page.on('pageerror', e => fehlerJs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(300);
  const r = await page.evaluate(NEU => {
    const alle = Object.keys(vocab).flatMap(c => getAllWordsOfCat(c).map(w => w.ru));
    const out = {};
    for (const [cat, liste] of Object.entries(NEU)) {
      const ws = getAllWordsOfCat(cat);
      out[cat] = { anzahl: ws.length, hinten: ws.slice(-liste.length).map(w => w.ru), worte: liste.map(([ru]) => {
        const w = ws.find(x => x.ru === ru); const satz = w ? getWordSentence(w) : null;
        return w ? { ru, de: w.de.join('|'), tr: w.tr, regel: trLetters(ru), lvl: wordLevel(w), doppelt: alle.filter(x => x === ru).length,
          satz, satzLvl: satz ? sentenceLevel(satz.ru, [ru]) : null } : { ru, fehlt: true };
      }) };
    }
    return out;
  }, NEU);
  const L = ['A1', 'A2', 'B1', 'B2', 'C1'];
  for (const [cat, liste] of Object.entries(NEU)) {
    const c = r[cat];
    ok(cat + ': ' + ANZ[cat] + ' Wörter, die neuen hinten in bestätigter Reihenfolge', c.anzahl === ANZ[cat] && c.hinten.join('|') === liste.map(x => x[0]).join('|'), c);
    const falsch = c.worte.filter((w, i) => w.fehlt || w.de !== liste[i][1] || w.tr !== w.regel || w.lvl !== liste[i][2] || w.doppelt !== 1);
    ok(cat + ': Übersetzung, Umschrift nach Regel, Stufe, nur einmal im Wortschatz', !falsch.length, falsch);
    const ohneSatz = c.worte.filter((w, i) => !w.satz || !w.satz.ru.toLowerCase().includes(w.ru) || L.indexOf(w.satzLvl) > L.indexOf(liste[i][2])
      || !w.satz.de.toLowerCase().includes(liste[i][1].toLowerCase()));
    ok(cat + ': je ein Satz mit Wort und Übersetzung, nicht schwerer als das Wort', !ohneSatz.length, ohneSatz);
  }
  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
