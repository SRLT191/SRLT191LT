const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Medizin +15: 6 aus der A1-Liste (FIPI), грипп/медицина (A2), übrige nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'поликлиника': ['Poliklinik|Ärztehaus', 'A1', 'f'], 'кабинет': ['Sprechzimmer|Arbeitszimmer', 'A1', 'm'], 'запись': ['Anmeldung|Termin', 'A1', 'f'],
      'талон': ['Wartenummer', 'A1', 'm'], 'медкомиссия': ['Gesundheitsprüfung', 'A1', 'f'], 'полис': ['Versichertenkarte', 'A1', 'm'],
      'грипп': ['Grippe', 'A2', 'm'], 'медицина': ['Medizin', 'A2', 'f'], 'лечение': ['Behandlung|Heilung', 'B1', 'n'], 'рана': ['Wunde', 'B2', 'f'],
      'травма': ['Verletzung', 'B2', 'f'], 'осмотр': ['Untersuchung|Besichtigung', 'B2', 'm'], 'палата': ['Krankenzimmer', 'C1', 'f'],
      'шприц': ['Spritze|Injektionsspritze', 'C1', 'm'], 'синяк': ['blauer Fleck|Bluterguss', 'C1', 'm'] };
    const kl = getAllWordsOfCat('Medizin');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Medizin, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0]) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Medizin 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
