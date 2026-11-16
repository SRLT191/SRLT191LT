const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Zeit +12: A1 (FIPI-Vormerkliste), A2 (Lexikalisches Minimum), dann Substantive nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'полгода': ['halbes Jahr', 'A1', null], 'число': ['Datum|Zahl', 'A2', 'n'], 'будущее': ['Zukunft', 'A2', 'n'], 'настоящее': ['Gegenwart', 'A2', 'n'],
      'полчаса': ['halbe Stunde', 'B1', null], 'выходной': ['freier Tag', 'B1', 'm'], 'мгновение': ['Augenblick', 'B2', 'n'], 'этап': ['Etappe', 'B2', 'm'],
      'годовщина': ['Jahrestag', 'B2', 'f'], 'канун': ['Vorabend', 'C1', 'm'], 'юбилей': ['Jubiläum', 'C1', 'm'], 'промежуток': ['Zeitspanne', 'C1', 'm'] };
    const kl = getAllWordsOfCat('Zeit');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      // 16.11.: verschobene Wörter auch in ihrer neuen Kategorie, zusammengelegte auf ihrer Paarkarte (Z = beide Wörter)
      const w = kl.find(x => x.ru === ru) || allVocabWords().find(x => x.ru === ru || (MERGED_CARDS[x.ru] || []).includes(ru)), s = w && getWordSentence(w), Z = w && MERGED_CARDS[w.ru];
      ok(ru + ': in Zeit, Umschrift nach Regel, nur bestätigte Übersetzung', w && (w.tr === trLetters(ru) || (Z && String(w.tr).split(' / ').includes(trLetters(ru)))) && (w.de.join('|') === de || (Z && w.de.includes(de))), w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && (wordLevel(w) === lv || (Z && LEVELS.indexOf(wordLevel(w)) <= LEVELS.indexOf(lv))) && s
        && (Z || [ru]).some(t => s.ru.toLowerCase().includes(t.toLowerCase())) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv) && (Z || sentenceLevel(s.ru, [ru]) === lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      ok(ru + ': Geschlecht ' + (g || 'nicht abgefragt (pol-)'), g ? (genderOf(ru) || {}).g === g && genderPool().some(x => x.ru === ru) : genderOf(ru) === null, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Zeit 65 (16.11.: Wörter verschoben/zusammengelegt)', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
