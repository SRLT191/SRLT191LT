const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Grammatik (31.10.): Umformen zeigt die gesuchte Form groß als Lücke, Platzhalter nennt die Aufgabe,
// eigene Auswahl Futur/Imperativ, Runde nach Fälligkeit, Fehlerliste mit „Fehler wiederholen“;
// Fortschrittsstrich der Werkzeuge in der Seitenleiste, Kartengröße auch für die Grammatik,
// Tastenhinweis bei „Weiter“, Hilfe als Schalter, keine Abkürzungen (wdh.) bei den Bewegungsverben
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 2000, height: 1100 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);

  // 1/2 Aufgabe als Lücke, Platzhalter
  await p.evaluate(() => { window.sichtbar = el => { const c = el.cloneNode(true); c.querySelectorAll('.sr-only').forEach(x => x.remove()); return c.textContent; }; });
  const a = await p.evaluate(() => { setAppView('grammar'); setTransformScope('past'); openTransform();
    const q = document.getElementById('transform-q'), t = transformState.queue[0];
    return { from: q.querySelector('.tf-from [lang="ru"]').textContent, task: q.querySelector('.tf-task').textContent, gap: sichtbar(q.querySelector('.tf-gap')).replace(/\s+/g, ' ').trim(),
      ph: document.getElementById('transform-input').placeholder, t, big: parseFloat(getComputedStyle(q.querySelector('.tf-gap')).fontSize), klein: parseFloat(getComputedStyle(q.querySelector('.tf-from')).fontSize) }; });
  const person = a.t.prompt.split(' + ')[0];
  ok('1 gesuchte Form groß als Lücke („они ___“), Ausgangsform klein darüber', a.gap === person + ' ___' && a.from === a.t.from && a.big > 2 * a.klein && a.task === '→ Vergangenheit', JSON.stringify(a));
  ok('2 Platzhalter nennt die Aufgabe', a.ph === 'Vergangenheit für ' + person, a.ph);
  const imp = await p.evaluate(() => { setTransformScope('imperative'); const q = transformState.queue;
    return { alle: q.every(t => t.kind === 'imperative'), gap: sichtbar(document.querySelector('#transform-q .tf-gap')).replace(/\s+/g, ' ').trim(), n: q.length,
      badge: document.getElementById('transform-scope-btn-imperative').dataset.lvl === 'A2' }; });
  ok('4 Auswahl „Imperativ“: nur Imperativ, Lücke „(ты) ___!“, Abzeichen A2', imp.alle && imp.n === 20 && imp.gap === '(ты) ___!' && imp.badge, JSON.stringify(imp));
  const fut = await p.evaluate(() => { setTransformScope('future'); const r = transformState.queue.every(t => t.kind === 'future'); return r; });
  ok('4 Auswahl „Futur“: nur Futur', fut);
  await p.reload(); await p.waitForTimeout(300);
  const gemerkt = await p.evaluate(() => { setAppView('grammar'); openTransform(); return transformState.scope + ':' + document.getElementById('transform-scope-btn-future').classList.contains('active'); });
  ok('4 Auswahl bleibt nach dem Neuladen', gemerkt === 'future:true', gemerkt);

  // 3 Abkürzungen
  const abk = await p.evaluate(() => ({ alt: Object.values(conjugationData).filter(d => /wdh\.|best\.\)/.test(d.de)).length, hodit: conjugationData['ходить'].de, idti: conjugationData['нести'].de }));
  ok('3 keine Abkürzungen (wdh.)/(best.) mehr', abk.alt === 0 && abk.hodit === 'gehen (hin und her, regelmäßig)' && abk.idti === 'tragen (in eine Richtung)', JSON.stringify(abk));

  // 5 Runde: fällige und zuletzt falsche zuerst
  const r = await p.evaluate(() => {
    setTransformScope('past');
    const pool = transformPool(), L = loadLifetime(), now = Date.now(), srs = loadGrammarSrs();
    L.g.transform = L.g.transform || {}; srs.transform = srs.transform || {};
    // 30 sicher gelernte (nicht fällig), 5 fällig, 5 zuletzt falsch
    pool.slice(0, 30).forEach(t => { srs.transform[transformId(t)] = { correct: 2, wrong: 0, box: 2, lastSeen: now }; L.g.transform[transformId(t)] = { c: 2, w: 0, l: now, z: now, d: 2, dd: now }; });
    const faellig = pool.slice(30, 35), falsch = pool.slice(35, 40);
    faellig.forEach(t => { srs.transform[transformId(t)] = { correct: 1, wrong: 0, box: 1, lastSeen: now - 5 * 864e5 }; L.g.transform[transformId(t)] = { c: 1, w: 0, l: now, z: now, d: 1, dd: now - 5 * 864e5 }; });
    falsch.forEach(t => { srs.transform[transformId(t)] = { correct: 0, wrong: 1, box: 0, lastSeen: now }; });
    saveLifetime(); saveGrammarSrs();
    const ids = transformRoundPick(pool).map(transformId), has = l => l.every(t => ids.includes(transformId(t)));
    const sicher = pool.slice(0, 30).filter(t => ids.includes(transformId(t))).length;
    return { faellig: has(faellig), falsch: has(falsch), sicher, n: ids.length };
  });
  ok('5 Runde: fällige und zuletzt falsche kommen zuerst dran, gelernte erst danach', r.faellig && r.falsch && r.sicher === 0 && r.n === 20, JSON.stringify(r));

  // 6 Fehlerliste, Lücke gefüllt, Fehler wiederholen
  await p.evaluate(() => restartTransform());
  const t0 = await p.evaluate(() => transformState.queue[0]);
  await p.fill('#transform-input', 'qqq'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  const gap = await p.evaluate(() => { const g = document.querySelector('#transform-gap .tf-filled'); return g && g.textContent + '|' + g.className; });
  ok('6 nach falscher Antwort steht die Lösung in der Lücke', gap === t0.answer + '|tf-blank tf-filled bad', gap);
  const kbd = await p.evaluate(() => getComputedStyle(document.querySelector('#overlay-transform .gt-kbd-next')).display);
  await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  const kbd0 = await p.evaluate(() => getComputedStyle(document.querySelector('#overlay-transform .gt-kbd-next')).display);
  ok('10 Tastenhinweis ⏎ bei „Weiter“ erst nach dem Prüfen', kbd !== 'none' && kbd0 === 'none', kbd + ' / ' + kbd0);
  const ende = await p.evaluate(() => {
    const t1 = transformState.queue[1];
    // Aufgabe 2 richtig, 3 aufgedeckt, 4 übersprungen, Rest richtig
    const inp = document.getElementById('transform-input');
    inp.value = t1.answer; checkTransform(); checkTransform();
    revealTransform(); nextTransform();
    nextTransform();
    while (transformState.index < transformState.queue.length) { inp.value = transformState.queue[transformState.index].answer; checkTransform(); checkTransform(); }
    const li = [...document.querySelectorAll('#transform-q .gt-fehler li')].map(x => x.textContent);
    return { li, n: transformState.fehler.length, richtig: transformState.correct, btn: (document.getElementById('transform-repeat-btn') || {}).textContent,
      eingabe: getComputedStyle(document.querySelector('#overlay-transform .conj-row')).display };
  });
  ok('6 Rundenende: Fehlerliste mit Lösung (falsch, aufgedeckt, übersprungen)', ende.n === 3 && ende.li.length === 3 && ende.li[0].endsWith(': ' + t0.answer) && ende.richtig === 17 && /Fehler wiederholen \(3\)/.test(ende.btn) && ende.eingabe === 'none', JSON.stringify(ende));
  const wdh = await p.evaluate(() => { document.getElementById('transform-repeat-btn').click(); return { n: transformState.queue.length, idx: transformState.index, gap: !!document.querySelector('#transform-q .tf-gap'), fehler: transformState.fehler.length }; });
  ok('6 „Fehler wiederholen“ startet eine Runde nur mit den Fehlern', wdh.n === 3 && wdh.idx === 0 && wdh.gap && wdh.fehler === 0, JSON.stringify(wdh));

  // 8 Seitenleiste: Fortschrittsstrich
  const sb = await p.evaluate(() => { updateGrammarTileProgress(); const c = document.getElementById('gchip-transform'); const k = document.getElementById('gchip-conjugate');
    return { p: c.style.getPropertyValue('--gt-p'), title: c.title, after: getComputedStyle(c, '::after').height, k: k.style.getPropertyValue('--gt-p') }; });
  ok('8 Seitenleiste: Werkzeug zeigt Fortschrittsstrich und „… von … gelernt“', /^\d+%$/.test(sb.p) && sb.p !== '0%' && /\d+ von \d+ gelernt/.test(sb.title) && sb.after === '3px' && sb.k === '0%', JSON.stringify(sb));

  // 9 Kartengröße gilt auch für die Grammatik
  const gr = await p.evaluate(() => { const w = () => Math.round(document.getElementById('grammar-view').getBoundingClientRect().width), f = () => parseFloat(getComputedStyle(document.querySelector('#transform-q .case-prep')).fontSize);
    const out = {}; ['auto', 'gross', 'sehrgross'].forEach(m => { setCardSize(m); out[m] = [w(), f()]; }); setCardSize('auto'); return out; });
  ok('9 Größe der Lernkarte wirkt auch im Grammatikfenster (breiter, größere Schrift)', gr.auto[0] < gr.gross[0] && gr.gross[0] < gr.sehrgross[0] && gr.auto[1] < gr.gross[1] && gr.gross[1] < gr.sehrgross[1] && gr.auto[0] >= 800, JSON.stringify(gr));

  // 10 Hilfe als Schalter
  const sw = await p.evaluate(() => { const b = document.getElementById('transform-hint-toggle'); const an = getComputedStyle(b, '::after').backgroundImage; toggleTransformHint(); const aus = getComputedStyle(b, '::after').backgroundImage;
    const hint = !!document.querySelector('#transform-q .case-hint'); toggleTransformHint(); return { an, aus, hint, w: getComputedStyle(b, '::after').width }; });
  ok('10 Hilfe sieht aus wie ein Schalter und blendet „von …“ aus', sw.w === '26px' && sw.an !== sw.aus && !sw.hint, JSON.stringify(sw));

  // Handy
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
  const h = await m.evaluate(() => { setAppView('grammar'); openTransform(); return { ueber: document.documentElement.scrollWidth - innerWidth, kbd: getComputedStyle(document.querySelector('#overlay-transform .gt-kbd-next')).display }; });
  ok('Handy: kein Überlauf, keine Tastenhinweise', h.ueber <= 0 && h.kbd === 'none', JSON.stringify(h));
  await ctx.close();

  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
