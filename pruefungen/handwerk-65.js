const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Handwerk & Werkzeug +14: A1 (FIPI-Vormerkliste: стройка, Handwerksberufe), dann nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'стройка': ['Baustelle', 'A1', 'f'], 'монтажник': ['Monteur', 'A1', 'm'], 'лифтёр': ['Aufzugswart', 'A1', 'm'], 'бетонщик': ['Betonbauer', 'A1', 'm'],
      'электромонтёр': ['Elektroinstallateur', 'A1', 'm'], 'наладчик': ['Einrichter', 'A1', 'm'], 'мастер': ['Meister', 'B1', 'm'], 'стекло': ['Glas', 'B1', 'n'],
      'инструмент': ['Werkzeug', 'B2', 'm'], 'крюк': ['Haken', 'C1', 'm'], 'провод': ['Leitung', 'C1', 'm'], 'рычаг': ['Hebel', 'C1', 'm'],
      'кирпич': ['Ziegel', 'C1', 'm'], 'мастерская': ['Werkstatt', 'C1', 'f'] };
    const kl = getAllWordsOfCat('Handwerk & Werkzeug');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Handwerk & Werkzeug, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv) && sentenceLevel(s.ru, [ru]) === lv, s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g === '-') ok(ru + ': kein Substantiv mit großgeschriebener Übersetzung – nicht im Werkzeug Geschlecht', !genderPool().some(x => x.ru === ru));
      else ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g && genderPool().some(x => x.ru === ru), JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Handwerk & Werkzeug 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
