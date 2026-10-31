const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Länder +15: Ländernamen und Erdteile nach Häufigkeit (keine A1/A2-Wörter mehr)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'Америка': ['Amerika', 'B1', ''], 'Англия': ['England', 'B2', ''], 'Сирия': ['Syrien', 'C1', ''], 'Колумбия': ['Kolumbien', 'C1', ''], 'Ирак': ['Irak', 'C1', ''],
      'Европа': ['Europa', 'C1', ''], 'Африка': ['Afrika', 'C1', ''], 'Иран': ['Iran', 'C1', ''], 'Куба': ['Kuba', 'C1', ''], 'Азия': ['Asien', 'C1', ''], 'Венгрия': ['Ungarn', 'C1', ''],
      'Болгария': ['Bulgarien', 'C1', ''], 'Хорватия': ['Kroatien', 'C1', ''], 'Румыния': ['Rumänien', 'C1', ''], 'Сербия': ['Serbien', 'C1', ''] };
    const kl = getAllWordsOfCat('Länder');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Länder, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Länder 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
