const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Kommunikationsverben +1, Wahrnehmung & Gefühle +2 (3.11.), neue Karten hinten angehängt;
// zehn vollendete Verben der A2-Liste auf den Karten ihrer unvollendeten Partner
const { chromium } = require('playwright');
const P = [['рассказывать', 'рассказать'], ['сообщать', 'сообщить'], ['поздравлять', 'поздравить'], ['просить', 'попросить'], ['советовать', 'посоветовать'],
  ['звать', 'позвать'], ['нравиться', 'понравиться'], ['слушать', 'послушать'], ['улыбаться', 'улыбнуться'], ['любить', 'полюбить']];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(P => {
    const kv = getAllWordsOfCat('Kommunikationsverben'), wg = getAllWordsOfCat('Wahrnehmung & Gefühle'), out = { fehler: [] };
    const neu = [[kv, 'передавать / передать', 'ausrichten|übergeben', 'A2'], [wg, 'беспокоиться', 'sich Sorgen machen', 'A2'], [wg, 'нервничать', 'nervös sein', 'B2']];
    neu.forEach(([kl, ru, de, lv]) => { const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      if (!w || w.de.join('|') !== de || wordLevel(w) !== lv || w.tr !== ru.split(' / ').map(trLetters).join(' / ')) out.fehler.push(ru + ' Karte');
      if (!s || sentenceLevel(s.ru, ru.split(' / ')) !== lv) out.fehler.push(ru + ' Satz ' + (s && s.ru)); });
    out.hinten = [kv[kv.length - 1].ru, wg[wg.length - 2].ru, wg[wg.length - 1].ru];
    P.forEach(([i, pf]) => { const n = i + ' / ' + pf, w = allVocabWords().find(x => x.ru === n);
      if (!w || !MERGED_CARDS[n] || !w.ruAlt.includes(pf) || w.tr !== trLetters(i) + ' / ' + trLetters(pf)) out.fehler.push(n); });
    out.n = [kv.length, wg.length];
    return out;
  }, P);
  ok('neue Karten mit Übersetzung, Stufe und Beispielsatz', r.fehler.filter(x => !x.includes(' / ') || /Karte|Satz/.test(x)).length === 0, r.fehler.join(' | '));
  ok('zehn vollendete Verben auf ihren Karten (MERGED_CARDS, ruAlt, Umschrift)', r.fehler.length === 0, r.fehler.join(' | '));
  ok('neue Karten hinten angehängt', r.hinten.join() === 'передавать / передать,беспокоиться,нервничать', r.hinten.join());
  ok('Kommunikationsverben 30, Wahrnehmung & Gefühle 30', r.n.join() === '30,30', r.n.join());
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
