const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Familie +15 Substantive: дети (A1), 10 aus der A2-Liste, 4 Ergänzungen zu vorhandenen Wörtern
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = {
      'дети': ['Kinder', 'A1'], 'имя': ['Vorname|Name', 'A2'], 'отчество': ['Vatersname', 'A2'], 'фамилия': ['Nachname', 'A2'],
      'день рождения': ['Geburtstag', 'A2'], 'рождение': ['Geburt', 'A2'], 'детство': ['Kindheit', 'A2'], 'юность': ['Jugend', 'A2'],
      'молодость': ['Jugend|junge Jahre', 'A2'], 'старость': ['Alter (Lebensabschnitt)', 'A2'], 'соседка': ['Nachbarin', 'A2'],
      'родственница': ['Verwandte', 'B1'], 'свёкор': ['Schwiegervater|Vater des Mannes', 'B2'], 'мачеха': ['Stiefmutter', 'B2'], 'отчим': ['Stiefvater', 'B2'] };
    const fam = getAllWordsOfCat('Familie');
    Object.entries(NEU).forEach(([ru, [de, lv]]) => {
      const UMZUG = { 'соседка': 'Wohnen' }; // Gesamtprüfung 16.11.: in eine passendere Kategorie verschoben
      const w = fam.find(x => x.ru === ru) || (UMZUG[ru] && getAllWordsOfCat(UMZUG[ru]).find(x => x.ru === ru)), s = w && getWordSentence(w);
      ok(ru + ': in Familie, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
    });
    ok('nur Substantive mit Geschlecht im Werkzeug; дети und день рождения nicht abgefragt',
      genderOf('дети') === null && genderOf('день рождения') === null && genderOf('имя').g === 'n' && genderOf('свёкор').g === 'm' && genderOf('старость').g === 'f');
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Familie 64 (16.11.: Wörter verschoben)', fam.length === 64, String(fam.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
