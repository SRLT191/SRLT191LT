const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Lagerverben auf 30 (17.11.): 25 Verben hinten angehängt – je Umschrift, Übersetzung, Stufe, eigener Satz auf Wortstufe,
// Aspektpaare in MERGED_CARDS mit Bildungsart
const { chromium } = require('playwright');
const NEU = [['отгружать','отгрузить','versenden','C1'],['комплектовать','','kommissionieren','C1'],['пересчитывать','пересчитать','nachzählen','C1'],
  ['принимать','принять','annehmen','A1'],['отслеживать','отследить','verfolgen','A2'],['подвозить','подвезти','anliefern','B1'],
  ['перевозить','перевезти','transportieren','B2'],['размещать','разместить','unterbringen','B2'],['вывозить','вывезти','abtransportieren','B2'],
  ['оформлять','оформить','abfertigen','B2'],['обрабатывать','обработать','bearbeiten','B2'],['перемещать','переместить','umlagern','B2'],
  ['закреплять','закрепить','befestigen','C1'],['складировать','','einlagern','C1'],['сортировать','','sortieren','C1'],['маркировать','','kennzeichnen','C1'],
  ['штабелировать','','stapeln','C1'],['распаковывать','распаковать','auspacken','C1'],['фасовать','расфасовать','abpacken','C1'],
  ['пломбировать','опломбировать','verplomben','C1'],['перегружать','перегрузить','umladen','C1'],['сверять','сверить','abgleichen','C1'],
  ['обматывать','обмотать','umwickeln','C1'],['поставлять','','zuliefern','C1'],['резервировать','зарезервировать','reservieren','C1']];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(NEU => {
    const out = { fehler: [] }; const kl = getAllWordsOfCat('Lagerverben'); const P = aspectPairs(); out.n = kl.length;
    NEU.forEach(([i, pf, de, lv], k) => { const name = pf ? i + ' / ' + pf : i, w = kl[5 + k], s = w && getWordSentence(w), t = pf ? [i, pf] : [i];
      if (!w || w.ru !== name) { out.fehler.push(name + ' fehlt oder nicht hinten'); return; }
      if (w.tr !== t.map(trLetters).join(' / ') || w.de.join('|') !== de) out.fehler.push(name + ' Form');
      if (wordLevel(w) !== lv) out.fehler.push(name + ' Stufe ' + wordLevel(w));
      if (!s || !s.ru.toLowerCase().includes(t[t.length - 1]) || !s.de.includes(de) || sentenceLevel(s.ru, t) !== lv) out.fehler.push(name + ' Satz');
      if (pf && (JSON.stringify(MERGED_CARDS[name]) !== JSON.stringify(t) || !P[i] || !P[i].bildung)) out.fehler.push(name + ' Paar');
    });
    return out;
  }, NEU);
  ok('Lagerverben 30', r.n === 30, String(r.n));
  ok('25 neue: Umschrift, Übersetzung, Stufe, Satz auf Wortstufe, Paar mit Bildungsart', r.fehler.length === 0, r.fehler.join(' | '));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
