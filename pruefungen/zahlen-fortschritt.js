const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Zahlen: Fortschritt wird gespeichert; die Kachel zeigt erledigt/gesamt (nicht die Zahl der Blöcke)
// und zählt nach jeder Antwort mit; Unterkategorien führen Fortschrittslinie und Tooltip nach.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const kachel = () => p.evaluate(() => { const t = document.querySelector('#main-row .tile[data-cat="Zahlen"]'); return { text: t.textContent.trim(), title: t.title }; });
  await p.evaluate(() => { localStorage.setItem('vokabeltrainer-block-size', '5'); });
  await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { setAppView('vocab'); setMode('free'); selectWholeCat('Zahlen'); });
  let k = await kachel();
  ok('Start: Kachel „Zahlen (0/54)“ – nicht die Zahl der Blöcke (11)', k.text === 'Zahlen (0/54)', k.text);
  const r = await p.evaluate(() => { const out = []; for (let i = 0; i < 4; i++) { const w = currentWord; document.getElementById('answer-input').value = w.de[0]; checkAnswer(); out.push(w.ru); nextWord(); } return out; });
  k = await kachel();
  ok('nach 4 richtigen Antworten sofort „Zahlen (4/54)“, Tooltip passt', k.text === 'Zahlen (4/54)' && /4 von 54 erledigt/.test(k.title), JSON.stringify(k));
  // falsche Antwort zählt nicht als erledigt
  await p.evaluate(() => { document.getElementById('answer-input').value = 'falsch falsch'; checkAnswer(); nextWord(); });
  k = await kachel();
  ok('falsche Antwort ändert die Zahl nicht', k.text === 'Zahlen (4/54)', k.text);
  await p.reload(); await p.waitForTimeout(400);
  const nach = await p.evaluate(w => { setAppView('vocab'); return { done: getAllWordsOfCat('Zahlen').filter(hasCorrectAnswer).length, alle: w.every(r => hasCorrectAnswer(allVocabWords().find(x => x.ru === r))) }; }, r);
  k = await kachel();
  ok('nach Neuladen gespeichert: dieselben 4 Zahlen erledigt, Kachel 4/54', nach.done === 4 && nach.alle && k.text === 'Zahlen (4/54)', JSON.stringify(nach) + ' ' + k.text);
  // DE → RU zählt ebenfalls
  // jede Richtung hat ihren eigenen Stand (wie bei allen Vokabeln)
  const de = await p.evaluate(() => { setDirection('de-ru'); selectWholeCat('Zahlen'); const w = currentWord; document.getElementById('answer-input').value = w.ru; checkAnswer(); nextWord(); return getAllWordsOfCat('Zahlen').filter(hasCorrectAnswer).length; });
  k = await kachel();
  const zurueck = await p.evaluate(() => { setDirection('ru-de'); return getAllWordsOfCat('Zahlen').filter(hasCorrectAnswer).length; });
  const k2 = await kachel();
  ok('DE → RU zählt eigenen Stand (1/54), zurück bei RU → DE wieder 4/54', de === 1 && k.text === 'Zahlen (1/54)' && zurueck === 4 && k2.text === 'Zahlen (4/54)', [de, k.text, zurueck, k2.text].join(' · '));
  // Unterkategorie: Linie und Tooltip ohne Neuaufbau nachgeführt; Blockmarke nur bei Teilauswahl
  const sub = await p.evaluate(() => {
    setDirection('ru-de'); expandedMain = 'Substantive'; expandedTheme = 'Alltag'; selectWholeCat('Kleidung');
    const btn = () => document.querySelector('#main-row .sub-btn[data-cat="Kleidung"]');
    const vorher = btn().style.getPropertyValue('--sub-p'), marke = !!btn().querySelector('.sub-btn-sel');
    for (let i = 0; i < 13; i++) { const w = currentWord; document.getElementById('answer-input').value = w.de[0]; checkAnswer(); nextWord(); }
    const nachher = btn().style.getPropertyValue('--sub-p'), title = btn().title;
    selectedBlocksByCat['Kleidung'] = new Set([0]); buildNav();
    return { vorher, nachher, title, marke, teil: (btn().querySelector('.sub-btn-sel') || {}).textContent };
  });
  ok('Kleidung: Fortschrittslinie 0 % → 20 % nach 13 Antworten, Tooltip „13 von 65“', sub.vorher === '0%' && sub.nachher === '20%' && /13 von 65 erledigt/.test(sub.title), JSON.stringify(sub));
  ok('Blockmarke nur bei Teilauswahl (alle gewählt: keine, ein Block: „1“)', !sub.marke && sub.teil === '1', JSON.stringify(sub));
  // Zurücksetzen setzt auch die Kachel zurück
  await p.evaluate(() => { resetProgress(); buildNav(); });
  k = await kachel();
  ok('Zurücksetzen: Kachel wieder 0/54', k.text === 'Zahlen (0/54)', k.text);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
