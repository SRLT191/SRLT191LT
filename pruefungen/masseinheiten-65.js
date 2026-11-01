const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Maßeinheiten +17: A2-Wörter (Lexikalisches Minimum), dann nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'плюс': ['Plus', 'A2', 'm'], 'минус': ['Minus', 'A2', 'm'], 'полтора': ['anderthalb', 'A2', '-'], 'кусок': ['Stück', 'A2', 'm'],
      'угол': ['Winkel|Ecke', 'B1', 'm'], 'сумма': ['Summe', 'B2', 'f'], 'мощность': ['Leistung', 'B2', 'f'], 'предел': ['Grenze', 'B2', 'm'],
      'доза': ['Dosis', 'C1', 'f'], 'десяток': ['zehn Stück', 'C1', '-'], 'дюжина': ['Dutzend', 'C1', 'f'], 'высота': ['Höhe', 'C1', 'f'],
      'длина': ['Länge', 'C1', 'f'], 'ширина': ['Breite', 'C1', 'f'], 'мера': ['Maß', 'C1', 'f'], 'радиус': ['Radius', 'C1', 'm'], 'точность': ['Genauigkeit', 'C1', 'f'] };
    const kl = getAllWordsOfCat('Maßeinheiten');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Maßeinheiten, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv) && sentenceLevel(s.ru, [ru]) === lv, s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g === '-') ok(ru + ': kein Substantiv mit großgeschriebener Übersetzung – nicht im Werkzeug Geschlecht', !genderPool().some(x => x.ru === ru));
      else ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g && genderPool().some(x => x.ru === ru), JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Maßeinheiten 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
