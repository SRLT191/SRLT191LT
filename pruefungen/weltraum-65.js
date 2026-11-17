const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Weltraum & Astronomie +15: Substantive nach Häufigkeit (keine A1/A2-Wörter mehr)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'шаттл': ['Raumfähre', 'C1', 'm'], 'НЛО': ['UFO', 'C1', ''], 'фаза': ['Phase', 'C1', 'f'], 'инопланетянин': ['Außerirdischer', 'C1', 'm'],
      'астронавт': ['Astronaut', 'C1', 'm'], 'световой год': ['Lichtjahr', 'C1', ''], 'Плутон': ['Pluto', 'C1', 'm'], 'ось': ['Achse', 'C1', 'f'], 'астроном': ['Astronom', 'C1', 'm'],
      'звездопад': ['Sternschnuppenregen', 'C1', 'm'], 'зенит': ['Zenit', 'C1', 'm'], 'луноход': ['Mondfahrzeug', 'C1', 'm'], 'марсоход': ['Marsrover', 'C1', 'm'],
      'новолуние': ['Neumond', 'C1', 'n'], 'полумесяц': ['Halbmond', 'C1', 'm'] };
    const kl = getAllWordsOfCat('Weltraum & Astronomie');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Weltraum & Astronomie, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Weltraum & Astronomie 70 (17.11.: auf 70 erweitert)', kl.length === 70, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
