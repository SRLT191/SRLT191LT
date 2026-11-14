const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Rektion (9.11.): Liste als eigenes Fenster (nach Fall, „≠ Deutsch“ mit Schalter, Stand je Verb, Gruppe üben,
// abwechselnde Beispiele, Handy als Blöcke), Erklärung aktualisiert; 12 neue Verben mit от, к, в + Präp., за, из
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {};
    const neu = { 'зависеть': 'otGen', 'отказываться': 'otGen', 'готовиться': 'kDat', 'привыкать': 'kDat', 'участвовать': 'vPraep', 'болеть за': 'zaAkk', 'голосовать': 'zaAkk', 'бороться за': 'zaAkk', 'состоять': 'izGen', 'мечтать': 'oPraep', 'сердиться': 'naAkk', 'жениться': 'naPraep' };
    out.fehlt = Object.entries(neu).filter(([id, k]) => !RK_VERBS.some(x => rkVerbId(x) === id && x.r === k));
    out.formen = ['зависеть:погода', 'готовиться:урок', 'участвовать:концерт', 'болеть за:брат', 'мечтать:дом', 'жениться:сестра'].map(k => { const [v, n] = k.split(':'); const t = rektionItems('form').find(i => rkVerbId(i.verb) === v && i.noun === n); return t ? t.answer : 'fehlt ' + k; });
    out.opts = RK_OPTIONS.length;
    out.ids = new Set(RK_VERBS.map(rkVerbId)).size === RK_VERBS.length;
    setAppView('grammar'); openRektion(); setRektionMode('choose');
    // Liste im Fenster
    document.getElementById('rektion-mode-list').click();
    const ov = document.getElementById('overlay-rektionlist');
    out.offen = ov.classList.contains('open'); out.imWerkzeug = !!document.querySelector('#overlay-rektion .rkl-row');
    const gruppen = [...ov.querySelectorAll('.rkl-group')]; out.gruppen = gruppen.map(g => g.querySelector('.rkl-title').textContent + ' ' + g.querySelector('.rkl-n').textContent);
    out.zeilen = ov.querySelectorAll('.rkl-row').length; out.n = RK_VERBS.length;
    const bsp = [...ov.querySelectorAll('.rkl-bsp')].map(x => x.textContent); out.mama = bsp.filter(x => / мам[уеыой]$/.test(x)).length;
    out.anders = ov.querySelectorAll('.rkl-anders').length; out.andersSoll = RK_VERBS.filter(rkAnders).length;
    out.kurz = [...ov.querySelectorAll('.rkl-vgl')].filter(x => /– (wie|anders als) im Deutschen$/.test(x.textContent)).length;
    toggleRektionListAnders(); out.nurAnders = ov.querySelectorAll('.rkl-row').length; toggleRektionListAnders();
    // Stand je Verb
    const srs = loadGrammarSrs(); srs.rektion = srs.rektion || {}; srs.rektion['w:помогать'] = { correct: 1, wrong: 0, box: 1, lastSeen: Date.now() }; saveGrammarSrs(); renderRektionList();
    const zeile = [...ov.querySelectorAll('.rkl-row')].find(z => z.querySelector('.rkl-v').textContent.startsWith('помогать')); out.haken = zeile.querySelector('.rkl-st').className;
    // Gruppe üben
    const knopf = [...ov.querySelectorAll('.rkl-group')].find(g => /^к \+ Dativ/.test(g.querySelector('.rkl-title').textContent)).querySelector('.rkl-ueben'); knopf.click();
    out.uebe = { offen: ov.classList.contains('open'), mode: rektionState.mode, alle: rektionState.queue.every(t => t.verb.r === 'kDat'), n: rektionState.queue.length };
    document.getElementById('rektion-mode-list').click(); [...ov.querySelectorAll('.rkl-group')].find(g => /^из/.test(g.querySelector('.rkl-title').textContent)).querySelector('.rkl-ueben').click();
    out.uebe2 = { mode: rektionState.mode, n: rektionState.queue.length };
    const info = document.getElementById('rektion-info-panel').textContent;
    out.info = /Liste:/.test(info) && /Runden zu 15/.test(info) && /zwei Schritten/.test(info) && /nur die Ergänzung/.test(info) && /зависеть/.test(info);
    out.tasten = [...document.querySelectorAll('#rektion-opts .case-opt')].length; rkArt('fall'); const nf = document.querySelectorAll('#rektion-opts .case-opt').length; restartRektion(); rkArt(rkOpt(rektionState.current.verb.r).prep ? 'praep' : 'fall'); out.tasten = [out.tasten, nf, RK_OPTIONS.length];
    return out;
  });
  ok('12 neue Verben mit от, к, в + Präp., за, из (inzwischen 17 Antwortmöglichkeiten, eindeutige Kennungen)', r.fehlt.length === 0 && r.opts === 17 && r.ids, JSON.stringify(r.fehlt));
  ok('Formen gebildet: зависеть от погоды, готовиться к уроку, участвовать в концерте, болеть за брата, мечтать о доме, жениться на сестре',
    r.formen.join() === 'зависеть от погоды,готовиться к уроку,участвовать в концерте,болеть за брата,мечтать о доме,жениться на сестре', r.formen.join(' | '));
  ok('Liste öffnet als eigenes Fenster, nicht im Werkzeug', r.offen && !r.imWerkzeug);
  ok('Gruppen mit Überschrift und Anzahl, alle Verben', r.zeilen === r.n && r.gruppen.some(g => /^от \+ Genitiv 0 von 2 sicher$/.test(g)) && r.gruppen.some(g => /^за \+ Akkusativ 0 von 4 sicher$/.test(g)), JSON.stringify(r.gruppen));
  ok('Beispiele abwechselnd (höchstens 10× „мама“ bei 76 Verben)', r.mama <= 10, String(r.mama));
  ok('„≠ Deutsch“ bei abweichender Rektion; Schalter zeigt nur diese; Vergleich ohne „wie/anders als im Deutschen“', r.anders === r.andersSoll && r.nurAnders === r.andersSoll && r.kurz === 0, JSON.stringify([r.anders, r.andersSoll, r.nurAnders, r.kurz]));
  ok('Stand je Verb als Punkt: nur „Fall wählen“ richtig = halb (s2)', /\bs2\b/.test(r.haken), r.haken);
  ok('„üben“: Fenster zu, Runde „Form bilden“ nur mit der Gruppe; ohne Substantive „Fall wählen“', !r.uebe.offen && r.uebe.mode === 'form' && r.uebe.alle && r.uebe.n === 6 && r.uebe2.mode === 'choose' && r.uebe2.n === 1, JSON.stringify([r.uebe, r.uebe2]));
  ok('Erklärung nennt Liste, Runden, Tasten, nur Ergänzung und die neuen Präpositionen', r.info);
  ok('Fall wählen in zwei Schritten: erst 2 Arten, dann 4 Fälle bzw. 13 Präpositionen (17 Antworten)', r.tasten[0] === 2 && r.tasten[2] === 17, String(r.tasten));
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openRektion(); openRektionList();
    const v = document.querySelector('#overlay-rektionlist .rkl-v'), z = v.closest('.rkl-row');
    const lh = parseFloat(getComputedStyle(v).lineHeight) || 20;
    return { zeilenVerb: Math.round(v.getBoundingClientRect().height / lh), breite: Math.round(v.closest('.rkl-row').getBoundingClientRect().width), ueber: document.documentElement.scrollWidth - innerWidth, box: document.querySelector('#overlay-rektionlist .overlay-body').scrollHeight > document.querySelector('#overlay-rektionlist .overlay-body').clientHeight }; });
  ok('Handy: Verb in einer Zeile (kein Wortbruch), Block über die Breite, Fenster scrollt, kein Überlauf', h.zeilenVerb === 1 && h.breite > 250 && h.ueber <= 0 && h.box, JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
