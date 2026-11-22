const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Begrüßungen & Redewendungen (22.11.): Kategorie umbenannt (alter Name wird übernommen), 10 Redewendungen
// hinten angehängt, всего доброго nach dem Lexikalischen Minimum auf A2
const { chromium } = require('playwright');
const NEU = [
  ['не за что', 'A1'], ['без проблем', 'A1'], ['всё в порядке', 'A2'], ['ничего страшного', 'A2'],
  ['с удовольствием', 'A2'], ['удачи', 'A2'], ['будьте здоровы', 'A2'], ['счастливого пути', 'A2'],
  ['так себе', 'A2'], ['с Новым годом', 'A2'],
];
const CAT = 'Begrüßungen & Redewendungen';
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(([CAT, NEU]) => {
    const ws = getAllWordsOfCat(CAT);
    const hinten = ws.slice(-NEU.length).map(w => w.ru);
    const stufen = NEU.map(([ru]) => wordLevel(ws.find(w => w.ru === ru)));
    const doppelt = NEU.filter(([ru]) => allVocabWords().filter(w => w.ru === ru).length !== 1).map(x => x[0]);
    return { gibt: !!vocab[CAT], alt: !!vocab['Begrüßungen'], n: ws.length, hinten, stufen,
      vd: wordLevel(ws.find(w => w.ru === 'всего доброго')), mig: migrateCatName('Begrüßungen'), doppelt,
      gender: GENDER_SKIP_CATS.has(CAT) };
  }, [CAT, NEU]).catch(e => ({ fehler: e.message }));
  ok('Kategorie heißt „' + CAT + '“, alter Name weg', r.gibt && !r.alt, JSON.stringify(r).slice(0, 200));
  ok('30 Wörter', r.n === 30, r.n);
  ok('10 Redewendungen hinten in der Reihenfolge des Vorschlags', JSON.stringify(r.hinten) === JSON.stringify(NEU.map(x => x[0])), (r.hinten || []).join(', '));
  ok('Stufen wie bestätigt', JSON.stringify(r.stufen) === JSON.stringify(NEU.map(x => x[1])), (r.stufen || []).join(' '));
  ok('всего доброго auf A2 (Lexikalisches Minimum)', r.vd === 'A2', r.vd);
  ok('Jede Redewendung genau einmal im Wortschatz', r.doppelt && r.doppelt.length === 0, (r.doppelt || []).join(', '));
  ok('Alter Name wird übernommen', r.mig === CAT, r.mig);
  ok('Nicht im Werkzeug Geschlecht', r.gender);

  // gespeicherte Auswahl und Favoriten mit altem Namen
  const p2 = await b.newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.goto('file://' + APP_PATH); await p2.waitForTimeout(300);
  await p2.evaluate(() => {
    localStorage.setItem(SELECTION_KEY, JSON.stringify({ activeMain: 'Begrüßungen', selectedCats: ['Begrüßungen'], blocks: {} }));
    localStorage.setItem('vokabeltrainer-favorite-cats', JSON.stringify(['Begrüßungen']));
  });
  await p2.reload(); await p2.waitForTimeout(500);
  const m = await p2.evaluate(CAT => ({ sel: selectedCats.has(CAT), fav: favoriteCats.has(CAT), main: activeMain }), CAT);
  ok('Auswahl und Favorit mit altem Namen kommen an', m.sel && m.fav && m.main === CAT, JSON.stringify(m));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
