const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Geschichte +16: дата (A1), 3 aus der A2-Liste, 12 nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'дата': ['Datum', 'A1', 'f'], 'историк': ['Historiker', 'A2', 'm'], 'дворец': ['Palast', 'A2', 'm'], 'собор': ['Kathedrale|Dom', 'A2', 'm'],
      'прошлое': ['Vergangenheit', 'A2', 'n'], 'королева': ['Königin', 'A2', 'f'], 'принцесса': ['Prinzessin', 'A2', 'f'], 'принц': ['Prinz', 'A2', 'm'],
      'событие': ['Ereignis', 'B1', 'n'], 'граф': ['Graf', 'B2', 'm'], 'император': ['Kaiser', 'B2', 'm'], 'традиция': ['Tradition', 'B2', 'f'],
      'королевство': ['Königreich', 'B2', 'n'], 'рыцарь': ['Ritter', 'B2', 'm'], 'раб': ['Sklave', 'B2', 'm'], 'князь': ['Fürst', 'B2', 'm'] };
    const kl = getAllWordsOfCat('Geschichte');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const UMZUG = { 'дата': 'Zeit' }; // Gesamtprüfung 16.11.: in eine passendere Kategorie verschoben
      const w = kl.find(x => x.ru === ru) || (UMZUG[ru] && getAllWordsOfCat(UMZUG[ru]).find(x => x.ru === ru)), s = w && getWordSentence(w);
      ok(ru + ': in Geschichte, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Geschichte 64 (16.11.: Wörter verschoben)', kl.length === 64, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
