const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Verbkategorie „Lagerverben“ (17.11.): fünf Verben, als letzte Themenkategorie der Verben, Symbol wie Lagerlogistik,
// seit 17.11. abends 30 Verben (lagerverben-30 prüft die 25 neuen); je Stufe, Umschrift, eigener Satz (nicht leichter als das Wort), Bildungsart bei den Aspektpaaren
const { chromium } = require('playwright');
const NEU = [['хранить', '', 'lagern', 'A2'], ['грузить', 'погрузить', 'laden', 'B2'], ['упаковывать', 'упаковать', 'verpacken', 'B2'],
  ['разгружать', 'разгрузить', 'entladen', 'C1'], ['взвешивать', 'взвесить', 'wiegen', 'C1']];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(NEU => {
    const out = { fehler: [] }; const kl = getAllWordsOfCat('Lagerverben'); const P = aspectPairs();
    out.n = kl.length;
    NEU.forEach(([i, pf, de, lv], k) => { const name = pf ? i + ' / ' + pf : i, w = kl[k], s = w && getWordSentence(w), t = pf ? [i, pf] : [i];
      if (!w || w.ru !== name) { out.fehler.push(name + ' fehlt'); return; }
      if (w.tr !== t.map(trLetters).join(' / ') || w.de.join('|') !== de) out.fehler.push(name + ' Form');
      if (wordLevel(w) !== lv) out.fehler.push(name + ' Stufe ' + wordLevel(w));
      if (!s || !s.ru.toLowerCase().includes(t[t.length - 1]) || !s.de.includes(de) || sentenceLevel(s.ru, t) !== lv) out.fehler.push(name + ' Satz');
      if (pf && (JSON.stringify(MERGED_CARDS[name]) !== JSON.stringify(t) || !P[i] || !P[i].bildung)) out.fehler.push(name + ' Paar');
    });
    const v = WORTART_GROUPS['Verben']; out.platz = v[v.length - 1] === 'Lagerverben' && VERB_CATEGORIES.includes('Lagerverben') && CAT_ICONS['Lagerverben'] === CAT_ICONS['Lagerlogistik'];
    return out;
  }, NEU);
  ok('Lagerverben mit 30 Verben (17.11.: +25 hinten angehängt)', r.n === 30, String(r.n));
  ok('Umschrift, Übersetzung, Stufe, Satz, Paar und Bildungsart', r.fehler.length === 0, r.fehler.join(' | '));
  ok('letzte Themenkategorie der Verben, in VERB_CATEGORIES, Symbol wie Lagerlogistik', r.platz);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
