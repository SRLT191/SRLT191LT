const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Konjugieren (7.11.): Futur übbar, zählt aber nicht im Lernstand (× 3); Auto-Größe auf sehr breiten Bildschirmen;
// nach dem Lösen Beispielsatz und „Tabelle anhören“; Punkte je Zeit beim Verb; Auswahl „Gemischt“
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const fill = () => document.querySelectorAll('#conj-grid input[data-answer]').forEach(i => i.value = i.dataset.answer.split(/\s*[\/|]\s*/)[0]);
  const r = await p.evaluate(fillSrc => {
    const fill = eval(fillSrc); const out = {};
    setAppView('grammar'); openConjugate(); updateGrammarTileProgress();
    out.total = [document.getElementById('gtp-conj').textContent, (Object.keys(conjugationData).length + conjPfVerben().length) * 3, grammarToolSources().conjugate[1]];
    // Futur: wird gespeichert, zählt aber nicht
    document.getElementById('conj-verb-select').value = 'строить'; setConjTense('future'); fill(); checkConjugationTable();
    out.futur = [!!(loadGrammarSrs()['conj:future'] || {})['строить'], document.getElementById('gtp-conj').textContent.split(' ')[0], document.getElementById('conj-tense-btn-future').title];
    // Punkte, Beispiel, Anhören
    setConjTense('nonpast'); out.dots0 = [...document.querySelectorAll('#conj-dots .conj-dot')].map(d => d.className).join('|');
    out.leer = document.getElementById('conj-after').innerHTML === '';
    fill(); checkConjugationTable();
    out.dots1 = [...document.querySelectorAll('#conj-dots .conj-dot')].map(d => d.className.includes('fertig')).join();
    out.after = document.getElementById('conj-after').innerText;
    let gesagt = ''; const sp = window.speak; window.speak = t => { gesagt = t; }; document.querySelector('#conj-after button').click(); window.speak = sp; out.gesagt = gesagt;
    out.satzFehlt = Object.keys(conjugationData).filter(v => { const w = findVocabEntry(v); return !w || !getWordSentence(w); });
    // nach dem Aufdecken ebenfalls
    nextConjugationVerb(); revealConjugationTable(); out.nachAufdecken = !!document.querySelector('#conj-after button');
    // Gemischt: offene Zeit wählen, beim nächsten Verb neu, gemerkt
    document.getElementById('conj-verb-select').value = 'строить'; setConjMixed();
    out.mix = [conjState.mixed, conjState.tense, document.getElementById('conj-tense-btn-mixed').classList.contains('active'), document.getElementById('conj-tense-btn-past').classList.contains('active'), (document.querySelector('#conj-de-hint .conj-mixed-chip') || {}).textContent];
    const zeiten = new Set(); for (let i = 0; i < 30; i++) { nextConjugationVerb(); zeiten.add(conjState.tense); }
    out.zeiten = [...zeiten].sort().join();
    setConjTense('past'); out.aus = [conjState.mixed, document.getElementById('conj-tense-btn-mixed').classList.contains('active')];
    setConjMixed();
    return out;
  }, fill.toString());
  ok('Lernstand Konjugieren = (Verben + vollendete Tabellen) × 3 (Präsens, Vergangenheit, Imperativ)', r.total[0] === '0 von ' + r.total[1] + ' gelernt' && r.total[2] === r.total[1], JSON.stringify(r.total));
  ok('Futur wird gespeichert, zählt aber nicht; Knopf erklärt es', r.futur[0] && r.futur[1] === '0' && /zählt nicht im Lernstand/.test(r.futur[2]), JSON.stringify(r.futur));
  ok('Punkte je Zeit: drei leere, aktuelle markiert; nach dem Lösen Präsens gefüllt', r.dots0 === 'conj-dot jetzt|conj-dot|conj-dot' && r.dots1 === 'true,false,false', JSON.stringify([r.dots0, r.dots1]));
  ok('nach dem Lösen: „Tabelle anhören“ und Beispielsatz (vorher leer); auch nach dem Aufdecken', r.leer && /^Tabelle anhören\n.+\n.+/.test(r.after) && r.nachAufdecken, JSON.stringify([r.leer, r.after, r.nachAufdecken]));
  ok('Tabelle anhören liest Pronomen + Form', r.gesagt === 'я строю. ты строишь. он строит. мы строим. вы строите. они строят.', r.gesagt);
  ok('jedes Verb mit Tabelle hat einen Beispielsatz', r.satzFehlt.length === 0, r.satzFehlt.join(', '));
  ok('Gemischt: offene Zeit (Präsens schon erledigt), Abzeichen „→ …“, Knopf aktiv', r.mix[0] && ['past', 'imperative'].includes(r.mix[1]) && r.mix[2] && r.mix[3] === false && /^→ /.test(r.mix[4]), JSON.stringify(r.mix));
  ok('Gemischt: beim Weiterblättern wechseln die Zeiten, nie Futur', r.zeiten === 'imperative,nonpast,past', r.zeiten);
  ok('feste Zeit wählen schaltet Gemischt aus', r.aus.join() === 'false,false', JSON.stringify(r.aus));
  await p.reload(); await p.waitForTimeout(400);
  const g = await p.evaluate(() => { setAppView('grammar'); openConjugate(); return [conjState.mixed, document.getElementById('conj-tense-btn-mixed').classList.contains('active'), conjState.tense !== 'future']; });
  ok('Gemischt bleibt nach dem Neuladen', g.join() === 'true,true,true', JSON.stringify(g));
  // Größe automatisch: sehr breite Fenster breiter, eigene Breite bleibt
  const w = await b.newPage({ viewport: { width: 2000, height: 1000 } }); w.on('pageerror', e => errs.push(e.message));
  await w.goto('file://' + APP_PATH); await w.waitForTimeout(400);
  const breit = await w.evaluate(() => { setAppView('grammar'); openConjugate(); const a = Math.round(document.getElementById('grammar-view').getBoundingClientRect().width); setCardSize('gross'); const gr = Math.round(document.getElementById('grammar-view').getBoundingClientRect().width); setCardSize('auto'); return [a, gr]; });
  ok('Größe „Automatisch“ bei 2000 px: 1000 px breit (vorher 880), „groß“ noch breiter (1140)', breit[0] === 1000 && breit[1] === 1140, JSON.stringify(breit));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
