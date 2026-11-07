const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Aspektpaare (8.11.): nach der Antwort steht die Bildungsart (Vorsilbe по-, Suffix -ыва-, Endung -ать → -ить,
// anderer Stamm …); auch als Spalte in der Liste. Regeln + Einträge von Hand, jedes Paar hat eine Angabe.
const { chromium } = require('playwright');
const ERWARTET = { 'делать': 'Vorsilbe с-', 'читать': 'Vorsilbe про-', 'рассказывать': 'Suffix -ыва- beim unvollendeten Verb', 'давать': 'Suffix -ва- beim unvollendeten Verb',
  'решать': 'Endung -ать → -ить', 'отвечать': 'Endung -ать → -ить (ч → т)', 'объяснять': 'Endung -ять → -ить', 'улыбаться': 'Suffix -ну- beim vollendeten Verb',
  'говорить': 'anderer Stamm', 'приходить': 'Bewegungsverb mit Vorsilbe: -ходить / -йти', 'отдыхать': 'Suffix -ну- beim vollendeten Verb (ы → о)' };
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(ERWARTET => {
    const P = aspectPairs(), out = {};
    out.leer = Object.entries(P).filter(([, d]) => !d.bildung).map(([i, d]) => i + ' / ' + d.pf);
    out.falsch = Object.entries(ERWARTET).filter(([i, t]) => !P[i] || P[i].bildung !== t).map(([i]) => i + ': ' + (P[i] || {}).bildung);
    out.unbekannt = aspectFormation('бубнить', 'отпрыгнуть');
    setAppView('grammar'); openAspect(); setAspectMode('practice'); setAspectDir('fwd');
    aspectState.current = { ipf: 'читать', given: 'читать', answer: 'прочитать', de: 'lesen', note: '', bildung: P['читать'].bildung }; aspectState.answered = false;
    const note = () => { const e = document.getElementById('aspect-note'); return e.style.display === 'none' ? '' : e.textContent; };
    out.vorher = note();
    document.getElementById('aspect-input').value = 'прочитать'; checkAspect(); out.richtig = note();
    nextAspect(); out.neu = note(); const t = aspectState.current; revealAspect(); out.aufgedeckt = [note(), t.bildung];
    setAspectMode('list'); out.spalten = [...document.querySelectorAll('#aspect-list thead th')].map(x => x.textContent).join();
    out.zeile = [...document.querySelectorAll('#aspect-list-body tr')].find(tr => tr.firstChild.textContent === 'говорить').lastChild.textContent;
    return out;
  }, ERWARTET);
  ok('jedes der Paare hat eine Bildungsart', r.leer.length === 0, r.leer.join(', '));
  ok('Stichproben richtig (Vorsilbe, Suffixe, Endung mit Wechsel, anderer Stamm, Bewegungsverb)', r.falsch.length === 0, r.falsch.join(' | '));
  ok('unbekanntes Paar: keine geratene Angabe', r.unbekannt === '', r.unbekannt);
  ok('erst nach der Antwort sichtbar: „Bildung: Vorsilbe про-.“', r.vorher === '' && r.richtig === 'Bildung: Vorsilbe про-.' && r.neu === '', JSON.stringify([r.vorher, r.richtig, r.neu]));
  ok('auch nach „Lösung zeigen“', r.aufgedeckt[0].startsWith('Bildung: ' + r.aufgedeckt[1]), JSON.stringify(r.aufgedeckt));
  ok('Liste mit Spalte „Bildung“', r.spalten === 'Unvollendet,Vollendet,Deutsch,Bildung' && r.zeile === 'anderer Stamm', JSON.stringify([r.spalten, r.zeile]));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
