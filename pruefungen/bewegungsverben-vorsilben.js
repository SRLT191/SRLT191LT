const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Bewegungsverben (8.11.): 14 neue Wahl-Sätze (alle 11 Paare, auch Vergangenheit) und Modus „Vorsilben“
// (при-, у-, в-, вы-, пере-, про-; vier Formen, Tasten 1–4, Runde mit Fehlerliste, eigene Zählung)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const d = await p.evaluate(() => {
    const formen = pair => { const x = motionData[pair]; return [x.det, x.indet].flatMap(s => [s.inf, ...Object.values(s.present), ...Object.values(s.past)]); };
    const paare = motionPairKeys().filter(k => MOTION_QUIZ.some(q => formen(k).includes(q.correct)));
    const kaputt = MOTION_QUIZ.filter(q => ![q.a, q.b].includes(q.correct) || (q.ru.match(/___/g) || []).length !== 1 || /___ [.!?,]/.test(q.ru) || !q.why || !q.de);
    const vergangen = MOTION_QUIZ.filter(q => motionPairKeys().some(k => [motionData[k].det, motionData[k].indet].some(s => Object.values(s.past).includes(q.correct)))).length;
    const pk = MOTION_PREFIX.filter(q => q.opts.length !== 4 || q.opts[0] !== q.correct || new Set(q.opts).size !== 4 || !MOTION_PREFIX_MEANING[q.pre] || !q.correct.startsWith(q.pre.replace('-', '')) || (q.ru.match(/___/g) || []).length !== 1);
    return { n: MOTION_QUIZ.length, paare: paare.length, kaputt: kaputt.map(q => q.ru), vergangen, pn: MOTION_PREFIX.length, pk: pk.map(q => q.ru), vors: [...new Set(MOTION_PREFIX.map(q => q.pre))].sort().join() };
  });
  ok('Wahl: 28 Sätze, alle 11 Paare, 6 in der Vergangenheit, jeder mit Lösung, Begründung, Übersetzung', d.n === 28 && d.paare === 11 && d.vergangen === 6 && d.kaputt.length === 0, JSON.stringify(d));
  ok('Vorsilben: 10 Sätze, je 4 verschiedene Formen, Lösung mit passender Vorsilbe, alle 6 Vorsilben', d.pn === 10 && d.pk.length === 0 && d.vors === 'в-,вы-,пере-,при-,про-,у-', JSON.stringify([d.pk, d.vors]));
  await p.evaluate(() => { setAppView('grammar'); openMotion(); setMotionMode('prefix'); updateGrammarTileProgress(); });
  const a = await p.evaluate(() => ({ it: MOTION_PREFIX_CHOICE.item(), opts: [...document.querySelectorAll('#motion-p-opts .case-opt')].map(b => b.dataset.k), hdr: document.getElementById('gtp-motion').textContent, tot: motionPairKeys().length * 2 + MOTION_QUIZ.length + MOTION_PREFIX.length }));
  ok('Kopfzeile zählt Vorsilben mit (11 × 2 + 28 + 10 = 60)', a.hdr === '0 von ' + a.tot + ' gelernt' && a.tot === 60, a.hdr);
  const pos = a.opts.indexOf(a.it.correct) + 1;
  await p.keyboard.press(String(pos)); await p.waitForTimeout(30);
  const b1 = await p.evaluate(() => ({ res: document.getElementById('motion-p-result').textContent, srs: Object.keys(loadGrammarSrs()['motion:prefix'] || {}), hdr: document.getElementById('gtp-motion').textContent }));
  ok('Taste ' + pos + ' wählt die richtige Form; Bedeutung der Vorsilbe; gespeichert und gezählt', /^Richtig — .+: (при|у|в|вы|пере|про)- = /.test(b1.res) && b1.srs.includes(a.it.ru) && b1.hdr.startsWith('1 von'), JSON.stringify(b1));
  ok('Antworten gemischt (richtige nicht immer vorne)', await p.evaluate(() => { const pos = new Set(); for (let i = 0; i < 20; i++) { restartMotionPrefix(); pos.add(MOTION_PREFIX_CHOICE.item().opts.indexOf(MOTION_PREFIX_CHOICE.item().correct)); } return pos.size > 1; }));
  const ende = await p.evaluate(() => { restartMotionPrefix(); const n = motionState.pQueue.length;
    for (let i = 0; i < n; i++) { const it = MOTION_PREFIX_CHOICE.item(); gtChoose(MOTION_PREFIX_CHOICE, i < 2 ? it.opts.find(o => o !== it.correct) : it.correct); gtChoiceNext(MOTION_PREFIX_CHOICE); }
    const li = [...document.querySelectorAll('#motion-p-q .gt-fehler li')]; return { li: li.length, b: li.length && !!li[0].querySelector('b'), btn: (document.getElementById('motion-p-repeat-btn') || {}).textContent, done: document.getElementById('motion-prefix-view').classList.contains('gt-done') }; });
  ok('Rundenende: 2 Fehler als Satz mit Lösung, „Fehler wiederholen (2)“', ende.li === 2 && ende.b && /Fehler wiederholen \(2\)/.test(ende.btn) && ende.done, JSON.stringify(ende));
  const wdh = await p.evaluate(() => { document.getElementById('motion-p-repeat-btn').click(); return motionState.pQueue.length; });
  ok('Fehler wiederholen startet eine Runde mit 2 Sätzen', wdh === 2, String(wdh));
  const info = await p.evaluate(() => /Vorsilben:/.test(document.getElementById('motion-info-panel').textContent) && !!document.getElementById('motion-mode-btn-prefix'));
  ok('Modus-Knopf „Vorsilben“ und Erklärung vorhanden', info);
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openMotion(); setMotionMode('prefix'); return document.documentElement.scrollWidth - innerWidth; });
  ok('Handy: kein Überlauf', h <= 0, String(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
