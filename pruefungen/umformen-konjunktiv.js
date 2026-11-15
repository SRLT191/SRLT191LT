const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Verben umformen · Konjunktiv (B1, 15.11.): Vergangenheit + бы, je Verb eine Einheit, Tipps, Stufe B1 im Stufenplan.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {};
    const items = buildTransformItems().filter(t => t.kind === 'konj');
    const zn = items.filter(t => t.inf === 'знать').map(t => t.pkey + '=' + t.answer).join(' ');
    out.formen = [items.length > 100, zn, items.every(t => / бы$/.test(t.answer)), new Set(items.filter(t => t.inf === 'знать').map(transformUnitId)).size];
    setAppView('grammar'); openTransform(); setTransformScope('konj');
    out.runde = [transformState.queue.length, transformState.queue.every(t => t.kind === 'konj'), new Set(transformState.queue.map(t => t.inf)).size === transformState.queue.length];
    const t = items.find(x => x.inf === 'знать' && x.pkey === 'она');
    out.tipps = [transformTipp(t, 'знала'), transformTipp(t, 'бы знала'), transformTipp(t, 'знал бы'), transformTipp(t, 'знала бы')];
    out.stufe = [GRAMMAR_PART_LEVEL.some(([s, l]) => s === '#transform-scope-btn-konj' && l === 'B1'), document.getElementById('transform-scope-btn-konj').dataset.lvl === 'B1'];
    openLevelOverview(); renderLevelPlan('B1'); out.plan = /Konjunktiv/.test(document.getElementById('lvl-plan').textContent);
    out.info = /Konjunktiv \(B1\)/.test(document.getElementById('transform-info-panel').textContent);
    return out;
  });
  ok('Konjunktiv-Aufgaben aus der Vergangenheit + бы (он/она/они), je Verb eine Einheit', r.formen[0] && r.formen[1] === 'он=знал бы она=знала бы они=знали бы' && r.formen[2] && r.formen[3] === 1, JSON.stringify(r.formen));
  ok('Auswahl „Konjunktiv“: Runde nur aus Konjunktiv-Aufgaben, je Verb einmal', r.runde[0] > 0 && r.runde[1] && r.runde[2], JSON.stringify(r.runde));
  ok('Tipps: бы fehlt, бы vorn, falsche Endung; richtig ohne Tipp', /\+ бы/.test(r.tipps[0]) && /hinter das Verb/.test(r.tipps[1]) && /Vergangenheitsform/.test(r.tipps[2]) && r.tipps[3] === '', JSON.stringify(r.tipps));
  ok('Stufe B1: am Knopf markiert, Punkt im Stufenplan B1', r.stufe.every(Boolean) && r.plan, JSON.stringify(r.stufe) + r.plan);
  ok('Erklärung nennt den Konjunktiv', r.info);
  ok('Keine JS-Fehler', !errs.length, errs.join(' | '));
  await b.close();
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  const n = R.filter(x => x[0] === 'OK ').length; console.log('\n' + n + ' von ' + R.length + ' bestanden');
  process.exit(n === R.length ? 0 : 1);
})();
