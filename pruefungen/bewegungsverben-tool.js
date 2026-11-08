const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Bewegungsverben (7.11.): alle Paare der Vokabelkategorie auch im Werkzeug – neu лезть / лазить,
// тащить / таскать, ползти / ползать; Formen stimmen mit den Konjugationstabellen überein
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const vok = getAllWordsOfCat('Bewegungsverben').map(w => w.ru).filter(ru => { const t = ru.split(' / '); return t.length === 2 && MOTION_INDET.includes(t[1]); });
    const fehlt = vok.filter(k => !motionData[k]);
    const abw = [];
    Object.values(motionData).forEach(d => ['det', 'indet'].forEach(s => { const x = d[s], c = conjugationData[x.inf]; if (!c) return;
      Object.entries(x.present).forEach(([k, v]) => { if (c.nonPast[k] !== v) abw.push(x.inf + ' ' + k); });
      Object.entries(x.past).forEach(([k, v]) => { if (c.past[k] !== v) abw.push(x.inf + ' ' + k); }); }));
    const voll = Object.entries(motionData).filter(([k, d]) => !d.de || Object.keys(d.det.present).length !== 6 || Object.keys(d.indet.present).length !== 6 || Object.keys(d.det.past).length !== 4 || Object.keys(d.indet.past).length !== 4).map(x => x[0]);
    setAppView('grammar'); openMotion(); setMotionMode('list'); const zeilen = document.querySelectorAll('#motion-list-body tr').length;
    restartMotionPair('ползти / ползать'); setMotionDir('fwd'); restartMotionPair('ползти / ползать'); const t = motionState.current;
    document.getElementById('motion-pair-input').value = t.answer; gtCheck(MOTION_DRILL); updateGrammarTileProgress();
    const hilfe = document.getElementById('motion-info-panel').textContent;
    return { n: motionPairKeys().length, vok, fehlt, abw, voll, zeilen, t, hdr: document.getElementById('gtp-motion').textContent, hilfe: /alle 11 Paare/.test(hilfe) && /22 Verben/.test(hilfe) && /Gewusst/.test(hilfe), q: MOTION_QUIZ.length + MOTION_PREFIX.length };
  });
  ok('alle Paare der Vokabelkategorie im Werkzeug (11)', r.fehlt.length === 0 && r.n === 11 && r.vok.length === 11, JSON.stringify([r.n, r.vok, r.fehlt]));
  ok('jedes Paar vollständig: Bedeutung, 6 Präsens- und 4 Vergangenheitsformen je Seite', r.voll.length === 0, r.voll.join(', '));
  ok('Formen gleich den Konjugationstabellen', r.abw.length === 0, r.abw.join(', '));
  ok('neues Paar wird geübt (ползти → ползать) und gezählt; Kopfzeile = 11 × 2 + Wahl- und Vorsilben-Sätze', r.t && r.t.answer === 'ползать' && r.hdr === '1 von ' + (22 + r.q) + ' gelernt', JSON.stringify([r.t, r.hdr]));
  ok('Liste zeigt 11 Paare; Hilfe nennt 11 Paare, 22 Verben und die Selbstbewertung', r.zeilen === 11 && r.hilfe, JSON.stringify([r.zeilen, r.hilfe]));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
