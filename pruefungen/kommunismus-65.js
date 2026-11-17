const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Kommunismus +15: Grundbegriffe aus den marxistischen Klassikern (Kapital, Manifest, Kritik der politischen Ökonomie)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'товар': ['Ware', 'B1', 'm'], 'труд': ['Arbeit|Mühe', 'B2', 'm'], 'стоимость': ['Wert (Marx)|Kosten', 'B2', 'f'],
      'прибавочная стоимость': ['Mehrwert', 'C1', null], 'рабочая сила': ['Arbeitskraft', 'C1', null], 'средства производства': ['Produktionsmittel', 'C1', null],
      'производительные силы': ['Produktivkräfte', 'C1', null], 'производственные отношения': ['Produktionsverhältnisse', 'C1', null], 'базис': ['Basis (Marx)', 'C1', 'm'],
      'надстройка': ['Überbau', 'C1', 'f'], 'диалектика': ['Dialektik', 'C1', 'f'], 'отчуждение': ['Entfremdung', 'C1', 'n'], 'капитализм': ['Kapitalismus', 'C1', 'm'],
      'капиталист': ['Kapitalist', 'C1', 'm'], 'пролетарий': ['Proletarier', 'C1', 'm'] };
    const kl = getAllWordsOfCat('Kommunismus');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Kommunismus, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Wortgruppen nicht im Geschlechter-Werkzeug', ['прибавочная стоимость', 'рабочая сила', 'средства производства', 'производительные силы', 'производственные отношения'].every(r => genderOf(r) === null));
    ok('Kommunismus 70 (17.11.: auf 70 erweitert)', kl.length === 70, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
