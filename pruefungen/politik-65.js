const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Politik +16: 3 aus der A1-Liste (FIPI), 3 aus der A2-Liste, 10 nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'посольство': ['Botschaft', 'A1', 'n'], 'патент': ['Patent|Arbeitserlaubnis', 'A1', 'm'], 'анкета': ['Fragebogen|Formular', 'A1', 'f'],
      'политика': ['Politik', 'A2', 'f'], 'родина': ['Heimat', 'A2', 'f'], 'администрация': ['Verwaltung|Behörde', 'A2', 'f'], 'мэр': ['Bürgermeister', 'B1', 'm'],
      'соглашение': ['Abkommen|Vereinbarung', 'B1', 'n'], 'премьер-министр': ['Premierminister', 'B2', 'm'], 'министерство': ['Ministerium', 'B2', 'n'],
      'флаг': ['Flagge|Fahne', 'B2', 'm'], 'губернатор': ['Gouverneur', 'B2', 'm'], 'политик': ['Politiker', 'C1', 'm'], 'гражданство': ['Staatsbürgerschaft', 'C1', 'n'],
      'демонстрация': ['Demonstration', 'C1', 'f'], 'консульство': ['Konsulat', 'C1', 'n'] };
    const kl = getAllWordsOfCat('Politik');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      // 16.11.: verschobene Wörter auch in ihrer neuen Kategorie, zusammengelegte auf ihrer Paarkarte (Z = beide Wörter)
      const w = kl.find(x => x.ru === ru) || allVocabWords().find(x => x.ru === ru || (MERGED_CARDS[x.ru] || []).includes(ru)), s = w && getWordSentence(w), Z = w && MERGED_CARDS[w.ru];
      ok(ru + ': in Politik, Umschrift nach Regel, nur bestätigte Übersetzung', w && (w.tr === trLetters(ru) || (Z && String(w.tr).split(' / ').includes(trLetters(ru)))) && (w.de.join('|') === de || (Z && w.de.includes(de))), w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && (wordLevel(w) === lv || (Z && LEVELS.indexOf(wordLevel(w)) <= LEVELS.indexOf(lv))) && s
        && (Z || [ru]).some(t => s.ru.toLowerCase().includes(t.toLowerCase())) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Politik 65 (16.11.: Wörter verschoben/zusammengelegt)', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
