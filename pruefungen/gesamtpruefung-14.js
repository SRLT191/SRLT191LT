const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Gesamtprüfung 16.11. – Texte: Korrekturen Satz für Satz, Stockwerke auf der deutschen Seite umgerechnet
// (russ. второй этаж = dt. erster Stock), Gedankenstrich „—“, kein Satz über der Stufe seines A1-Texts
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const alle = TEXTE.flatMap(t => t.saetze.map(s => Object.assign({ id: t.id, lvl: t.lvl }, s)));
    const ORD = ['', 'ersten', 'zweiten', 'dritten', 'vierten', 'fünften'];
    const RU = { 'втором': 2, 'третьем': 3, 'четвёртом': 4, 'пятом': 5, 'второго': 2, 'третьего': 3, 'пятого': 5 };
    const stock = alle.filter(s => /этаж/.test(s.ru)).filter(s => { const m = s.ru.match(/(втором|третьем|четвёртом|пятом|второго|третьего|пятого) этаж/); if (!m) return false; return !s.de.includes(ORD[RU[m[1]] - 1] + ' Stock'); }).map(s => s.ru);
    const strich = alle.filter(s => / – /.test(s.ru)).map(s => s.ru);
    const R = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };
    const stufe = alle.filter(s => s.lvl === 'A1' && R[sentenceLevel(s.ru)] > 1).map(s => s.id + ': ' + s.ru);
    const weg = ['я всегда иду по лестнице', 'В одиннадцать часов я сплю', 'мне надо масло', 'о моей семье', 'получите в телефоне', 'сообщение в телефоне', 'спрашивает мой паспорт', 'молодое время', 'учился вечером', 'Здесь жили все мои друзья', 'вспомнил, что днём', 'кричали: «Спасибо', 'автобус идёт долго', 'очень доволен и поблагодарил']
      .filter(x => alle.some(s => s.ru.includes(x)));
    const deWeg = ['wurde sehr müde', 'wurden müde', 'Schachtel Schokolade', 'noch gebaut', 'Piroggen'].filter(x => alle.some(s => s.de.includes(x)));
    return { stock, strich, stufe, weg, deWeg };
  });
  ok('Stockwerke: deutsche Seite um eins niedriger', !r.stock.length, r.stock);
  ok('Gedankenstrich „—“ in russischen Sätzen', !r.strich.length, r.strich);
  ok('A1-Texte: kein Satz über A1', !r.stufe.length, r.stufe);
  ok('korrigierte russische Stellen sind weg', !r.weg.length, r.weg);
  ok('korrigierte deutsche Stellen sind weg', !r.deWeg.length, r.deWeg);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
