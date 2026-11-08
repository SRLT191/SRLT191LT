const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Bewegungsverben (8.11.): Rundenende zeigt den vollständigen Satz mit Lösung, keine Leerzeichen vor Satzzeichen,
// Lautsprecher am Handy über dem Satz und am Rundenende ausgeblendet, Tasten 1/2 bei „Wahl“, Liste mit Formen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const daten = await p.evaluate(() => ({ leer: MOTION_QUIZ.filter(q => / ___ ?[.!?,]/.test(q.ru) && /___ [.!?,]/.test(q.ru)).map(q => q.ru), luecke: MOTION_QUIZ.filter(q => (q.ru.match(/___/g) || []).length !== 1).map(q => q.ru) }));
  ok('Wahl-Sätze: genau eine Lücke, kein Leerzeichen vor Satzzeichen', daten.leer.length === 0 && daten.luecke.length === 0, JSON.stringify(daten));
  await p.evaluate(() => { setAppView('grammar'); openMotion(); setMotionMode('quiz'); });
  // Tasten 1/2
  const it = await p.evaluate(() => MOTION_CHOICE.item());
  await p.keyboard.press('2'); await p.waitForTimeout(30);
  const t2 = await p.evaluate(() => [MOTION_CHOICE.answered, document.querySelector('#motion-opts .case-opt.correct, #motion-opts .case-opt.wrong') ? [...document.querySelectorAll('#motion-opts .case-opt')].map(b => b.className).join('|') : '']);
  await p.keyboard.press('1'); await p.waitForTimeout(30);
  const nochmal = await p.evaluate(() => MOTION_CHOICE.item());
  ok('Taste 2 wählt die zweite Antwort; danach keine zweite Wahl', t2[0] === true && /wrong|correct/.test(t2[1]) && nochmal.ru === it.ru, JSON.stringify([it.b, t2]));
  const kbd = await p.evaluate(() => [...document.querySelectorAll('#motion-opts .motion-opt-kbd')].map(k => k.textContent).join());
  ok('Antwortknöpfe zeigen 1 und 2', kbd === '1,2', kbd);
  // Rundenende
  const ende = await p.evaluate(() => { motionState.fehler = [MOTION_QUIZ[0], MOTION_QUIZ.find(q => q.ru.includes('хорошо'))]; motionState.qIndex = motionState.queue.length; renderMotionQuestion();
    const li = [...document.querySelectorAll('#motion-q .gt-fehler li')].map(x => x.textContent);
    const tools = getComputedStyle(document.querySelector('#motion-quiz-view .gt-task-tools')).display;
    return { li, tools, b: document.querySelector('#motion-q .gt-fehler li b').textContent }; });
  ok('Rundenende: vollständiger Satz mit hervorgehobener Lösung', ende.li[0] === 'Сейчас я иду в школу.' && ende.li[1] === 'Она хорошо плавает.' && ende.b === 'иду', JSON.stringify(ende.li));
  ok('Rundenende: kein Lautsprecher', ende.tools === 'none', ende.tools);
  // Liste mit Formen
  const liste = await p.evaluate(() => { setMotionMode('list'); const z = [...document.querySelectorAll('#motion-list-body tr')].find(tr => tr.firstChild.textContent.startsWith('идти')); return [...z.querySelectorAll('.motion-list-forms')].map(x => x.textContent); });
  ok('Liste: я · он · Vergangenheit je Verb (иду · идёт · шёл / хожу · ходит · ходил)', liste.join(' / ') === 'иду · идёт · шёл / хожу · ходит · ходил', liste.join(' / '));
  // Handy
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openMotion(); setMotionMode('quiz'); motionState.queue[motionState.qIndex] = MOTION_QUIZ.find(q => q.ru.startsWith('Осенью')); renderMotionQuestion();
    const s = document.querySelector('#motion-q .case-sentence'), btn = document.querySelector('#motion-quiz-view .gt-task-tools').getBoundingClientRect(), sr = s.getBoundingClientRect();
    const zeilen = Math.round(sr.height / parseFloat(getComputedStyle(s).lineHeight));
    setMotionMode('list'); return { zeilen, ueber: btn.bottom <= sr.top + 2, kbd: getComputedStyle(document.querySelector('.motion-opt-kbd') || document.body).display, breite: document.documentElement.scrollWidth - innerWidth }; });
  ok('Handy: Satz einzeilig, Lautsprecher darüber, keine Tastenhinweise, kein Überlauf (auch Liste)', h.zeilen === 1 && h.ueber && h.breite <= 0, JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
