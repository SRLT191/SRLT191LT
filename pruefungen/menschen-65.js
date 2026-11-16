const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Menschen +15: работник, работодатель (A1), 11 aus der A2-Liste, личность, победитель nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'работник': ['Arbeitnehmer|Mitarbeiter', 'A1', 'm'], 'работодатель': ['Arbeitgeber', 'A1', 'm'], 'пенсионерка': ['Rentnerin', 'A2', 'f'],
      'студентка': ['Studentin', 'A2', 'f'], 'аспирантка': ['Doktorandin', 'A2', 'f'], 'школьник': ['Schüler|Schulkind', 'A2', 'm'], 'школьница': ['Schülerin|Schulmädchen', 'A2', 'f'],
      'ученица': ['Schülerin|Auszubildende', 'A2', 'f'], 'иностранка': ['Ausländerin', 'A2', 'f'], 'москвич': ['Moskauer', 'A2', 'm'], 'москвичка': ['Moskauerin', 'A2', 'f'],
      'читатель': ['Leser', 'A2', 'm'], 'оптимист': ['Optimist', 'A2', 'm'], 'личность': ['Persönlichkeit', 'B1', 'f'], 'победитель': ['Sieger|Gewinner', 'B2', 'm'] };
    const kl = getAllWordsOfCat('Menschen');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const UMZUG = { 'студентка': 'Bildung', 'ученица': 'Bildung' }; // Gesamtprüfung 16.11.: in eine passendere Kategorie verschoben
      const w = kl.find(x => x.ru === ru) || (UMZUG[ru] && getAllWordsOfCat(UMZUG[ru]).find(x => x.ru === ru)), s = w && getWordSentence(w);
      ok(ru + ': in Menschen, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Menschen 64 (16.11.: Wörter verschoben)', kl.length === 64, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
