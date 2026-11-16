const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); p.on('dialog', d => d.dismiss()); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const out = [];
  // name, open, inputId, check, reveal, state(): {done, correct, item}
  const tools = [
    ['Aspekt', "setAppView('grammar');openAspect()", 'aspect-input', 'checkAspect()', 'revealAspect()', () => ({ done: aspectState.done ?? aspectState.answeredCount, correct: aspectState.correct, item: JSON.stringify(aspectState.current) })],
    ['Bewegung', "setAppView('grammar');openMotion();setMotionMode('pair')", 'motion-pair-input', 'checkMotionPair()', 'revealMotionPair()', () => ({ done: motionState.done, correct: motionState.correct, item: JSON.stringify(motionState.current) })],
    ['Umformen', "setAppView('grammar');openTransform()", 'transform-input', 'checkTransform()', 'revealTransform()', () => ({ done: transformState.index, correct: transformState.correct, item: transformState.index })],
    ['Zahl+Subst', "setAppView('grammar');openNumNoun()", 'numnoun-input', 'checkNumNoun()', 'revealNumNoun()', () => ({ done: numNounState.done, correct: numNounState.correct, item: JSON.stringify(numNounState.current) })],
    ['Kasus bilden Subst.', "setAppView('grammar');openCaseForm('noun')", 'caseform-input', "checkCaseForm('noun')", "revealCaseForm('noun')", () => ({ done: caseFormState.done, correct: caseFormState.correct, item: JSON.stringify(caseFormState.current) })],
    ['Kasus bilden Adj.', "setAppView('grammar');openCaseAdj()", 'caseadj-input', "checkCaseForm('adj')", "revealCaseForm('adj')", () => ({ done: caseAdjState.done, correct: caseAdjState.correct, item: JSON.stringify(caseAdjState.current) })],
    ['Pronomen umformen', "setAppView('grammar');openPronForm()", 'pronform-input', 'checkPronForm()', 'revealPronForm()', () => ({ done: pronFormState.done, correct: pronFormState.correct, item: JSON.stringify(pronFormState.current) })],
    ['Kasus-Drill Wort', "setAppView('grammar');openCaseDrill();setCaseMode('word')", 'case-input', 'checkCaseWord()', 'revealCaseWord()', () => ({ done: caseState.answered, correct: caseState.correct, item: JSON.stringify(caseState.wordCurrent) })],
    ['Wortgruppen', "setAppView('grammar');openWordgroup();setWgAnswerMode('type')", 'wg-input', 'checkWordgroup()', 'revealWordgroup()', () => ({ done: wgState.done, correct: wgState.correct, item: wgState.current.answer })],
    ['Satzbau', "setAppView('grammar');openSentenceBuild();setWgAnswerMode('type')", 'sb-input', 'checkWordgroup()', 'revealWordgroup()', () => ({ done: wgState.done, correct: wgState.correct, item: wgState.current.answer })],
    ['Diktat', "setAppView('listening');showListeningPanel('dictation');openDictation()", 'dictation-input', 'checkDictation()', 'revealDictation()', () => ({ done: dictState.done, correct: dictState.correct, item: dictState.current.ru })],
    ['Hörquiz Tippen', "setAppView('listening');showListeningPanel('hearquiz');setHearquizMode('type');restartHearquiz()", 'hq-input', 'checkHearquiz()', 'revealHearquiz()', () => ({ done: hqState.done, correct: hqState.correct, item: hqState.current && hqState.current.ru })],
  ];
  const findInput = (id) => document.getElementById(id) || (typeof wgEl === 'function' && id.endsWith('-input') && (id === 'wg-input' || id === 'sb-input') ? wgEl('input') : null) || document.querySelector('#hearquiz-input, #hq-answer-input');
  const answerOf = (name) => {
    if (name === 'Umformen') return transformState.queue[transformState.index].answer;
    if (name === 'Zahl+Subst') return numNounState.current.answer;
    if (name === 'Kasus bilden Subst.') return caseFormState.current.answer;
    if (name === 'Kasus bilden Adj.') return caseAdjState.current.answer;
    if (name === 'Pronomen umformen') return pronFormState.current.answer;
    if (name.startsWith('Wortgruppen') || name === 'Satzbau') return wgState.current.answer;
    if (name === 'Diktat') return dictState.current.ru;
    return null;
  };
  for (const [name, open, inId, chk, rev, st] of tools) {
    try {
      eval(open);
      const inp = findInput(inId);
      if (!inp) { out.push('?? ' + name + ': Eingabefeld ' + inId + ' nicht gefunden'); continue; }
      const s0 = st();
      inp.value = ''; eval(chk); const s1 = st();
      // Hörquiz Tippen (16.11., gewünscht): leeres Feld überspringt das Wort, ohne zu werten
      const leerSprung = /^Hörquiz Tippen/.test(name);
      const leer = leerSprung ? (s1.done === s0.done && s1.correct === s0.correct && s1.item !== s0.item ? 'leer: überspringt' : 'leer: ÄNDERT ' + JSON.stringify(s0) + '→' + JSON.stringify(s1))
        : JSON.stringify(s0) === JSON.stringify(s1) ? 'leer: nichts' : 'leer: ÄNDERT ' + JSON.stringify(s0) + '→' + JSON.stringify(s1);
      inp.value = 'qqq'; eval(chk); const s2 = st();
      const bewertet = s2.done !== s1.done || s2.item === s1.item ? 'falsch: bewertet' : 'falsch: ?';
      eval(chk); const s3 = st(); const weiter = s3.item !== s2.item ? '2. Druck: weiter' : '2. Druck: BLEIBT';
      // Korrigieren nach falsch: zählt es doppelt?
      const s4a = st(); inp.value = 'qqq'; eval(chk); const a = answerOf(name); let doppelt = 'n/a';
      if (a) { inp.value = a; eval(chk); const s4 = st(); doppelt = (s4.done - s4a.done) > 1 ? 'Korrektur zählt ERNEUT (done +' + (s4.done - s4a.done) + ')' : 'Korrektur: ok'; eval(chk); }
      // Lösung zeigen sperrt Bewertung
      const s5 = st(); eval(rev); const ans = inp.value; eval(chk); const s6 = st();
      const gesperrt = s6.correct > s5.correct ? 'Lösung zeigen: ZÄHLT ALS RICHTIG' : 'Lösung zeigen: gesperrt';
      out.push(name + ': ' + [leer, bewertet, weiter, doppelt, gesperrt].join(' | '));
    } catch (e) { out.push('XX ' + name + ': ' + e.message); }
  }
  return out.join('\n');
});
// Abdeckung: welche Werkzeuge prüft keine der Prüfen-Prüfungen?
  const cover = await p.evaluate(() => {
    // alle Aufgabenmotor-Konfigurationen (const …_DRILL = { p: … }) aus dem Skripttext, dazu Kasus bilden (cfDrill)
    const src = [...document.scripts].map(x => x.textContent).join('\n');
    const motor = [...src.matchAll(/const ([A-Z_]+_DRILL) = \{\s*p: '([a-z-]+)'/g)].map(m => m[2]);
    if (/function cfDrill\(/.test(src)) motor.push(cfDrill('noun').p, cfDrill('adj').p);
    const wahl = GT_CHOICES.map(c => c.panel.replace('overlay-', ''));
    const tabellen = ['conjugate', 'decline', 'noun', 'pronoun'];   // funktionen.js (gtool)
    const hier = ['wordgroup', 'sentencebuild', 'casedrill'];       // diese Datei
    const ids = { 'motion-pair': 'motion', cf: 'caseform', ca: 'caseadj' };
    const alle = new Set([...motor.map(x => ids[x] || x), ...wahl, ...tabellen, ...hier]);
    return GRAMMAR_PANELS.filter(n => !alle.has(n));
  });
  console.log('Werkzeuge ohne Prüfen-Prüfung:', cover.length ? cover.join(', ') : 'keine');
  console.log(r, errs);
  // Fehlschlag als Exit-Code melden (die Zeilen enthalten dann ÄNDERT, ?, BLEIBT, ERNEUT, ZÄHLT ALS RICHTIG, XX …)
  if (/ÄNDERT|: \?|BLEIBT|ERNEUT|ZÄHLT ALS RICHTIG|XX|FEHLER/.test(r) || cover.length || errs.length) process.exitCode = 1;
  await b.close(); })();
