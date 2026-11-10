const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Präpositionen · Kasus-Drill (10.11.): Mini-Sätze mit passenden Substantiven, Sonderfälle,
// Runden mit Fehlerliste, Erklärung + Satz, Tipps, Tasten 1–5, Übersicht im eigenen Fenster,
// Bereich/Fall/Hinweis/Plural im ⋯-Menü; Erinnerung: вследствие/согласно/вопреки, sobald passende Substantive da sind
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {};
    out.erinnerung = Object.entries(CASE_SATZ_KANDIDATEN).filter(([id]) => !PREP_SATZ[id]).flatMap(([id, ns]) => ns.filter(n => nounDeclensionData[n]).map(n => id + ' ' + n));
    out.ohneSatz = PREP_CASES.filter(x => !PREP_SATZ[casePrepId(x)]).map(casePrepId);
    out.ids = new Set(PREP_CASES.map(casePrepId)).size === PREP_CASES.length;
    out.nomen = Object.values(PREP_SATZ).flat().flatMap(s => s.n).filter(n => !nounDeclensionData[n]);
    const f = (id, n, num) => { const x = PREP_CASES.find(y => casePrepId(y) === id); const s = PREP_SATZ[id].find(z => z.n.includes(n)); return caseWordTask(x, s, n, num || 'sg'); };
    out.formen = [f('о:Präp.', 'ответ').answer, f('с:Gen.', 'станция').answer, f('в:Präp.', 'лес').answer, f('на:Präp.', 'мост').answer, f('с:Instr.', 'дочь').answer, f('между:Instr.', 'дом', 'pl').answer, f('внутри:Gen.', 'дом').answer, f('к:Dat.', 'друг', 'pl').answer];
    out.sonder = [f('о:Präp.', 'ответ').sonder, f('в:Präp.', 'лес').sonder, f('с:Gen.', 'станция').sonder, f('в:Akk.', 'школа').sonder];
    out.satz = caseWordSatz(f('внутри:Gen.', 'дом'));
    out.satzB = caseWordSatz(f('через:Akk.', 'час')); out.pde = f('через:Akk.', 'час').de;
    out.tipp = [caseWordTipp('о ответе', f('о:Präp.', 'ответ')), caseWordTipp('в лесе', f('в:Präp.', 'лес')), caseWordTipp('в школе', f('в:Akk.', 'школа')), caseWordTipp('к другу', f('к:Dat.', 'друг', 'pl')), caseWordTipp('к маме', f('к:Dat.', 'мама'))];
    // Runde
    setAppView('grammar'); openCaseDrill(); setCaseMode('word');
    const q = caseState.wordQueue; out.runde = q.length; out.sonderInRunde = q.filter(t => t.sonder.length).length;
    out.passend = q.every(t => PREP_SATZ[t.id].some(s => s.n.includes(t.noun)));
    out.frage = document.getElementById('case-question').innerText;
    out.satzSichtbar = !!document.querySelector('#case-question .case-satz') && /___/.test(document.querySelector('#case-question .case-satz').textContent);
    // falsch, richtig, aufdecken
    const t0 = caseState.wordCurrent; document.getElementById('case-input').value = 'xx yy'; checkCaseWord();
    out.erkl = !!document.querySelector('#case-result .case-erkl') && !!document.querySelector('#case-result .case-satz-voll');
    checkCaseWord(); const t1 = caseState.wordCurrent; out.weiter = t1 !== t0 && caseState.wordIndex === 1;
    document.getElementById('case-input').value = t1.answer; checkCaseWord(); out.richtig = caseState.wordCorrect === 1;
    nextCaseWord(); revealCaseWord(); out.bewerten = !!document.querySelector('#case-result .gt-rate'); gtRateAnswer(false);
    out.nachBewerten = caseState.wordIndex === 3 && caseState.wordFehler.length === 2;
    while (caseState.wordCurrent) { document.getElementById('case-input').value = caseState.wordCurrent.answer; checkCaseWord(); nextCaseWord(); }
    out.ende = { done: document.getElementById('overlay-casedrill').classList.contains('gt-done'), fehler: document.querySelectorAll('#case-question .gt-fehler li').length, text: /13 von 15 richtig/.test(document.getElementById('case-question').textContent) };
    repeatCaseWordErrors(); out.wiederholen = caseState.wordQueue.length === 2;
    // Fall-Filter und Plural
    setCaseKasus('Dat.'); out.dat = caseState.wordQueue.every(t => t.kasus === 'Dat.') && caseState.wordQueue.length === 15;
    out.datChip = document.querySelector('#case-kasus-chips [data-v="Dat."]').classList.contains('active');
    toggleCasePlural(); let pl = 0; for (let i = 0; i < 6; i++) { restartCaseWord(); pl += caseState.wordQueue.filter(t => t.number === 'pl').length; } out.plural = pl > 0;
    out.plTask = (caseState.wordQueue.find(t => t.number === 'pl') || {}).answer;
    toggleCasePlural(); setCaseKasus('all');
    // Hinweis
    toggleCaseHint(); out.hinweisAus = document.getElementById('case-word-hint').style.visibility === 'hidden' && JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /tool/i.test(k)) || '{}') || '{}') !== null; toggleCaseHint();
    // Menü
    out.menue = ['case-scope-btn-all', 'case-kasus-chips', 'case-hint-toggle', 'case-plural-toggle'].every(id => document.getElementById(id) && document.getElementById(id).closest('.gt-more-menu'));
    out.keineEinst = !document.querySelector('#overlay-casedrill .gt-settings');
    // Fall wählen: Tasten
    setCaseMode('abstract'); out.menueAbstrakt = document.getElementById('case-kasus-group').style.display === 'none';
    out.kbd = document.querySelectorAll('#case-options .case-opt kbd').length;
    const it = caseState.queue[caseState.index]; const taste = CASE_LABELS.indexOf(it.kasus) + 1;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: String(taste), bubbles: true }));
    out.taste = caseState.correct === 1 && caseState.answered === 1;
    // Übersicht
    openPrepList(); const ov = document.getElementById('overlay-preplist');
    out.liste = { offen: ov.classList.contains('open'), gruppen: [...ov.querySelectorAll('.rkl-title')].map(x => x.textContent), zeilen: ov.querySelectorAll('.ppl-row').length, n: PREP_CASES.length, wechsel: ov.querySelectorAll('.ppl-wechsel').length, laut: ov.querySelectorAll('.ppl-row .gt-icon-btn').length };
    [...ov.querySelectorAll('.rkl-group')].find(g => g.querySelector('.rkl-title').textContent === 'Instrumental').querySelector('.rkl-ueben').click();
    out.gruppeUeben = { zu: !ov.classList.contains('open'), mode: caseState.mode, alle: caseState.wordQueue.every(t => t.kasus === 'Instr.') };
    setCaseKasus('all'); setCaseMode('abstract');
    out.info = /Mini|Lücke/.test(document.getElementById('case-info-panel').textContent) && /Übersicht nach Fall/.test(document.getElementById('case-info-panel').textContent);
    out.gesamt = grammarToolSources().casedrill[1];
    return out;
  });
  ok('Erinnerung: passende Substantive für вследствие/согласно/вопреки sind jetzt da – Sätze vorschlagen', !r.erinnerung.length, r.erinnerung);
  ok('nur вследствие/согласно/вопреки ohne Satz', r.ohneSatz.join() === 'вследствие:Gen.,согласно:Dat.,вопреки:Dat.', r.ohneSatz);
  ok('IDs eindeutig', r.ids); ok('alle Substantive vorhanden', !r.nomen.length, r.nomen);
  ok('Formen', r.formen.join('|') === 'об ответе|со станции|в лесу|на мосту|с дочерью|между домами|внутри дома|к друзьям', r.formen);
  ok('Sonderfälle erkannt', JSON.stringify(r.sonder) === '[["prep"],["lok"],["prep"],[]]', r.sonder);
  ok('Satz mit Großschreibung', r.satz === 'Внутри дома было тепло.', r.satz);
  ok('eigene Bedeutung через = in', r.satzB === 'Я вернусь через час.' && r.pde === 'in', [r.satzB, r.pde]);
  ok('Tipps', /об/.test(r.tipp[0]) && /-у/.test(r.tipp[1]) && /Dativ oder Präpositiv.*Akkusativ/.test(r.tipp[2]) && /Plural/.test(r.tipp[3]) && r.tipp[4] === '', r.tipp);
  ok('Runde 15 mit Sonderfällen', r.runde === 15 && r.sonderInRunde >= 4, [r.runde, r.sonderInRunde]);
  ok('nur passende Substantive', r.passend); ok('Satz mit Lücke sichtbar', r.satzSichtbar, r.frage);
  ok('Erklärung + Satz nach Antwort', r.erkl); ok('Enter → nächste Aufgabe', r.weiter); ok('richtig gezählt', r.richtig);
  ok('Aufdecken → bewerten', r.bewerten && r.nachBewerten);
  ok('Rundenende mit Fehlerliste', r.ende.done && r.ende.fehler === 2 && r.ende.text, r.ende); ok('Fehler wiederholen', r.wiederholen);
  ok('Fall-Filter', r.dat && r.datChip); ok('Plural', r.plural, r.plTask);
  ok('Hinweis versteckbar', r.hinweisAus);
  ok('Einstellungen im ⋯-Menü', r.menue && r.keineEinst); ok('Fall-Filter nur bei Form bilden', r.menueAbstrakt);
  ok('Tasten 1–5', r.kbd === 5 && r.taste, [r.kbd, r.taste]);
  ok('Übersicht im Fenster', r.liste.offen && r.liste.gruppen.join() === 'Genitiv,Dativ,Akkusativ,Instrumental,Präpositiv' && r.liste.zeilen === r.liste.n && r.liste.wechsel === 10 && r.liste.laut === r.liste.n - 3, r.liste);
  ok('Gruppe üben', r.gruppeUeben.zu && r.gruppeUeben.mode === 'word' && r.gruppeUeben.alle, r.gruppeUeben);
  ok('Erklärung aktualisiert', r.info); ok('Gesamtzahl Fortschritt', r.gesamt === r.liste.n * 2 - 3, r.gesamt);
  // Handy
  const m = await b.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => {
    setAppView('grammar'); openCaseDrill(); setCaseMode('word');
    const q = document.getElementById('case-question').getBoundingClientRect(), sp = document.querySelector('#overlay-casedrill .gt-task-tools').getBoundingClientRect();
    const satz = document.querySelector('#case-question .case-satz').getBoundingClientRect();
    openPrepList(); const row = document.querySelector('#overlay-preplist .ppl-row').getBoundingClientRect();
    return { ueber: sp.bottom <= satz.top + 2, breit: document.documentElement.scrollWidth <= 390, row: row.right <= 390 };
  });
  ok('Handy: Lautsprecher über Satz, keine Überbreite', h.ueber && h.breit && h.row, h);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
