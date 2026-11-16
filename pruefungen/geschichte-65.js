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
      // 16.11.: verschobene Wörter auch in ihrer neuen Kategorie, zusammengelegte auf ihrer Paarkarte (Z = beide Wörter)
      const w = kl.find(x => x.ru === ru) || allVocabWords().find(x => x.ru === ru || (MERGED_CARDS[x.ru] || []).includes(ru)), s = w && getWordSentence(w), Z = w && MERGED_CARDS[w.ru];
      ok(ru + ': in Geschichte, Umschrift nach Regel, nur bestätigte Übersetzung', w && (w.tr === trLetters(ru) || (Z && String(w.tr).split(' / ').includes(trLetters(ru)))) && (w.de.join('|') === de || (Z && w.de.includes(de))), w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && (wordLevel(w) === lv || (Z && LEVELS.indexOf(wordLevel(w)) <= LEVELS.indexOf(lv))) && s
        && (Z || [ru]).some(t => s.ru.toLowerCase().includes(t.toLowerCase())) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Geschichte 63 (16.11.: Wörter verschoben/zusammengelegt)', kl.length === 63, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
