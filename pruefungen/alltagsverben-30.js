const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Alltagsverben +3 (4.11.), neue Karten hinten angehängt;
// fünf vollendete Verben der A2-Liste auf den Karten ihrer unvollendeten Partner
const { chromium } = require('playwright');
const P = [['терять', 'потерять'], ['находить', 'найти'], ['собирать', 'собрать'], ['изменять', 'изменить'], ['садиться', 'сесть']];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(P => {
    const av = getAllWordsOfCat('Alltagsverben'), out = { fehler: [] };
    const neu = [[av, 'курить', 'rauchen', 'A2'], [av, 'висеть', 'hängen', 'A2'], [av, 'бить', 'schlagen', 'A2']];
    neu.forEach(([kl, ru, de, lv]) => { const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      if (!w || w.de.join('|') !== de || wordLevel(w) !== lv || w.tr !== ru.split(' / ').map(trLetters).join(' / ')) out.fehler.push(ru + ' Karte');
      if (!s || sentenceLevel(s.ru, ru.split(' / ')) !== lv) out.fehler.push(ru + ' Satz ' + (s && s.ru)); });
    out.hinten = av.slice(-3).map(w => w.ru);
    P.forEach(([i, pf]) => { const n = i + ' / ' + pf, w = allVocabWords().find(x => x.ru === n);
      if (!w || !MERGED_CARDS[n] || !w.ruAlt.includes(pf) || w.tr !== trLetters(i) + ' / ' + trLetters(pf)) out.fehler.push(n); });
    out.n = [av.length];
    return out;
  }, P);
  ok('neue Karten mit Übersetzung, Stufe und Beispielsatz', r.fehler.filter(x => !x.includes(' / ') || /Karte|Satz/.test(x)).length === 0, r.fehler.join(' | '));
  ok('fünf vollendete Verben auf ihren Karten (MERGED_CARDS, ruAlt, Umschrift)', r.fehler.length === 0, r.fehler.join(' | '));
  ok('neue Karten hinten angehängt', r.hinten.join() === 'курить,висеть,бить', r.hinten.join());
  ok('Alltagsverben 30', r.n.join() === '30', r.n.join());
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
