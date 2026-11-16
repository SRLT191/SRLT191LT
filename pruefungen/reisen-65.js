const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Reisen +24: A1-Wörter (FIPI-Vormerkliste), A2-Wörter, dann Substantive nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'фотография': ['Foto', 'A1', 'f'], 'сим-карта': ['SIM-Karte', 'A1', 'f'], 'вай-фай': ['WLAN', 'A1', 'm'], 'зарядка': ['Ladegerät', 'A1', 'f'], 'киоск': ['Kiosk', 'A1', 'm'],
      'приезд': ['Ankunft', 'A2', 'm'], 'экскурсовод': ['Reiseleiter', 'A2', 'm'], 'фонтан': ['Springbrunnen', 'A2', 'm'], 'галерея': ['Galerie', 'A2', 'f'], 'проспект': ['Prachtstraße', 'A2', 'm'],
      'обмен': ['Umtausch', 'B1', 'm'], 'поход': ['Wanderung', 'B2', 'm'], 'опоздание': ['Verspätung', 'B2', 'n'], 'задержка': ['Verzögerung', 'C1', 'f'], 'вылет': ['Abflug', 'C1', 'm'],
      'прокат': ['Verleih', 'C1', 'm'], 'курорт': ['Kurort', 'C1', 'm'], 'купе': ['Abteil', 'C1', 'n'], 'отъезд': ['Abreise', 'C1', 'm'], 'регистрация': ['Check-in', 'C1', 'f'],
      'бронь': ['Reservierung', 'C1', 'f'], 'набережная': ['Uferpromenade', 'C1', 'f'], 'туризм': ['Tourismus', 'C1', 'm'], 'туристка': ['Touristin', 'C1', 'f'] };
    const kl = getAllWordsOfCat('Reisen');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      // 16.11.: verschobene Wörter auch in ihrer neuen Kategorie, zusammengelegte auf ihrer Paarkarte (Z = beide Wörter)
      const w = kl.find(x => x.ru === ru) || allVocabWords().find(x => x.ru === ru || (MERGED_CARDS[x.ru] || []).includes(ru)), s = w && getWordSentence(w), Z = w && MERGED_CARDS[w.ru];
      ok(ru + ': in Reisen, Umschrift nach Regel, nur bestätigte Übersetzung', w && (w.tr === trLetters(ru) || (Z && String(w.tr).split(' / ').includes(trLetters(ru)))) && (w.de.join('|') === de || (Z && w.de.includes(de))), w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && (wordLevel(w) === lv || (Z && LEVELS.indexOf(wordLevel(w)) <= LEVELS.indexOf(lv))) && s
        && (Z || [ru]).some(t => s.ru.toLowerCase().includes(t.toLowerCase())) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Reisen 61 (16.11.: Wörter verschoben/zusammengelegt)', kl.length === 61, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
