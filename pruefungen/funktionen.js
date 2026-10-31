const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
// Funktionsprüfung im echten Browser (Chromium/Playwright)
const { chromium } = require('playwright');
const FILE = 'file://' + (process.argv[2] || APP_PATH);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => { if (d.type() === 'confirm') { d.accept(); return; } errs.push('DIALOG: ' + d.message().slice(0, 60)); d.dismiss(); });
  await p.addInitScript(() => {
    // Sprachausgabe nachbilden, damit alle Vorlese-Wege laufen
    const voices = [{ lang: 'ru-RU', name: 'RU' }, { lang: 'de-DE', name: 'DE' }];
    window.__spoken = [];
    const fake = {
      speaking: false, pending: false, paused: false,
      getVoices: () => voices, cancel() { this.speaking = false; }, pause() {}, resume() {},
      speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onend && u.onend(); }, 5); },
      addEventListener() {}, onvoiceschanged: null,
    };
    Object.defineProperty(window, 'speechSynthesis', { get: () => fake, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function (t) { this.text = t; }, configurable: true, writable: true });
  });
  await p.goto(FILE);
  await p.waitForTimeout(400);
  const results = [];
  const check = async (name, fn) => {
    const before = errs.length;
    let ok, info = '';
    try { const r = await fn(); ok = r === true || (r && r.ok); info = r && r.info ? r.info : (r === true ? '' : JSON.stringify(r)); }
    catch (e) { ok = false; info = e.message.split('\n')[0]; }
    if (errs.length > before) { ok = false; info += ' | Fehler: ' + errs.slice(before).join('; '); }
    results.push([ok ? 'OK ' : 'XX ', name, info]);
  };
  const ev = (f, a) => p.evaluate(f, a);

  // ── Vokabeln ──
  await check('V1 Karte wird angezeigt', () => ev(() => !!currentWord && document.getElementById('word-card').textContent.length > 0));
  await check('V2 richtige Antwort zählt, „offen" sinkt', () => ev(async () => {
    setAppView('vocab'); setMode('free'); setDirection('ru-de');
    const before = +document.getElementById('info-open').textContent;
    const w = currentWord; const s0 = (scores[getKey(w)] || {}).correct || 0;
    document.getElementById('answer-input').value = stripClarification(w.de[0]);
    await checkAnswer();
    const s1 = scores[getKey(w)].correct; const after = +document.getElementById('info-open').textContent;
    return { ok: s1 === s0 + 1 && after === before - 1, info: before + '→' + after };
  }));
  await check('V3 Weiter nach Antwort', () => ev(() => { const w = currentWord; nextWord(); return currentWord && currentWord !== w; }));
  await check('V4 falsche Antwort zählt als falsch', () => ev(async () => {
    const w = currentWord; const s0 = (scores[getKey(w)] || {}).wrong || 0;
    document.getElementById('answer-input').value = 'xyzxyzxyz'; await checkAnswer();
    return scores[getKey(w)].wrong === s0 + 1;
  }));
  await check('V5 Richtung DE→RU', () => ev(async () => {
    nextWord(); setDirection('de-ru'); const w = currentWord;
    // ganze Karte eintippen: bei Bewegungsverb-Paaren (идти / ходить) sind beide Verben gefragt
    document.getElementById('answer-input').value = w.ru; await checkAnswer();
    const ok = (scores[getKey(w)] || {}).correct >= 1; setDirection('ru-de'); return ok;
  }));
  await check('V6 Auswahl-Modus zeigt Optionen', () => ev(() => { setMode('mc'); const n = document.querySelectorAll('#mc-options button, .mc-option, .mc-btn').length; return { ok: n >= 4, info: n + ' Optionen' }; }));
  await check('V7 Aufdecken-Modus + Bewertung + Zurücknehmen', () => ev(() => {
    setMode('flip'); const w = currentWord; flipReveal(); flipJudge(true);
    const c = scores[getKey(w)].correct; undoFlip(); const c2 = (scores[getKey(w)] || {}).correct || 0;
    setMode('free'); return { ok: c2 === c - 1, info: c + '→' + c2 };
  }));
  await check('V8 Wortansicht öffnen', () => ev(() => { openWordDetail(currentWord); const o = document.getElementById('overlay-worddetail').classList.contains('open'); closeOverlay('overlay-worddetail'); return o; }));
  await check('V9 Merkliste umschalten', () => ev(() => { const w = currentWord.ru; const a = isBookmarked(w); toggleBookmark(w); const b2 = isBookmarked(w); toggleBookmark(w); return a !== b2; }));
  await check('V10 Einstellungen', () => ev(() => { openSettings(); const o = document.getElementById('overlay-settings').classList.contains('open'); closeOverlay('overlay-settings'); return o; }));
  await check('V11 Tastenkürzel-Übersicht (Bereich in den Einstellungen)', () => ev(() => { openShortcuts(); const o = document.getElementById('overlay-settings').classList.contains('open') && !!document.getElementById('set-sec-kuerzel').offsetParent; closeOverlay('overlay-settings'); return o; }));
  await check('V12 Vokabelliste', () => ev(() => { openVocabList(); const n = document.querySelectorAll('#overlay-vocab tr').length; closeOverlay('overlay-vocab'); return { ok: n > 5, info: n + ' Zeilen' }; }));
  await check('V13 Alphabet', () => ev(() => { openAlphabet(); const o = document.getElementById('overlay-alphabet').classList.contains('open'); closeOverlay('overlay-alphabet'); return o; }));
  await check('V14 Kategorieauswahl', () => ev(() => { openCategoryPicker(); const o = document.getElementById('overlay-categories').classList.contains('open'); closeOverlay('overlay-categories'); return o; }));
  await check('V15 Blockauswahl', () => ev(() => { try { openBlockPicker('Essen'); } catch (e) { return { ok: false, info: e.message }; } const o = document.getElementById('overlay-blocks').classList.contains('open'); closeOverlay('overlay-blocks'); return { ok: true, info: o ? 'offen' : 'bei „Alle" nicht verfügbar' }; }));
  await check('V16 Hell/Dunkel umschalten', () => ev(() => { const m0 = themeMode(), a = document.documentElement.getAttribute('data-theme'); setThemeMode(a === 'dark' ? 'light' : 'dark'); const b2 = document.documentElement.getAttribute('data-theme'); setThemeMode(m0); return a !== b2; }));
  await check('V17 Umschrift umschalten', () => ev(() => { toggleTranscription(); toggleTranscription(); return true; }));
  await check('V18 Runde/Sitzung', () => ev(() => { openSessionSummary(); const o = document.getElementById('overlay-session').classList.contains('open'); closeOverlay('overlay-session'); return o; }));
  await check('V19 Vorlesen', () => ev(() => { window.__spoken.length = 0; window.__dbg = [typeof currentWord, AUDIO_SUPPORTED]; speakCurrentWord(); return new Promise(r => setTimeout(() => r({ ok: window.__spoken.length > 0, info: String(window.__spoken[0]) + ' ' + JSON.stringify(window.__dbg) }), 400)); }));
  await check('V21 Stufenplan + Abschluss-Knopf', () => ev(() => { openLevelOverview(); const ok = !!document.querySelector('#lvl-plan .lvl-check') && /abschließen/.test(document.getElementById('lvl-plan').textContent); closeOverlay('overlay-levels'); return ok; }));
  await check('V22 Einstufungstest öffnet', () => ev(() => { openPlacement(); startPlacement(); const n = document.querySelectorAll('#placement-body .case-opt').length; closeOverlay('overlay-placement'); placeState = null; return { ok: n === 5, info: n + ' Knöpfe' }; }));
  await check('V23 Richtung hat eigenen Stand', () => ev(() => { const d = quizDirection; setDirection(d === 'ru-de' ? 'de-ru' : 'ru-de'); const ok = scoresDir === quizDirection; setDirection(d); return ok && scoresDir === d; }));
  await check('V20b „Alles gelernt“: Fortschritt zurücksetzen', () => ev(() => { const oc = window.confirm; window.confirm = () => true; const alt = JSON.stringify(scores);
    const k = getKey(currentWord); scores[k] = { correct: 3, wrong: 0, box: 5, due: Date.now() + 864e5, lastSeen: Date.now() }; saveScores(); lifeVocab(k, true, 5);
    showCaughtUp(getPool()); const sichtbar = getComputedStyle(document.getElementById('caught-up-reset')).display !== 'none';
    document.getElementById('caught-up-reset').click(); window.confirm = oc;
    const leer = Object.keys(scores).length === 0, ges = !!loadLifetime().v[k];
    Object.assign(scores, JSON.parse(alt)); saveScores(); nextWord();
    return { ok: sichtbar && leer && ges, info: 'Knopf=' + sichtbar + ' Übungsstand leer=' + leer + ' Gesamtstand da=' + ges }; }));
  await check('V20c Einstellungen: Gesamtstand löschen', () => ev(() => { const oc = window.confirm; window.confirm = () => true;
    const altL = JSON.stringify(loadLifetime()); lifeVocab('мама', true, 5); const vorher = Object.keys(loadLifetime().v).length;
    document.getElementById('lifetime-reset-btn').click(); window.confirm = oc;
    const nach = Object.keys(loadLifetime().v).length + Object.keys(loadLifetime().g).length;
    const gespeichert = JSON.parse(localStorage.getItem('vokabeltrainer-lifetime')).v;
    lifetime = JSON.parse(altL); saveLifetime();
    return { ok: vorher > 0 && nach === 0 && Object.keys(gespeichert).length === 0, info: vorher + ' → ' + nach }; }));
  await check('V20 Zurücksetzen mit einem Klick', () => ev(() => { const alt = JSON.stringify(scores), altG = JSON.stringify(grammarSrs); const k = getKey(currentWord); scores[k] = { correct: 1, wrong: 0, box: 3, due: Date.now() + 864e5, lastSeen: Date.now() }; saveScores(); progressMark('gender', 'дом', true);
    document.querySelector('.tool-btn-reset').click(); const leer = Object.keys(scores).length === 0 && Object.keys(grammarSrs).length === 0; const fenster = !!document.querySelector('.overlay.open');
    Object.assign(scores, JSON.parse(alt)); saveScores(); grammarSrs = JSON.parse(altG); saveGrammarSrs(); nextWord();
    return { ok: leer && !fenster, info: 'leer=' + leer + ' Fenster=' + fenster }; }));
  await check('V21 Sicherung exportieren', async () => {
    // V18/V20 setzen zurück und stellen den alten Stand wieder her – die dabei gemerkten Zeitpunkte
    // würden den wiederhergestellten Stand beim Einlesen ausfiltern, daher hier entfernen
    await ev(() => localStorage.removeItem('vokabeltrainer-reset-marks'));
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 3000 }), ev(() => exportBackup())]);
    const path = await dl.path(); const txt = require('fs').readFileSync(path, 'utf8'); const d = JSON.parse(txt);
    global.__backup = txt; return { ok: !!d && (d.app || d.appId), info: dl.suggestedFilename() };
  });

  // ── Grammatik ──
  const gtool = async (name, open, panel, reveal, checkFn, next) => {
    await check('G ' + name, () => ev(([open, panel, reveal, checkFn, next]) => {
      setAppView('grammar'); eval(open);
      const vis = document.getElementById(panel).classList.contains('open');
      if (reveal) eval(reveal); if (checkFn) eval(checkFn); if (next) eval(next);
      return { ok: vis, info: vis ? '' : 'Panel nicht offen' };
    }, [open, panel, reveal, checkFn, next]));
  };
  await check('G Oberkategorien', () => ev(() => {
    setAppView('grammar'); const exp = { verb: 5, noun: 4, adj: 3, pron: 2, prep: 0, syntax: 2 }; const bad = [];
    Object.keys(exp).forEach(c => { openGrammarCategory(c);
      const vis = [...document.querySelectorAll('#grammar-nav .grammar-chip')].filter(b => b.offsetParent !== null).length;
      const act = document.querySelector('#grammar-cats .grammar-chip.active');
      const open = document.querySelector('#grammar-view .grammar-panel.open');
      const prog = open && open.querySelector('.grammar-panel-progress');
      if (vis !== exp[c] || !act || act.id !== 'gcat-' + c || !open || !prog || !prog.textContent) bad.push(c + ':' + vis); });
    const n = document.querySelectorAll('#grammar-nav .grammar-chip').length;
    openPronForm(); openGrammarCategory('verb'); openGrammarCategory('pron');
    const keep = document.getElementById('overlay-pronform').classList.contains('open');
    return { ok: !bad.length && n === 17 && keep && !document.getElementById('gchip-overview'), info: bad.join(',') + ' Werkzeuge ' + n + (keep ? '' : ' letztes Werkzeug vergessen') };
  }));
  await gtool('Konjugieren', "openConjugate()", 'overlay-conjugate', 'revealConjugationTable()', 'checkConjugationTable()', 'nextConjugationVerb()');
  await check('G Konjugieren: richtige Tabelle = alles richtig', () => ev(() => {
    openConjugate(); setConjTense('nonpast');
    const inputs = [...document.querySelectorAll('#overlay-conjugate input.conj-input')];
    inputs.forEach(i => { i.value = i.dataset.answer; }); checkConjugationTable();
    const ok = inputs.every(i => i.classList.contains('correct')); return { ok, info: inputs.length + ' Felder' };
  }));
  await check('G Konjugieren: alle Zeiten', () => ev(() => { ['nonpast', 'past', 'future', 'imperative'].forEach(t => { setConjTense(t); renderConjugationTable(); }); setConjTense('nonpast'); return true; }));
  await gtool('Aspektpaare', "openAspect()", 'overlay-aspect', 'revealAspect()', 'checkAspect()', 'nextAspect()');
  await check('G Aspekt Liste/Rückrichtung', () => ev(() => { setAspectMode('list'); setAspectMode('practice'); setAspectDir('back'); restartAspect(); setAspectDir('fwd'); return true; }));
  await gtool('Bewegung Partner', "openMotion(); setMotionMode('pair')", 'overlay-motion', 'revealMotionPair()', 'checkMotionPair()', 'nextMotionPair()');
  await check('G Bewegung Wahl + Liste', () => ev(() => { setMotionMode('quiz'); restartMotionQuiz(); const btn = document.querySelector('#overlay-motion button[onclick^="answerMotionQuiz"]'); if (btn) btn.click(); setMotionMode('list'); setMotionMode('pair'); return true; }));
  await gtool('Umformen', "openTransform()", 'overlay-transform', 'revealTransform()', 'checkTransform()', 'nextTransform()');
  await gtool('Substantive', "openNounDecline()", 'overlay-noun', 'revealNounTable()', 'checkNounTable()', 'nextNounItem()');
  await check('G Substantive Plural', () => ev(() => { setNounNumber('pl'); renderNounTable(); setNounNumber('sg'); return true; }));
  await gtool('Adjektive', "openDecline()", 'overlay-decline', 'revealDeclensionTable()', 'checkDeclensionTable()', 'nextDeclensionAdj()');
  await gtool('Kasus-Drill', "openCaseDrill()", 'overlay-casedrill', null, null, null);
  await check('G Kasus-Drill Antwort', () => ev(() => { const btn = document.querySelector('#overlay-casedrill button[onclick^="answerCaseDrill"]'); if (!btn) return { ok: false, info: 'kein Antwortknopf' }; btn.click(); setCaseMode('word'); revealCaseWord(); checkCaseWord(); setCaseMode('abstract'); return true; }));
  await gtool('Pronomen', "openPronoun()", 'overlay-pronoun', 'revealPronounTable()', 'checkPronounTable()', null);
  await check('G Pronomen Possessiv + Genus', () => ev(() => { chooseFormPickerItem ? 0 : 0; ['masc', 'fem', 'neut', 'plural'].forEach(g => setPronounGender(g)); return true; }));
  await gtool('Zahl + Substantiv', "openNumNoun()", 'overlay-numnoun', 'revealNumNoun()', 'checkNumNoun()', 'nextNumNoun()');
  await gtool('Kasus bilden: Substantive', "openCaseForm('noun')", 'overlay-caseform', "revealCaseForm('noun')", "checkCaseForm('noun')", "nextCaseForm('noun')");
  await gtool('Kasus bilden: Adjektive', "openCaseAdj()", 'overlay-caseadj', "revealCaseForm('adj')", "checkCaseForm('adj')", "nextCaseForm('adj')");
  await check('G Kasus Adjektive: Genus/Zahl/Fall + richtige Antwort', () => ev(() => { setCaseFormGenus('fem'); setCaseFormNumber('sg', 'adj'); setCaseFormCase('Gen.', 'adj'); const t = caseAdjState.current; const inp = document.getElementById('caseadj-input'); inp.value = t.answer; checkCaseForm('adj'); const ok = caseAdjState.correct === 1 && /weiblich/.test(t.frage) && /Genitiv/.test(t.frage); setCaseFormGenus('all'); setCaseFormNumber('mixed', 'adj'); setCaseFormCase('all', 'adj'); return { ok, info: t.word + ' → ' + t.answer }; }));
  await gtool('Pronomen umformen', "openPronForm()", 'overlay-pronform', 'revealPronForm()', 'checkPronForm()', 'nextPronForm()');
  await check('G Pronomen umformen: alle Typen + richtige Antwort', () => ev(() => { const r = []; ['case', 'prep', 'poss', 'all'].forEach(sc => { setPronFormScope(sc); const t = pronFormState.current; const inp = document.getElementById('pronform-input'); const c0 = pronFormState.correct; inp.value = t.answer; checkPronForm(); r.push(pronFormState.correct === c0 + 1); checkPronForm(); }); togglePronFormHint(); togglePronFormHint(); return { ok: r.every(Boolean), info: r.join(',') }; }));
  await gtool('Wortgruppen', "openWordgroup()", 'overlay-wordgroup', 'revealWordgroup()', 'checkWordgroup()', 'nextWordgroup()');
  await check('G Wortgruppen alle Typen + Bausteine', () => ev(() => { ['adjnoun', 'detnoun', 'numadjnoun', 'prepphrase'].forEach(t => { setWgType(t); restartWordgroup(); }); setWgAnswerMode('click'); restartWordgroup(); setWgAnswerMode('type'); return true; }));
  await gtool('Satzbau', "openSentenceBuild()", 'overlay-sentencebuild', 'revealWordgroup()', 'checkWordgroup()', 'nextWordgroup()');
  await check('G Satzbau alle Typen/Zeiten/Hilfen', () => ev(() => { WG_SENTENCE_TYPES.forEach(t => { setWgType(t); ['present', 'past', 'future'].forEach(z => { setWgTense(z); restartWordgroup(); }); }); setSbHelp('gap'); setSbHelp('free'); setSbHelp('free'); revealWordgroupStep(); return true; }));
  await check('G Satzbau richtige Antwort', () => ev(() => { setWgType('sentence'); restartWordgroup(); const inp = wgEl('input'); inp.value = wgState.current.answer; checkWordgroup(); return wgState.lastCorrect === true; }));
  await check('G Gerüst: ⋯-Menü, Infotext gemerkt, Enter in Tabellen, Fall-Knöpfe', () => ev(() => {
    const r = [];
    setAppView('grammar'); openTransform();
    const mb = document.querySelector('#overlay-transform .gt-more-btn'); mb.click();
    const auf = document.querySelector('#overlay-transform .gt-more').classList.contains('open');
    document.body.click();
    const zu = !document.querySelector('#overlay-transform .gt-more').classList.contains('open');
    if (!auf || !zu) r.push('Menü');
    const ib = document.querySelector('#overlay-transform .conj-info-btn'); ib.click();
    return new Promise(res => setTimeout(() => {
      openPronForm(); openTransform();
      const offen = document.getElementById('transform-info-panel').style.display !== 'none';
      document.querySelector('#transform-info-panel .gt-info-close').click();
      setTimeout(() => {
        openPronForm(); openTransform();
        const zu2 = document.getElementById('transform-info-panel').style.display === 'none';
        if (!offen || !zu2) r.push('Info ' + offen + '/' + zu2);
        openNounDecline();
        const ins = [...document.querySelectorAll('#noun-grid input.conj-input')];
        ins[0].focus(); ins[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        if (document.activeElement !== ins[1]) r.push('Enter');
        openCaseForm('noun');
        document.querySelector('#cf-case-switcher [data-v="Dat."]').click();
        if (caseFormState.kasus !== 'Dat.' || !document.querySelector('#cf-case-switcher [data-v="Dat."]').classList.contains('active')) r.push('Fall');
        document.querySelector('#cf-case-switcher [data-v="all"]').click();
        res({ ok: !r.length, info: r.join(', ') });
      }, 20);
    }, 20));
  }));
  await check('G Tabellen: zweites Prüfen ohne Änderung weiter, Aufgedecktes zählt nicht', () => ev(() => {
    setAppView('grammar'); openNounDecline();
    const sel = document.getElementById('noun-select'); const v0 = sel.value;
    document.querySelectorAll('#noun-grid input.conj-input').forEach(i => i.value = 'xx'); checkNounTable(); const bleibt = sel.value === v0;
    checkNounTable(); const weiter = sel.value !== v0;
    const c = nounState.correct; revealNounTable(); const v1 = sel.value; checkNounTable();
    const ok = bleibt && weiter && sel.value !== v1 && nounState.correct === c && BACKUP_KEYS.includes('vokabeltrainer-grammar-cat-last');
    return { ok, info: [bleibt, weiter, sel.value !== v1, nounState.correct === c].join(' ') };
  }));
  await check('G Kurzform & Steigerung + neue Pronomen', () => ev(() => {
    setAppView('grammar'); openAdjForm(); const r = [];
    const t = adjFormState.current; const inp = document.getElementById('adjform-input');
    inp.value = t.answer; checkAdjForm(); if (adjFormState.correct !== 1) r.push('richtig');
    const id1 = adjFormState.current.id; checkAdjForm(); if (adjFormState.current.id === id1 && adjFormTotal() > 1) r.push('weiter');
    setAdjFormScope('comp'); if (adjFormState.current.typ !== 'comp') r.push('Umfang');
    openPronoun(); document.getElementById('pronoun-select').value = 'себя'; renderPronounTable();
    if (document.querySelectorAll('#pronoun-grid input.conj-input').length !== 5) r.push('себя');
    document.getElementById('pronoun-select').value = 'весь'; renderPronounTable();
    if (document.getElementById('pronoun-gender-switcher').style.display === 'none') r.push('весь');
    openPronForm(); setPronFormScope('extra'); if (pronFormState.current.typ !== 'extra') r.push('extra');
    setPronFormScope('all'); setAdjFormScope('all');
    return { ok: !r.length, info: r.join(', ') };
  }));
  await check('G Rektion + Satzarten', () => ev(() => {
    setAppView('grammar'); const r = [];
    openRektion(); setRektionMode('choose'); const v = rektionState.current.verb.r; answerRektion(v);
    if (rektionState.correct !== 1) r.push('wählen');
    setRektionMode('form'); document.getElementById('rektion-input').value = rektionState.current.answer; checkRektion();
    if (!rektionState.lastCorrect) r.push('bilden');
    setRektionMode('choose');
    openSentenceBuild(); setWgType('imperative'); if (!wgState.current || !wgState.current.answer) r.push('Aufforderung');
    setWgType('negation'); setWgTense('future'); let allg = 0;
    for (let k = 0; k < 40; k++) { if (!wgState.current.answer.startsWith('У ')) allg++; nextWordgroup(); }
    if (!allg) r.push('Verneinung allgemein');
    setWgTense('present'); setWgType('sentence');
    return { ok: !r.length, info: r.join(', ') };
  }));
  await check('G Aufgabenmotor (9 Einzelfeld-Werkzeuge)', () => ev(() => {
    setAppView('grammar'); const bad = [];
    [['openAspect()', ASPECT_DRILL], ['openMotion();setMotionMode("pair")', MOTION_DRILL], ['openTransform()', TRANSFORM_DRILL],
     ['openNumNoun()', NUMNOUN_DRILL], ['openCaseForm("noun")', cfDrill('noun')], ['openCaseAdj()', cfDrill('adj')],
     ['openPronForm()', PRONFORM_DRILL], ['openAdjForm()', ADJFORM_DRILL], ['openRektion();setRektionMode("form")', REKTION_DRILL]].forEach(([o, c]) => {
      eval(o); const inp = document.getElementById(c.p + '-input'); const t = c.task();
      inp.value = 'qqq'; gtCheck(c); const falsch = c.st.answered && !c.st.lastCorrect; gtCheck(c);
      if (!falsch || c.task() === t) bad.push(c.p);
    });
    setRektionMode('choose');
    return { ok: !bad.length, info: bad.join(',') };
  }));
  await check('G Geschlecht', () => ev(() => {
    setAppView('grammar'); openGender(); const r = [];
    const it = genderState.queue[0]; answerGender(it.g); clearTimeout(genderState.timer);
    if (genderState.correct !== 1) r.push('richtig');
    nextGender(); if (genderState.index !== 1) r.push('weiter');
    if (genderOf('тетрадь').g !== 'f' || genderOf('учитель').g !== 'm' || genderOf('время').g !== 'n' || genderOf('папа').g !== 'm' || genderOf('деньги').g !== 'pl') r.push('Regeln');
    return { ok: !r.length && genderTotal() > 1500, info: r.join(', ') + ' ' + genderTotal() };
  }));
  await check('G Wahlmotor (4 Auswahl-Werkzeuge)', () => ev(() => {
    setAppView('grammar'); const bad = [];
    [['openCaseDrill();setCaseMode("abstract")', CASE_CHOICE], ['openMotion();setMotionMode("quiz")', MOTION_CHOICE],
     ['openRektion();setRektionMode("choose")', RK_CHOICE], ['openGender()', GENDER_CHOICE]].forEach(([o, c]) => {
      eval(o); const it = c.item();
      const wrong = [...document.querySelectorAll('#' + c.opts + ' .case-opt')].map(b => b.dataset.k).find(k => k !== c.right(it));
      gtChoose(c, wrong);
      const marked = document.querySelector('#' + c.opts + ' .correct') && document.querySelector('#' + c.opts + ' .wrong');
      if (!c.answered || !marked) bad.push(c.panel);
      gtChoiceNext(c); if (c.answered || c.item() === it) bad.push(c.panel + ' weiter');
    });
    setRektionMode('choose'); setMotionMode('pair');
    return { ok: !bad.length, info: bad.join(',') };
  }));
  await check('G Alle Knopf-Handler vorhanden', () => ev(() => {
    const html = document.documentElement.outerHTML; const miss = new Set();
    for (const m of html.matchAll(/on(?:click|change|input|keydown)="([^"]*)"/g))
      for (const f of m[1].matchAll(/(?:^|[;\s(!])([A-Za-z_$][\w$]*)\(/g))
        if (!['if', 'return', 'function'].includes(f[1]) && typeof window[f[1]] !== 'function') miss.add(f[1]);
    return { ok: !miss.size, info: [...miss].join(',') };
  }));
  await check('G Satzbau: weibliche Form bei я/ты', () => ev(() => {
    setAppView('grammar'); openSentenceBuild(); setWgAnswerMode('type'); setWgType('sentence'); setWgTense('past');
    for (let k = 0; k < 300 && !/^(я|ты) /.test(wgState.current.answer); k++) nextWordgroup();
    const c = wgState.current; document.getElementById('sb-input').value = (c.femAnswers || [])[0] || ''; checkWordgroup();
    const ok = wgState.lastCorrect; setWgTense('present');
    return { ok, info: c.answer };
  }));
  await check('G Wortgruppen: nur passende Paare', () => ev(() => {
    setAppView('grammar'); openWordgroup(); const bad = [];
    ['adjnoun', 'numadjnoun', 'prepphrase'].forEach(t => { setWgType(t);
      for (let i = 0; i < 40; i++) { const m = wgState.current.promptTop.match(/([а-яё]+) ([а-яё]+)$/); if (m && !wgFits(m[1], m[2])) bad.push(m[0]); nextWordgroup(); } });
    setWgType('adjnoun');
    return { ok: !bad.length, info: bad.slice(0, 5).join(', ') };
  }));
  await check('Vokabelliste wird beim Schließen geleert', async () => {
    const r = await ev(async () => { setAppView('vocab'); openVocabList(); const voll = document.getElementById('vocab-table-body').children.length;
      document.getElementById('overlay-vocab').classList.remove('open'); await new Promise(r => setTimeout(r, 20));
      return { ok: voll > 0 && document.getElementById('vocab-table-body').children.length === 0, info: voll + ' Zeilen' }; });
    return r;
  });
  await check('G Satzbau: falsches Pronomen ist kein Tippfehler', () => ev(() => {
    setAppView('grammar'); openSentenceBuild(); setWgAnswerMode('type'); setWgType('sentence'); setWgTense('present');
    for (let k = 0; k < 300 && !/^я /.test(wgState.current.answer); k++) nextWordgroup();
    document.getElementById('sb-input').value = 'он ' + wgState.current.answer.slice(2); checkWordgroup();
    return { ok: !wgState.lastCorrect, info: wgState.current.answer };
  }));
  await check('G Tippfehler nur im Wortstamm', () => ev(() => {
    const falsch = [['книге', 'книги'], ['к ему', 'к нему'], ['вам', 'нам'], ['новой книгу', 'новую книгу']].filter(([u, a]) => gramMatch(u, a).ok);
    const tipp = [['новую кникгу', 'новую книгу'], ['будут роботать', 'будут работать']].filter(([u, a]) => !gramMatch(u, a).typo);
    return { ok: !falsch.length && !tipp.length, info: falsch.concat(tipp).map(x => x[0]).join(', ') };
  }));
  await check('Sprachniveaus: Filter, Reihenfolge, Abzeichen, Übersicht', () => ev(() => {
    const r = []; setAppView('vocab'); selectMainCat('all');
    if (allVocabWords().some(w => !wordLevel(w))) r.push('Wort ohne Stufe');
    setMaxLevel('A2'); if (!getPool().every(w => levelIdx(wordLevel(w)) <= 1)) r.push('Filter');
    setMaxLevel(''); levelOrder = true; const w = pickNextWord(); if (w && !hasCorrectAnswer(w) && wordLevel(w) !== 'A1') r.push('Reihenfolge');
    levelOrder = false;
    setMyLevel('A1'); if (!document.getElementById('gchip-aspect').classList.contains('lvl-above')) r.push('Markierung'); setMyLevel('');
    openLevelOverview(); if (!/A1/.test(document.getElementById('level-overview-body').textContent)) r.push('Übersicht'); closeOverlay('overlay-levels');
    return { ok: !r.length, info: r.join(', ') };
  }));
  await check('Zurücksetzen behält den Gesamtstand', () => ev(() => {
    setAppView('vocab'); const w = getPool()[0]; updateScore(w, true); updateScore(w, true);
    const vor = (loadLifetime().v[getKey(w)] || {}).c || 0;
    const c0 = window.confirm; window.confirm = () => true; doResetProgress('vocab'); window.confirm = c0;
    const nach = (loadLifetime().v[getKey(w)] || {}).c || 0;
    return { ok: vor >= 2 && nach === vor && !hasCorrectAnswer(w), info: vor + ' → ' + nach };
  }));
  await check('G Fortschritt in der Kopfzeile aktualisiert', () => ev(() => { updateGrammarTileProgress(); return [...document.querySelectorAll('.grammar-panel-progress')].some(e => e.textContent.trim()); }));
  await check('G Formenauswahl (Verbliste)', () => ev(() => { openConjugate(); openFormPicker('conj'); const n = document.querySelectorAll('#overlay-formpicker tr, #overlay-formpicker .fp-row, #overlay-formpicker li').length; cycleFormPickerSort(); closeOverlay('overlay-formpicker'); return { ok: n > 10, info: n + ' Einträge' }; }));

  // ── Hörverstehen ──
  await check('H Hörtrainer starten/stoppen', () => ev(() => new Promise(res => { setAppView('listening'); showListeningPanel('hoertrainer'); setAllHoertrainerCatCheckboxes(true); window.__spoken.length = 0; startHoertrainer(); setTimeout(() => { const n = window.__spoken.length; stopHoertrainer(); res({ ok: n > 0, info: n + ' gesprochen' }); }, 900); })));
  await check('H Hörtrainer-Auswahl (Chips, Klappgruppen, Suche, Übernahme)', () => ev(() => {
    setAppView('listening'); showListeningPanel('hoertrainer'); setAllHoertrainerCatCheckboxes(false);
    const body = document.getElementById('hoertrainer-cat-body'); const dis = document.getElementById('ht-play-btn').disabled;
    body.querySelector('input[data-cat="Familie"]').click(); const chips = document.querySelectorAll('.ht-chip').length;
    document.querySelector('.ht-chip').click(); const leer = !document.querySelectorAll('.ht-chip').length;
    document.getElementById('ht-cat-search').value = 'tiere'; filterHoertrainerCats();
    const treffer = [...body.querySelectorAll('.cat-check-row')].filter(r => r.offsetParent).length;
    document.getElementById('ht-cat-search').value = ''; filterHoertrainerCats();
    const ws = [activeMain, selectedCats]; activeMain = 'multi'; selectedCats = new Set(['Essen']); takeHoertrainerCatsFromVocab();
    const ueb = [...htState.selectedCats].join(); activeMain = ws[0]; selectedCats = ws[1];
    setAllHoertrainerCatCheckboxes(true);
    return { ok: dis && chips === 1 && leer && treffer >= 1 && ueb === 'Essen', info: [dis, chips, leer, treffer, ueb].join(' ') };
  }));
  await check('H Hörtrainer stoppt beim Ansichtswechsel', () => ev(() => new Promise(res => { startHoertrainer(); setTimeout(() => { setAppView('vocab'); const pl = htState.playing; window.__spoken.length = 0; setTimeout(() => res({ ok: !pl && window.__spoken.length === 0, info: 'playing=' + pl + ', danach gesprochen=' + window.__spoken.length }), 600); }, 200); })));
  await check('H Satzdiktat richtig/falsch', () => ev(() => { setAppView('listening'); showListeningPanel('dictation'); openDictation(); const inp = document.getElementById('dictation-input'); inp.value = dictState.current.ru; checkDictation(); const c1 = dictState.correct; restartDictation(); inp.value = 'нет'; checkDictation(); return { ok: c1 === 1, info: 'richtig=' + dictState.correct + ' von ' + dictState.done }; }));
  await check('H Hörquiz Tippen', () => ev(() => { showListeningPanel('hearquiz'); setHearquizMode('type'); setHearquizLang('ru'); restartHearquiz(); revealHearquiz(); return true; }));
  await check('H Hörquiz Auswahl', () => ev(() => { setHearquizMode('choice'); restartHearquiz(); const b2 = document.querySelector('#listening-hearquiz [onclick^="answerHearquizChoice"]'); if (b2) b2.click(); return !!b2; }));
  await check('H Hörquiz Aufdecken + Zurücknehmen', () => ev(() => { setHearquizMode('flip'); restartHearquiz(); revealHearquizFlip(); rateHearquiz(true); undoHearquizRate(); openHearquizSession(); closeOverlay('overlay-hq-session'); setHearquizMode('type'); return true; }));
  await check('H Hörquiz DE', () => ev(() => { setHearquizLang('de'); restartHearquiz(); setHearquizLang('ru'); return true; }));

  // ── Sicherung einlesen ──
  await check('S Sicherung einlesen', async () => {
    const fs = require('fs'); fs.writeFileSync(require('path').join(TMP, 'backup-test.json'), global.__backup);
    // Zeitpunkte früherer Zurücksetz-Prüfungen entfernen – hier geht es nur ums Einlesen selbst
    // (dass Zurückgesetztes nicht zurückkommt, prüft zuruecksetzen-geraete.js)
    await ev(() => { localStorage.setItem('vokabeltrainer-scores', '{}'); localStorage.removeItem('vokabeltrainer-reset-marks'); });
    const input = await p.$('input[type=file]');
    if (!input) return { ok: false, info: 'kein Datei-Eingabefeld' };
    await input.setInputFiles(require('path').join(TMP, 'backup-test.json'));
    await p.waitForTimeout(600);
    const n = await ev(() => Object.keys(JSON.parse(localStorage.getItem('vokabeltrainer-scores') || '{}')).length);
    return { ok: n > 0, info: n + ' Einträge zurück' };
  });
  await check('S Neuladen behält Einstellungen', async () => {
    await ev(() => { setAppView('grammar'); showGrammarPanel('noun'); });
    await p.reload(); await p.waitForTimeout(500);
    // startet auf „Heute“, „Weiterlernen“ führt zurück ins zuletzt benutzte Werkzeug
    return ev(() => { const start = appView; homeContinue(); return { ok: start === 'home' && appView === 'grammar' && document.getElementById('overlay-noun').classList.contains('open'), info: start + ' → ' + appView }; });
  });

  results.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + results.filter(r => r[0] === 'OK ').length + ' von ' + results.length + ' bestanden');
  await b.close();
})();
