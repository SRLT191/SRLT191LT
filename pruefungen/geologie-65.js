const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Geologie +15: Substantive nach Häufigkeit (keine A1/A2-Wörter mehr)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'газ': ['Gas', 'B1', 'm'], 'нефть': ['Erdöl', 'C1', 'f'], 'пепел': ['Asche', 'C1', 'm'], 'алмаз': ['Diamant', 'C1', 'm'], 'металл': ['Metall', 'C1', 'm'],
      'слой': ['Schicht', 'C1', 'm'], 'толчок': ['Erdstoß', 'C1', 'm'], 'сталь': ['Stahl', 'C1', 'f'], 'трещина': ['Riss', 'C1', 'f'], 'уран': ['Uran', 'C1', 'm'],
      'лава': ['Lava', 'C1', 'f'], 'сера': ['Schwefel', 'C1', 'f'], 'рубин': ['Rubin', 'C1', 'm'], 'извержение': ['Vulkanausbruch', 'C1', 'n'], 'кратер': ['Krater', 'C1', 'm'] };
    const kl = getAllWordsOfCat('Geologie');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Geologie, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Geologie 70 (17.11.: auf 70 erweitert)', kl.length === 70, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
