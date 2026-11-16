const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Ökonomie +13: 8 aus der A1-Liste (FIPI), 5 aus der A2-Liste
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'скидка': ['Rabatt', 'A1', 'f'], 'касса': ['Kasse', 'A1', 'f'], 'банкомат': ['Geldautomat', 'A1', 'm'], 'счёт': ['Rechnung|Konto', 'A1', 'm'],
      'пин-код': ['PIN', 'A1', 'm'], 'аванс': ['Vorschuss', 'A1', 'm'], 'фирма': ['Firma', 'A1', 'f'], 'компания': ['Unternehmen|Gesellschaft (Firma)', 'A1', 'f'],
      'рубль': ['Rubel', 'A2', 'm'], 'копейка': ['Kopeke', 'A2', 'f'], 'пенсия': ['Rente', 'A2', 'f'], 'бизнесмен': ['Geschäftsmann', 'A2', 'm'],
      'экономист': ['Ökonom|Wirtschaftswissenschaftler', 'A2', 'm'] };
    const kl = getAllWordsOfCat('Ökonomie');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      // 16.11.: verschobene Wörter auch in ihrer neuen Kategorie, zusammengelegte auf ihrer Paarkarte (Z = beide Wörter)
      const w = kl.find(x => x.ru === ru) || allVocabWords().find(x => x.ru === ru || (MERGED_CARDS[x.ru] || []).includes(ru)), s = w && getWordSentence(w), Z = w && MERGED_CARDS[w.ru];
      ok(ru + ': in Ökonomie, Umschrift nach Regel, nur bestätigte Übersetzung', w && (w.tr === trLetters(ru) || (Z && String(w.tr).split(' / ').includes(trLetters(ru)))) && (w.de.join('|') === de || (Z && w.de.includes(de))), w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && (wordLevel(w) === lv || (Z && LEVELS.indexOf(wordLevel(w)) <= LEVELS.indexOf(lv))) && s
        && (Z || [ru]).some(t => s.ru.toLowerCase().includes(t.toLowerCase())) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Ökonomie 67 (16.11.: Wörter verschoben/zusammengelegt)', kl.length === 67, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
