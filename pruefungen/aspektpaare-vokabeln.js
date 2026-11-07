const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Aspektpaare (7.11.): die Übung zieht alle Verbkarten der Vokabeln mit beiden Aspekten
// („просить / попросить“) zusätzlich zu aspectData; Bedeutung von der Karte, Kopfzeile zählt beide Richtungen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const P = aspectPairs(), karten = WORTART_GROUPS['Verben'].flatMap(c => getAllWordsOfCat(c)).filter(w => MERGED_CARDS[w.ru]);
    const bewegung = getAllWordsOfCat('Bewegungsverben').map(w => w.ru.split(' / ')).filter(t => t.length === 2 && MOTION_INDET.includes(t[1])), aspekt = karten.filter(w => !MOTION_INDET.includes(MERGED_CARDS[w.ru][1]));
    const bewDrin = bewegung.filter(([d, i]) => P[d] && P[d].pf === i).map(t => t.join(' / '));
    const fehlt = aspekt.filter(w => { const [i, pf] = MERGED_CARDS[w.ru]; return !P[i] || P[i].pf !== pf; }).map(w => w.ru);
    const alt = Object.keys(aspectData).filter(k => aspectData[k].pf && (!P[k] || P[k].pf !== aspectData[k].pf || P[k].de !== aspectData[k].de));
    const form = Object.entries(P).filter(([i, d]) => !/(ть|ти|чь)(ся|сь)?$/.test(i) || !/(ть|ти|чь)(ся|сь)?$/.test(d.pf) || !d.de).map(x => x[0]);
    setAppView('grammar'); openAspect(); setAspectMode('list'); const zeilen = document.querySelectorAll('#aspect-list-body tr').length; setAspectMode('practice');
    // gezielt ein neues Paar abfragen
    aspectState.current = { ipf: 'просить', given: 'просить', answer: 'попросить', de: P['просить'].de, note: '' }; aspectState.answered = false;
    document.getElementById('aspect-input').value = 'попросить'; checkAspect(); updateGrammarTileProgress();
    return { n: Object.keys(P).length, karten: aspekt.length, bew: bewegung.map(t => t.join(' / ')), bewDrin, fehlt, alt, form, zeilen, hdr: document.getElementById('gtp-aspect-fwd').textContent, sl: (loadGrammarSrs()['aspect:fwd'] || {})['просить'], de: P['класть'] && P['класть'].de };
  });
  ok('alle Verbkarten mit beiden Aspekten sind Aspektpaare (unvollendet → vollendet)', r.fehlt.length === 0 && r.n >= 97 && r.n >= r.karten, JSON.stringify([r.n, r.karten, r.fehlt]));
  ok('Bewegungsverb-Paare (идти / ходить, beide unvollendet) sind keine Aspektpaare', r.bew.length >= 11 && r.bewDrin.length === 0, JSON.stringify([r.bew, r.bewDrin]));
  ok('aspectData bleibt maßgeblich (Partner, Bedeutung, Notiz)', r.alt.length === 0, r.alt.join(', '));
  ok('nur Infinitive, jede Zeile mit deutscher Bedeutung (von der Karte: класть = legen)', r.form.length === 0 && r.de === 'legen', JSON.stringify([r.form, r.de]));
  ok('Liste zeigt alle Paare', r.zeilen === r.n, r.zeilen + ' / ' + r.n);
  ok('neues Paar wird geübt und gezählt; Kopfzeile = Paare × 2', r.sl && r.sl.correct === 1 && r.hdr === '1 von ' + r.n * 2 + ' gelernt', JSON.stringify([r.sl, r.hdr]));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
