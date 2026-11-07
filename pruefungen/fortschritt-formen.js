const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Fortschritt in allen Grammatikwerkzeugen (5.11.): jede richtige Antwort wird gespeichert und zählt;
// Konjugieren je Zeit (Gesamt = Verben mit Tabelle × 3; Futur übbar, zählt seit 7.11. nicht), Substantive je Zahl, Pronomen je Geschlecht,
// Präpositionen auch „Wort einsetzen“. Bisheriger Lernstand gilt für Präsens/Singular/m.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1');
    localStorage.setItem('vokabeltrainer-grammar-srs', JSON.stringify({ conj: { 'иметь': { correct: 1, wrong: 0, box: 1, lastSeen: Date.now() } } })); });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const calls = []; const orig = window.progressMark; window.progressMark = (k, id, ok) => { calls.push([k, ok]); return orig(k, id, ok); };
    const fill = () => document.querySelectorAll('.grammar-panel.open input[data-answer]').forEach(i => { if (i.offsetParent) i.value = i.dataset.answer.split(/\s*[\/|]\s*/)[0]; });
    const drill = c => { const t = c.task(); document.getElementById(c.p + '-input').value = gtAnswers(c, t)[0]; gtCheck(c); };
    const choice = c => gtChoose(c, c.right(c.item()));
    const T = [
      ['Konjugieren Präsens', () => { openConjugate(); document.getElementById('conj-verb-select').value = 'читать'; setConjTense('nonpast'); }, () => { fill(); checkConjugationTable(); }, 'conj'],
      ['Konjugieren Vergangenheit', () => setConjTense('past'), () => { fill(); checkConjugationTable(); }, 'conj:past'],
      ['Konjugieren Futur', () => setConjTense('future'), () => { fill(); checkConjugationTable(); }, 'conj:future'],
      ['Konjugieren Imperativ', () => setConjTense('imperative'), () => { fill(); checkConjugationTable(); }, 'conj:imperative'],
      ['Aspektpaare', () => { openAspect(); setAspectMode('practice'); setAspectDir('fwd'); }, () => drill(ASPECT_DRILL), 'aspect:fwd'],
      ['Bewegungsverben Partner', () => { openMotion(); setMotionMode('pair'); setMotionDir('fwd'); }, () => drill(MOTION_DRILL), 'motion:fwd'],
      ['Bewegungsverben Wahl', () => setMotionMode('quiz'), () => choice(MOTION_CHOICE), 'motion:quiz'],
      ['Umformen', () => openTransform(), () => drill(TRANSFORM_DRILL), 'transform'],
      ['Rektion Fall wählen', () => { openRektion(); setRektionMode('choose'); }, () => choice(RK_CHOICE), 'rektion'],
      ['Rektion Form bilden', () => setRektionMode('form'), () => drill(REKTION_DRILL), 'rektion'],
      ['Substantive Singular', () => { openNounDecline(); setNounNumber('sg'); }, () => { fill(); checkNounTable(); }, 'noun'],
      ['Substantive Plural', () => setNounNumber('pl'), () => { fill(); checkNounTable(); }, 'noun:pl'],
      ['Kasus bilden Subst.', () => openCaseForm('noun'), () => drill(cfDrill('noun')), 'caseform'],
      ['Zahl + Substantiv', () => openNumNoun(), () => drill(NUMNOUN_DRILL), 'numnoun'],
      ['Geschlecht', () => openGender(), () => choice(GENDER_CHOICE), 'gender'],
      ['Adjektive deklinieren', () => openDecline(), () => { fill(); checkDeclensionTable(); }, 'decl'],
      ['Kasus bilden Adj.', () => openCaseAdj(), () => drill(cfDrill('adj')), 'caseadj'],
      ['Kurzform & Steigerung', () => openAdjForm(), () => drill(ADJFORM_DRILL), 'adjform'],
      ['Pronomen мой m', () => { openPronoun(); document.getElementById('pronoun-select').value = 'мой'; setPronounGender('masc'); }, () => { fill(); checkPronounTable(); }, 'pronoun'],
      ['Pronomen мой f', () => setPronounGender('fem'), () => { fill(); checkPronounTable(); }, 'pronoun:fem'],
      ['Pronomen umformen', () => openPronForm(), () => drill(PRONFORM_DRILL), 'pronform'],
      ['Präpositionen Kasus wählen', () => { openCaseDrill(); setCaseMode('abstract'); }, () => choice(CASE_CHOICE), 'case'],
      ['Präpositionen Wort einsetzen', () => setCaseMode('word'), () => { document.getElementById('case-input').value = caseState.wordCurrent.answer; checkCaseWord(); }, 'case:word'],
      ['Wortgruppen', () => { openWordgroup(); setWgAnswerMode('type'); }, () => { wgEl('input').value = wgState.current.answer; checkWordgroup(); }, 'wordgroup'],
      ['Satzbau', () => { openSentenceBuild(); setWgAnswerMode('type'); }, () => { wgEl('input').value = wgState.current.answer; checkWordgroup(); }, 'sb:'],
    ];
    setAppView('grammar'); const out = [];
    for (const [name, setup, answer, key] of T) {
      setup(); await wait(40);
      const hdr = () => { const e = document.querySelector('.grammar-panel.open [id^="gtp-"]'); return e ? +e.textContent.split(' ')[0] : NaN; };
      const day = () => (loadDaylog()[dayKey()] || [0, 0])[1];
      const h0 = hdr(), d0 = day(), c0 = calls.length;
      answer(); await wait(20);
      const c = calls.slice(c0);
      const plus = key === 'conj:future' ? 0 : 1;   // Futur zählt nicht im Lernstand
      out.push({ name, ok: c.length === 1 && c[0][1] === true && c[0][0].startsWith(key) && hdr() === h0 + plus && day() === d0 + 1, info: JSON.stringify({ c, h0, h1: hdr() }) });
    }
    const all = loadGrammarSrs();
    const tot = { conj: document.getElementById('gtp-conj').textContent, verbs: Object.keys(conjugationData).length, noun: document.getElementById('gtp-noun').textContent, nouns: Object.keys(nounDeclensionData).length, nounT: nounTotal(), case: document.getElementById('gtp-case').textContent, prep: PREP_CASES.length };
    // Auswahlliste der Verben zeigt den Stand der gewählten Zeit
    setConjTense('nonpast'); openFormPicker('conj'); const pill = z => { const tr = [...document.querySelectorAll('#formpicker-body tr')].find(t => t.textContent.includes('иметь')); return tr ? tr.textContent : ''; };
    const praesens = /erledigt/.test(pill()); closeOverlay('overlay-formpicker'); setConjTense('past'); openFormPicker('conj'); const vergangen = /erledigt/.test(pill()); closeOverlay('overlay-formpicker');
    return { out, tot, praesens, vergangen, alt: !!(all.conj && all.conj['иметь']) };
  });
  r.out.forEach(x => ok(x.name + ': richtige Antwort gespeichert, Kopfzeile +1, Tagesprotokoll +1', x.ok, x.ok ? '' : x.info));
  ok('Gesamtzahlen: Konjugieren = Verben mit Tabelle × 3 (Futur zählt nicht), Substantive je vorhandener Zahl, Präpositionen × 2', r.tot.conj.endsWith('von ' + r.tot.verbs * 3 + ' gelernt') && r.tot.noun.endsWith('von ' + r.tot.nounT + ' gelernt') && r.tot.nounT === r.tot.nouns * 2 - 2 && r.tot.case.endsWith('von ' + r.tot.prep * 2 + ' gelernt'), JSON.stringify(r.tot));
  ok('bisheriger Lernstand bleibt (gilt fürs Präsens); Verbliste zeigt den Stand der gewählten Zeit', r.alt && r.praesens && !r.vergangen, JSON.stringify([r.alt, r.praesens, r.vergangen]));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
