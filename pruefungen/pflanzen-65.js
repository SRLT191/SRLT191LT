const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Pflanzen +16: A2-Wort ёлка, dann Substantive nach Häufigkeit (keine A1-Wörter mehr)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'ёлка': ['Tannenbaum', 'A2', 'f'], 'мак': ['Mohn', 'B1', 'm'], 'шишка': ['Zapfen', 'B2', 'f'], 'букет': ['Blumenstrauß', 'C1', 'm'],
      'жасмин': ['Jasmin', 'C1', 'm'], 'растение': ['Pflanze', 'A2', 'n'], 'листок': ['Blättchen', 'C1', 'm'], 'плесень': ['Schimmel', 'C1', 'f'], 'газон': ['Rasen', 'C1', 'm'],
      'сакура': ['Kirschblüte', 'C1', 'f'], 'хлопок': ['Baumwolle', 'C1', 'm'], 'венок': ['Kranz', 'C1', 'm'], 'липа': ['Linde', 'C1', 'f'], 'лилия': ['Lilie', 'C1', 'f'],
      'магнолия': ['Magnolie', 'C1', 'f'], 'вишня': ['Kirsche', 'C1', 'f'] };
    const kl = getAllWordsOfCat('Pflanzen');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      // 16.11.: verschobene Wörter auch in ihrer neuen Kategorie, zusammengelegte auf ihrer Paarkarte (Z = beide Wörter)
      const w = kl.find(x => x.ru === ru) || allVocabWords().find(x => x.ru === ru || (MERGED_CARDS[x.ru] || []).includes(ru)), s = w && getWordSentence(w), Z = w && MERGED_CARDS[w.ru];
      ok(ru + ': in Pflanzen, Umschrift nach Regel, nur bestätigte Übersetzung', w && (w.tr === trLetters(ru) || (Z && String(w.tr).split(' / ').includes(trLetters(ru)))) && (w.de.join('|') === de || (Z && w.de.includes(de))), w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && (wordLevel(w) === lv || (Z && LEVELS.indexOf(wordLevel(w)) <= LEVELS.indexOf(lv))) && s
        && (Z || [ru]).some(t => s.ru.toLowerCase().includes(t.toLowerCase())) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Pflanzen 64 (16.11.: Wörter verschoben/zusammengelegt)', kl.length === 64, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
