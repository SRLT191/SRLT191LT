// B1-Texte (23.11.): je fünf für Lesen, Übersetzen und Hören, 40–50 Sätze,
// jeder Satz nach sentenceLevel höchstens B1, jedes Wort führt über readKarte (READ_FORMEN ergänzt) zu einer Karte bis B1;
// ausgenommen Eigennamen und Teile fester Wendungen (вряд ли, до свидания)
const { chromium } = require('playwright');
const path = require('path');
let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 600) : '')); } };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fehlerJs = []; page.on('pageerror', e => fehlerJs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const NAMEN = ['москве', 'москвы', 'ольга', 'петровна', 'катя', 'кате', 'кати', 'катю', 'катей', 'игорь', 'игоря', 'анна', 'сибири', 'вряд', 'свидания'];
    const b1 = TEXTE.filter(t => t.lvl === 'B1');
    const L = l => LEVELS.indexOf(l);
    const ohne = [], hoch = [], satz = [];
    b1.forEach(t => t.saetze.forEach(s => {
      if (L(sentenceLevel(s.ru)) > L('B1')) satz.push(t.id + ': ' + s.ru);
      (s.ru.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g) || []).forEach(f => {
        if (NAMEN.includes(f.toLowerCase())) return;
        const w = readKarte(f);
        if (!w) ohne.push(t.id + ': ' + f); else if (L(wordLevel(w)) > L('B1')) hoch.push(t.id + ': ' + f + ' → ' + w.ru + ' ' + wordLevel(w));
      });
    }));
    return { arten: ['ru', 'de', 'hoer'].map(a => b1.filter(t => (t.art || 'ru') === a).length), laengen: b1.map(t => t.saetze.length), ids: new Set(TEXTE.map(t => t.id)).size === TEXTE.length, ohne, hoch, satz,
      absaetze: b1.every(t => t.saetze[0].p && t.saetze.filter(s => s.p).length >= 6), deutsch: b1.every(t => t.saetze.every(s => s.de && s.ru)) };
  });
  ok('fünf B1-Texte je Übungsart', r.arten.join() === '5,5,5', r.arten);
  ok('B1-Texte haben 40–50 Sätze', r.laengen.every(x => x >= 40 && x <= 50), r.laengen);
  ok('Kennungen eindeutig', r.ids);
  ok('jeder Satz mit deutscher Übersetzung, mindestens sechs Absätze', r.deutsch && r.absaetze);
  ok('kein Satz über B1 (sentenceLevel)', !r.satz.length, r.satz);
  ok('jedes Wort hat eine Karte (readKarte)', !r.ohne.length, r.ohne);
  ok('keine Karte über B1', !r.hoch.length, r.hoch);
  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
