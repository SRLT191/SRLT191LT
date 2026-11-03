const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Wörter jeder Kategorie außer den Substantivkategorien stehen nach Stufe sortiert (A1 → C1).
// Neue Wörter kommen aber immer ans Ende ihrer Kategorie, auch mit niedrigerer Stufe (Regel 3.11.);
// neu sortiert wird später gesammelt. Unsortierte Kategorien meldet die Prüfung daher nur als Hinweis
// („-- “, kein Fehler) – Pflicht bleibt, dass jedes Wort eine Stufe hat.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const L = ['A1', 'A2', 'B1', 'B2', 'C1'], kats = Object.keys(vocab).filter(c => !SUBSTANTIVE_THEMEN.includes(c));
    const roh = c => (vocab[c].blocks || []).flat().concat(vocab[c].newBlock || []);
    const ohne = kats.filter(c => roh(c).some(w => L.indexOf(WORD_LEVEL.get(w.ru)) < 0));
    const falsch = kats.filter(c => { const s = roh(c).map(w => L.indexOf(WORD_LEVEL.get(w.ru))); return s.some((x, i) => i && x < s[i - 1]); });
    return { n: kats.length, falsch, ohne, zahlen: roh('Zahlen').slice(0, 3).map(w => w.ru).join(' '), nb: kats.filter(c => (vocab[c].newBlock || []).length).length };
  });
  ok('alle ' + r.n + ' Kategorien außer Substantiven: jedes Wort mit Stufe', r.n > 30 && r.ohne.length === 0, r.ohne.join(', '));
  if (r.falsch.length) R.push(['-- ', 'Hinweis: neue Wörter mit niedrigerer Stufe hinten angehängt, noch nicht neu sortiert', r.falsch.join(', ')]);
  else R.push(['OK ', 'alle Kategorien außer Substantiven nach Stufe sortiert', '']);
  ok('innerhalb der Stufe bleibt die Reihenfolge (Zahlen beginnen mit один два три)', r.zahlen === 'один два три', r.zahlen);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.filter(x => x[0] !== '-- ').length + ' bestanden');
  await b.close();
})();
