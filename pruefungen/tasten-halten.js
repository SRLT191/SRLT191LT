const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Gedrückt gehaltene Taste: die Tastenwiederholung des Systems löst keine weiteren Antworten aus –
// ein Druck = ein Schritt (Auswahl 1–4, Aufdecken Enter/1/2, Freitext Enter, Grammatik-Wahl)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  // Playwright schickt bei keyboard.down auf eine schon gedrückte Taste repeat: true – wie ein gehaltener Finger
  const halten = async (key, n) => { await p.keyboard.down(key); for (let i = 0; i < n; i++) { await p.keyboard.down(key); await p.waitForTimeout(30); } await p.keyboard.up(key); await p.waitForTimeout(150); };
  const erledigt = () => p.evaluate(() => getPool().filter(hasCorrectAnswer).length);

  // Auswahl (Mehrfachauswahl): 1 gehalten
  await p.evaluate(() => { resetProgress(); setAppView('vocab'); selectWholeCat('Reisen'); setDirection('ru-de'); setMode('mc'); document.activeElement.blur(); });
  await p.waitForTimeout(200);
  let vor = await p.evaluate(() => ({ w: currentWord.ru, n: Object.keys(scores).length }));
  await halten('1', 15);
  let nach = await p.evaluate(() => ({ w: currentWord.ru, n: Object.keys(scores).length, answered }));
  ok('Auswahl: 1 gehalten bewertet genau ein Wort und springt nicht weiter', nach.n === vor.n + 1 && nach.w === vor.w && nach.answered, JSON.stringify([vor, nach]));
  await halten('Enter', 10);
  nach = await p.evaluate(() => ({ w: currentWord.ru, n: Object.keys(scores).length, answered }));
  ok('Auswahl: Enter gehalten geht genau ein Wort weiter', nach.n === vor.n + 1 && nach.w !== vor.w && !nach.answered, JSON.stringify(nach));

  // Aufdecken: Enter gehalten deckt nur auf, 1 gehalten bewertet nur ein Wort
  await p.evaluate(() => { resetProgress(); setMode('flip'); document.activeElement.blur(); });
  await p.waitForTimeout(200);
  const e0 = await erledigt();
  await halten('Enter', 10);
  const auf = await p.evaluate(() => document.getElementById('flip-show-btn').style.display === 'none');
  ok('Aufdecken: Enter gehalten deckt nur auf, bewertet nichts', auf && (await erledigt()) === e0, String(auf));
  await halten('1', 15);
  const e1 = await erledigt();
  ok('Aufdecken: 1 gehalten stuft genau ein Wort als gewusst ein (nicht die ganze Kategorie)', e1 === e0 + 1, e0 + ' → ' + e1);

  // Einzelner Druck funktioniert weiter
  await p.keyboard.press('Enter'); await p.waitForTimeout(100); await p.keyboard.press('1'); await p.waitForTimeout(200);
  ok('Einzelne Drücke wirken wie bisher (Enter deckt auf, 1 bewertet)', (await erledigt()) === e1 + 1, String(await erledigt()));

  // Freitext: Enter gehalten im Antwortfeld prüft nur einmal und springt nicht weiter
  await p.evaluate(() => { resetProgress(); setMode('type'); const i = document.getElementById('answer-input'); i.focus(); i.value = 'qqq'; });
  vor = await p.evaluate(() => ({ w: currentWord.ru, n: Object.keys(scores).length }));
  await halten('Enter', 10);
  nach = await p.evaluate(() => ({ w: currentWord.ru, n: Object.keys(scores).length }));
  ok('Freitext: Enter gehalten prüft einmal und bleibt beim Wort', nach.w === vor.w && nach.n === vor.n + 1, JSON.stringify([vor, nach]));
  const tippen = await p.evaluate(() => { const i = document.getElementById('answer-input'); i.value = ''; i.focus(); return true; });
  await p.keyboard.down('a'); for (let i = 0; i < 3; i++) await p.keyboard.down('a'); await p.keyboard.up('a');
  const txt = await p.evaluate(() => document.getElementById('answer-input').value);
  ok('Buchstaben gehalten tippen im Feld weiter', tippen && txt.length >= 2, txt);

  // Grammatik-Wahl (Geschlecht): 1 gehalten wählt nur einmal
  await p.evaluate(() => { setAppView('grammar'); showGrammarPanel('gender'); document.activeElement.blur(); });
  await p.waitForTimeout(300);
  const g0 = await p.evaluate(() => JSON.stringify(loadGrammarSrs().gender || {}).length);
  await halten('1', 15);
  const g1 = await p.evaluate(() => Object.keys(loadGrammarSrs().gender || {}).length);
  ok('Grammatik-Wahl: 1 gehalten beantwortet höchstens eine Aufgabe', g1 <= 1, 'Einträge: ' + g1 + ' (vorher ' + g0 + ')');

  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
