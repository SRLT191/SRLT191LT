const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Lagerlogistik +24: A1-Berufe (FIPI-Vormerkliste), dann Substantive nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'комплектовщик': ['Kommissionierer', 'A1', 'm'], 'укладчик': ['Packer', 'A1', 'm'], 'разнорабочий': ['Hilfsarbeiter', 'A1', 'm'], 'охрана': ['Wachdienst', 'B1', 'f'],
      'пропуск': ['Werksausweis', 'B2', 'm'], 'норма': ['Soll', 'B2', 'f'], 'хранение': ['Lagerung', 'B2', 'n'], 'брак': ['Ausschuss', 'C1', 'm'], 'приход': ['Wareneingang', 'C1', 'm'],
      'диспетчер': ['Disponent', 'C1', 'm'], 'бригада': ['Arbeitstrupp', 'C1', 'f'], 'плёнка': ['Folie', 'C1', 'f'], 'бригадир': ['Vorarbeiter', 'C1', 'm'], 'возврат': ['Rücksendung', 'C1', 'm'],
      'ячейка': ['Lagerfach', 'C1', 'f'], 'расход': ['Warenausgang', 'C1', 'm'], 'тележка': ['Rollwagen', 'C1', 'f'], 'конвейер': ['Förderband', 'C1', 'm'], 'этикетка': ['Etikett', 'C1', 'f'],
      'маркировка': ['Kennzeichnung', 'C1', 'f'], 'каска': ['Schutzhelm', 'C1', 'f'], 'спецодежда': ['Arbeitskleidung', 'C1', 'f'], 'фура': ['Sattelzug', 'C1', 'f'], 'рохля': ['Hubwagen', 'C1', 'f'] };
    const kl = getAllWordsOfCat('Lagerlogistik');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Lagerlogistik, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Lagerlogistik 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
