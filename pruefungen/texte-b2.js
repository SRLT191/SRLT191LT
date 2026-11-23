// B2-Texte (23.11.): je fünf für Lesen, Übersetzen und Hören, je 50 Sätze,
// jeder Satz nach sentenceLevel höchstens B2, jedes Wort führt über readKarte (READ_FORMEN ergänzt) zu einer Karte bis B2;
// ausgenommen Eigennamen
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
    const NAMEN = ['марина', 'марине', 'марину', 'марины', 'ольга', 'ольги', 'ольгу', 'ольге', 'антон', 'антона', 'антоном', 'антону', 'мари', 'олег', 'олега', 'олегу', 'катя', 'кате', 'кати', 'катю', 'анна', 'анны', 'анне', 'анну', 'лена', 'лены', 'лене', 'леной', 'игорь', 'игоря', 'игорю', 'игорем', 'валя', 'вали', 'ира', 'иры', 'ире', 'ирой', 'иру', 'пётр', 'петр', 'наталья', 'большая', 'медведица', 'полярная', 'юпитер', 'галилей', 'финляндией', 'финляндии', 'швецией', 'швецию', 'швеции', 'польши', 'эфиопии', 'данию', 'франции', 'францию', 'франция'];
    const b1 = TEXTE.filter(t => t.lvl === 'B2');
    const L = l => LEVELS.indexOf(l);
    const ohne = [], hoch = [], satz = [];
    b1.forEach(t => t.saetze.forEach(s => {
      if (L(sentenceLevel(s.ru)) > L('B2')) satz.push(t.id + ': ' + s.ru);
      (s.ru.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g) || []).forEach(f => {
        if (NAMEN.includes(f.toLowerCase())) return;
        const w = readKarte(f);
        if (!w) ohne.push(t.id + ': ' + f); else if (L(wordLevel(w)) > L('B2')) hoch.push(t.id + ': ' + f + ' → ' + w.ru + ' ' + wordLevel(w));
      });
    }));
    return { arten: ['ru', 'de', 'hoer'].map(a => b1.filter(t => (t.art || 'ru') === a).length), laengen: b1.map(t => t.saetze.length), ids: new Set(TEXTE.map(t => t.id)).size === TEXTE.length, ohne, hoch, satz,
      gegen: [readKarte('однажды'), readKarte('давно'), readKarte('деревне')].map(w => w ? w.ru + ' ' + wordLevel(w) : null),
      absaetze: b1.every(t => t.saetze[0].p && t.saetze.filter(s => s.p).length >= 6), deutsch: b1.every(t => t.saetze.every(s => s.de && s.ru)) };
  });
  ok('fünf B2-Texte je Übungsart', r.arten.join() === '5,5,5', r.arten);
  ok('B2-Texte haben je 50 Sätze', r.laengen.every(x => x === 50), r.laengen);
  ok('Kennungen eindeutig', r.ids);
  ok('jeder Satz mit deutscher Übersetzung, mindestens sechs Absätze', r.deutsch && r.absaetze);
  ok('kein Satz über B2 (sentenceLevel)', !r.satz.length, r.satz);
  ok('jedes Wort hat eine Karte (readKarte)', !r.ohne.length, r.ohne);
  ok('keine Karte über B2', !r.hoch.length, r.hoch);
  ok('Gegenprobe: однажды und давно ohne Karte, деревне → деревня B2', r.gegen[0] === null && r.gegen[1] === null && r.gegen[2] === 'деревня B2', r.gegen);
  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
