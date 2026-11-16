const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Büro +20: A1-Wörter (FIPI-Vormerkliste), A2-Wörter, dann Substantive nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'работа': ['Arbeit', 'A1', 'f'], 'профессия': ['Beruf', 'A1', 'f'], 'специальность': ['Fachrichtung', 'A1', 'f'], 'смена': ['Schicht', 'A1', 'f'],
      'должность': ['Stelle', 'A1', 'f'], 'секретарь': ['Sekretär', 'A2', 'm'], 'шеф': ['Chef', 'A2', 'm'], 'контракт': ['Vertrag', 'B1', 'm'], 'чек': ['Kassenbon', 'B1', 'm'],
      'партнёр': ['Partner', 'B1', 'm'], 'карьера': ['Karriere', 'B2', 'f'], 'повышение': ['Beförderung', 'B2', 'n'], 'собеседование': ['Vorstellungsgespräch', 'B2', 'n'],
      'резюме': ['Lebenslauf', 'B2', 'n'], 'кадры': ['Personal', 'B2', 'pl'], 'оплата': ['Bezahlung', 'C1', 'f'], 'увольнение': ['Kündigung', 'C1', 'n'],
      'вакансия': ['offene Stelle', 'C1', 'f'], 'стажёр': ['Praktikant', 'C1', 'm'], 'премия': ['Prämie', 'C1', 'f'] };
    const kl = getAllWordsOfCat('Büro');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const UMZUG = { 'чек': 'Ökonomie' }; // Gesamtprüfung 16.11.: in eine passendere Kategorie verschoben
      const w = kl.find(x => x.ru === ru) || (UMZUG[ru] && getAllWordsOfCat(UMZUG[ru]).find(x => x.ru === ru)), s = w && getWordSentence(w);
      ok(ru + ': in Büro, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Büro 64 (16.11.: Wörter verschoben)', kl.length === 64, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
