const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Rektion (8.11.): Runden mit Fehlerliste und ⋯-Menü, Antworten in zwei Gruppen (Fall / Präposition + Fall),
// Tasten 1–9, Beispiel nach der Antwort, „Form bilden“ nur mit Ergänzung, Liste nach Fällen,
// am Handy Lautsprecher über der Aufgabe
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const a = await p.evaluate(() => { setAppView('grammar'); openRektion(); setRektionMode('choose');
    const arten = document.querySelectorAll('#rektion-opts .rk-art').length; const art0 = rkOpt(rektionState.current.verb.r).prep ? 'praep' : 'fall';
    rkArt('fall'); const g1 = [...document.querySelectorAll('#rektion-opts .case-opt')].map(b => b.dataset.k).join(','); const k1 = [...document.querySelectorAll('#rektion-opts .case-opt')].map(b => b.getAttribute('aria-keyshortcuts')).join('');
    restartRektion();
    const grp = [...document.querySelectorAll('#rektion-opts .rk-group')].map(g => g.querySelector('.rk-group-label').textContent + ':' + [...g.querySelectorAll('.case-opt')].map(b => b.dataset.k).join(','));
    return { arten, g1, k1, grp, n: rektionState.queue.length, menu: !!document.querySelector('#overlay-rektion .gt-more-item[data-view="rektion-practice-view"]'), score: document.getElementById('rektion-score').textContent,
      it: rektionState.current.verb.r, keys: [...document.querySelectorAll('#rektion-opts .case-opt')].map(b => b.getAttribute('aria-keyshortcuts')).join('') }; });
  ok('Runde mit 15 Aufgaben, Zähler „1 / 15“, ⋯-Menü „Neue Runde“', a.n === 15 && /^1 \/ 15 · 0 richtig$/.test(a.score) && a.menu, JSON.stringify(a));
  ok('Zwei Schritte: erst Art (Tasten 1, 2), dann nur die passende Gruppe', a.arten === 2 && a.keys === '12' && (a.g1 === 'Akk,Gen,Dat,Instr' ? a.k1 === '1234' : /^oPraep/.test(a.g1)), JSON.stringify([a.grp, a.keys]));
  // nur die ersten 10 Antworten haben eine Taste: so lange neu starten, bis die Lösung eine hat (sonst zufällig rot)
  const key = await p.evaluate(() => { const k = () => document.querySelector('#rektion-opts .case-opt[data-k="' + rektionState.current.verb.r + '"]').getAttribute('aria-keyshortcuts');
    rkArt(rkOpt(rektionState.current.verb.r).prep ? 'praep' : 'fall'); return k(); });
  await p.keyboard.press(key); await p.waitForTimeout(40);
  const b1 = await p.evaluate(() => ({ res: document.getElementById('rektion-result').textContent, score: document.getElementById('rektion-score').textContent, v: rektionState.current.verb, bsp: rektionExample(rektionState.current.verb) }));
  ok('Taste wählt die Antwort; Rückmeldung mit Beispiel-Wortgruppe', /^Richtig — /.test(b1.res) && b1.bsp && b1.res.includes('Beispiel: ' + b1.bsp) && /1 richtig$/.test(b1.score), JSON.stringify(b1));
  // Form bilden: nur Ergänzung
  const f = await p.evaluate(() => { setRektionMode('form'); const t = rektionState.current; const input = document.getElementById('rektion-input');
    const ph = input.placeholder; input.value = t.obj; checkRektion(); const res = document.getElementById('rektion-result').textContent, sc = document.getElementById('rektion-score').textContent;
    checkRektion(); const t2 = rektionState.current; input.value = t2.answer; checkRektion(); const res2 = document.getElementById('rektion-result').textContent;
    return { ph, res, sc, res2, obj: t.obj, hint: document.querySelector('#rektion-q .case-hint').textContent }; });
  ok('Form bilden: Ergänzung genügt („' + f.obj + '“), ganze Wortgruppe auch richtig, kein „auch:“', /^Richtig — /.test(f.res) && !/auch:/.test(f.res) && /^Richtig/.test(f.res2) && /1 richtig$/.test(f.sc) && / ___ – /.test(f.hint) && /Form nach /.test(f.ph), JSON.stringify(f));
  // Rundenende
  const e = await p.evaluate(() => { const st = rektionState; st.fehler = [st.queue[0], st.queue[1]]; st.index = st.queue.length; renderRektionTask();
    return { li: [...document.querySelectorAll('#rektion-q .gt-fehler li')].map(x => x.textContent), b: !!document.querySelector('#rektion-q .gt-fehler li b'), btn: (document.getElementById('rektion-repeat-btn') || {}).textContent, done: document.getElementById('rektion-practice-view').classList.contains('gt-done') }; });
  ok('Rundenende: Fehler als Wortgruppe mit Lösung, „Fehler wiederholen (2)“', e.li.length === 2 && e.b && /Fehler wiederholen \(2\)/.test(e.btn) && e.done, JSON.stringify(e));
  const w = await p.evaluate(() => { document.getElementById('rektion-repeat-btn').click(); return rektionState.queue.length; });
  ok('Fehler wiederholen: Runde mit 2 Aufgaben', w === 2, String(w));
  // Handy
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e2 => errs.push(e2.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openRektion(); setRektionMode('form');
    const it = rektionItems('form').find(x => x.verb.v === 'говорить' && x.noun === 'концерт'); rektionState.queue[rektionState.index] = it; renderRektionTask();
    const pr = document.querySelector('#rektion-q .case-prep'), lh = parseFloat(getComputedStyle(pr).lineHeight) || parseFloat(getComputedStyle(pr).fontSize) * 1.3;
    const tool = document.querySelector('#rektion-practice-view .gt-task-tools').getBoundingClientRect();
    const out = { zeilen: Math.round(pr.getBoundingClientRect().height / lh), ueber: tool.bottom <= pr.getBoundingClientRect().top + 2 };
    out.breite = 0; setRektionMode('choose'); out.breite2 = document.documentElement.scrollWidth - innerWidth; return out; });
  ok('Handy: „говорить + концерт“ einzeilig, Lautsprecher darüber, kein Überlauf', h.zeilen === 1 && h.ueber && h.breite <= 0 && h.breite2 <= 0, JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
