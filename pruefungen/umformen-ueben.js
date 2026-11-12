const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Umformen (8.11.): Ausgangsform mit Person (он знакомится), Rundenende als Satz, „он“ statt „он / она / оно“,
// Erklärung nennt Selbstbewertung; Futur zählt nicht (eigener Schlüssel, bei „Alle“ höchstens 2 je Runde);
// Vergangenheit je Verb einmal; vollendete Vergangenheit; Tipps bei typischen Fehlern; alte Einträge übertragen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); const now = Date.now();
    localStorage.setItem('vokabeltrainer-grammar-srs', JSON.stringify({ transform: {
      'она + делать:Vergangenheit': { correct: 1, wrong: 0, box: 1, lastSeen: now }, 'они + делать:Vergangenheit': { correct: 0, wrong: 1, box: 0, lastSeen: now },
      'я + делать:Futur (unvollendet)': { correct: 1, wrong: 0, box: 1, lastSeen: now }, 'ты + делать:Imperativ': { correct: 1, wrong: 0, box: 1, lastSeen: now } } }));
    localStorage.setItem('vokabeltrainer-lifetime', JSON.stringify({ ver: 3, run: 1, v: {}, g: { transform: { 'она + делать:Vergangenheit': { c: 1, w: 0, mb: 1, l: now, z: now, d: 1, dd: now }, 'я + делать:Futur (unvollendet)': { c: 1, w: 0, mb: 1, l: now, z: now, d: 1, dd: now } } } })); });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, srs = loadGrammarSrs(), L = loadLifetime();
    out.mig = { past: srs.transform['past:делать'], alt: Object.keys(srs.transform).filter(k => /Vergangenheit$|Futur/.test(k)), fut: Object.keys(srs['transform:future'] || {}), imp: !!srs.transform['ты + делать:Imperativ'], life: Object.keys(L.g.transform), lifeFut: Object.keys(L.g['transform:future'] || {}) };
    const items = buildTransformItems(), kinds = {}; items.forEach(t => kinds[t.task] = (kinds[t.task] || 0) + 1);
    const verben = new Set(items.filter(t => t.kind === 'past').map(t => t.inf)).size;
    const erw = items.filter(t => t.kind === 'past').length + items.filter(t => t.kind === 'imperative').length + items.filter(t => t.task === 'vollendet (Futur)').length + new Set(items.filter(t => t.task === 'vollendet (Vergangenheit)').map(t => t.inf)).size;
    out.total = [transformTotal(), erw, items.length, kinds];
    setAppView('grammar'); setTransformScope('all'); openTransform(); updateGrammarTileProgress();
    out.hdr = document.getElementById('gtp-transform').textContent;
    // Runde „Alle“: höchstens 2× Futur; je Verb höchstens eine Vergangenheitsaufgabe
    let maxFut = 0, doppelt = 0; for (let i = 0; i < 30; i++) { restartTransform(); const q = transformState.queue; maxFut = Math.max(maxFut, q.filter(t => t.kind === 'future').length); const u = q.map(transformUnitId); if (new Set(u).size !== u.length) doppelt++; }
    out.runde = [maxFut, doppelt];
    setTransformScope('past'); const pq = transformState.queue; out.pastPool = [pq.length, new Set(pq.map(t => t.inf)).size];
    // Darstellung
    const t = transformState.queue[0];
    out.from = document.querySelector('#transform-q .tf-from [lang="ru"]').textContent; out.tFrom = t.fromPron + ' ' + t.from;
    setTransformScope('aspect'); const a = transformState.queue.find(x => x.prompt.startsWith('он / она / оно')) || items.find(x => x.kind === 'aspect' && x.prompt.startsWith('он / она / оно')) || null;   // nicht jede Runde enthält eine solche Aufgabe
    if (a) { transformState.queue[transformState.index] = a; renderTransform(); }
    out.gap = a ? document.querySelector('#transform-gap .tf-person').textContent : 'kein Beispiel'; out.ph = document.getElementById('transform-input').placeholder;
    out.apast = items.filter(x => x.task === 'vollendet (Vergangenheit)').slice(0, 3).map(x => x.prompt + ' = ' + x.answer);
    // Futur gespeichert, zählt nicht
    setTransformScope('future'); const f = transformState.queue[0]; document.getElementById('transform-input').value = f.answer; checkTransform(); updateGrammarTileProgress();
    out.futur = [!!(loadGrammarSrs()['transform:future'] || {})[transformId(f)], document.getElementById('gtp-transform').textContent];
    // Vergangenheit: eine Person reicht für das Verb
    setTransformScope('past'); const v = transformState.queue[0]; document.getElementById('transform-input').value = v.answer; checkTransform(); updateGrammarTileProgress();
    out.verb = [!!loadGrammarSrs().transform[transformUnitId(v)] && (v.pkey === 'он') === (transformUnitId(v) === 'past:' + v.inf), document.getElementById('gtp-transform').textContent];
    // Tipps
    const tipp = (task, inf, pkey, eingabe) => { const x = buildTransformItems().find(i => i.task === task && i.inf === inf && i.pkey === pkey); return x ? transformTipp(x, eingabe) : 'fehlt ' + inf; };
    out.tipps = {
      endung: tipp('Vergangenheit', 'читать', 'они', 'читала'), sja: (() => { const x = buildTransformItems().find(i => i.kind === 'past' && /ся$/.test(i.answer)); return x ? transformTipp(x, x.answer.replace(/ся$/, '')) : 'kein reflexives Verb'; })(),
      te: tipp('Imperativ', 'читать', 'ты', 'читайте'), budu: tipp('Futur (unvollendet)', 'читать', 'я', 'читать'),
      byt: tipp('Futur (unvollendet)', 'читать', 'я', 'будет читать'), aspekt: tipp('vollendet (Futur)', 'делать', 'я', 'делаю'),
      aspektV: tipp('vollendet (Vergangenheit)', 'делать', 'он', 'делал'), nichts: tipp('Vergangenheit', 'читать', 'он', 'писал') };
    // Rundenende als Satz
    setTransformScope('imperative'); const q = transformState.queue; transformState.fehler = [q[0]]; transformState.index = q.length; renderTransform();
    out.ende = [document.querySelector('#transform-q .gt-fehler li').textContent, q[0].fromPron + ' ' + q[0].from + ' → (ты) ' + q[0].answer + '!'];
    // Erklärung
    const info = document.getElementById('transform-info-panel').textContent;
    out.info = /Gewusst/.test(info) && /vollendet \(Vergangenheit\)/.test(info) && /zählt nicht/.test(info);
    // Tipp erscheint im Werkzeug
    setTransformScope('past'); const w = transformState.queue[0]; const falsch = w.answer.replace(/(л|ла|ли)(ся|сь)?$/, (m0, e, r) => (e === 'ли' ? 'ла' : 'ли') + (r || ''));
    document.getElementById('transform-input').value = falsch; checkTransform(); out.tippUi = (document.querySelector('#transform-result .tf-tipp') || {}).textContent || '';
    return out;
  });
  ok('alte Einträge übertragen: Vergangenheit je Verb (zusammengeführt), Futur unter eigenem Schlüssel', r.mig.past && r.mig.past.correct === 1 && r.mig.past.wrong === 1 && r.mig.alt.length === 0 && r.mig.fut.length === 1 && r.mig.imp && r.mig.life.includes('past:делать') && r.mig.lifeFut.length === 1, JSON.stringify(r.mig));
  ok('Gesamtzahl: Vergangenheit je Form (12.11.) + Imperativ + vollendet (Futur je Person, Vergangenheit je Verb), ohne Futur', r.total[0] === r.total[1] && r.hdr === '2 von ' + r.total[0] + ' gelernt', JSON.stringify(r.total) + ' ' + r.hdr);
  ok('Runde „Alle“: höchstens 2 Futur-Aufgaben, keine Einheit doppelt; Vergangenheit je Verb eine Aufgabe je Runde', r.runde[0] <= 2 && r.runde[1] === 0 && r.pastPool[0] === r.pastPool[1], JSON.stringify([r.runde, r.pastPool]));
  ok('Ausgangsform mit Person („он …“)', r.from === r.tFrom && /^он /.test(r.from), JSON.stringify([r.from, r.tFrom]));
  ok('„он“ statt „он / она / оно“ in Lücke und Platzhalter', r.gap === 'он' && /für он$/.test(r.ph), JSON.stringify([r.gap, r.ph]));
  ok('vollendete Vergangenheit als Aufgabe (он сказал, она сказала …)', r.apast.length === 3 && r.apast.every(x => / = \S+л[аи]?$/.test(x)), JSON.stringify(r.apast));
  ok('Futur wird gespeichert, zählt aber nicht', r.futur[0] && r.futur[1] === r.hdr, JSON.stringify(r.futur));
  ok('Vergangenheit: jede Form zählt einzeln (он unter der alten Kennung)', r.verb[0] && r.verb[1] !== r.hdr, JSON.stringify(r.verb));
  const T = r.tipps;
  ok('Tipps: Endung, -ся, -те, буду, Form von быть, Aspekt (Futur und Vergangenheit); sonst keiner', /-л, она -ла, они -ли/.test(T.endung) && /-ся/.test(T.sja) && /ohne -те/.test(T.te) && /буду, будешь/.test(T.budu) && /Form von быть/.test(T.byt) && /unvollendete Form/.test(T.aspekt) && /unvollendete Form/.test(T.aspektV) && T.nichts === '', JSON.stringify(T));
  ok('Rundenende: „он … → (ты) …!“ als Satz', r.ende[0] === r.ende[1], JSON.stringify(r.ende));
  ok('Erklärung nennt Selbstbewertung, vollendete Vergangenheit und dass das Futur nicht zählt', r.info);
  ok('Tipp erscheint unter der Lösung', /^Tipp: Endung der Vergangenheit/.test(r.tippUi), r.tippUi);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
