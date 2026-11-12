const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Zählung des Lernfortschritts (Prüfung 12.11.): was zählt und was nicht
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, hdr = id => { updateGrammarTileProgress(); return document.getElementById(id).textContent; };
    const src = () => grammarToolSources();
    setAppView('grammar');
    // 1 Zahl + Substantiv: „1“ zählt nicht
    progressMark('numnoun', 'стол:' + NN_WHY.r1, true); out.nn1 = hdr('gtp-numnoun');
    progressMark('numnoun', 'стол:' + NN_WHY.r24, true); out.nn2 = hdr('gtp-numnoun'); out.nnT = numNounNouns().length * 3;
    // 2/6 Kasus bilden Adjektive
    const A = Object.keys(declensionData).length; out.caT = [caseFormTotal('adj'), A * 24];
    progressMark('caseadj', 'a:новый:masc:Nom.', true); progressMark('caseadj', 'a:новый:masc:Akk.', true); out.ca0 = hdr('gtp-caseadj');
    progressMark('caseadj', 'a:новый:masc:Akk.:belebt', true); progressMark('caseadj', 'a:молодой:fem:Gen.', true); out.ca2 = hdr('gtp-caseadj');
    openCaseAdj(); let trivial = 0, oj = 0;
    for (let i = 0; i < 6000; i++) { const t = buildCaseFormTask('adj'); if (!t) continue; if (t.gk === 'masc' && t.answer === t.word) trivial++; if (t.gk !== 'masc' && t.answer === t.word) oj++; }
    out.caFrage = [trivial, oj];
    // 3 Rektion: Form bilden je Verb
    const rf = rektionItems('form'), v0 = rf[0].verb, gleiche = rf.filter(x => x.verb === v0);
    out.rkT = [rektionTotal(), rektionItems('choose').length + new Set(rf.map(x => rkVerbId(x.verb))).size];
    gleiche.forEach(x => progressMark('rektion', x.id, true)); out.rk = [gleiche.length, hdr('gtp-rektion')];
    // 4 Konjugieren: vollendete Tabelle eigener Eintrag
    const pfV = conjPfVerben()[0], pfInf = aspectData[pfV].pf;
    openConjugate(); document.getElementById('conj-verb-select').value = pfV; setConjTense('nonpast'); setConjAspect('pf');
    document.querySelectorAll('#conj-grid input').forEach(i => i.value = i.dataset.answer.split(/\s*[\/|]\s*/)[0]); checkConjugationTable();
    const g = loadGrammarSrs(); out.pf = [!!(g.conj || {})[pfInf], !!(g.conj || {})[pfV], conjTotal() === (Object.keys(conjugationData).length + conjPfVerben().length) * 3];
    setConjAspect('ipf');
    // 5 Kasus bilden Substantive: Akk. = Nom. gefragt und gezählt, Nom. Sg. nicht
    out.cf = [cfZaehlt('n:стол:sg:Akk.'), cfZaehlt('n:стол:sg:Nom.'), cfZaehlt('n:деньги:pl:Nom.'), cfNounPool(caseFormState).some(x => x[0] === 'стол' && x[1] === 'sg' && x[2] === 'Akk.'), cfNounPool(caseFormState).length === caseFormTotal('noun')];
    // 7 Umformen: Vergangenheit je Form
    const past = buildTransformItems().filter(t => t.kind === 'past' && t.inf === 'читать');
    out.tf = past.map(transformUnitId).join('|');
    // 8 Wortgruppen: erst nach 3 verschiedenen richtigen Antworten
    openWordgroup(); setWgAnswerMode('type'); setWgType('adjnoun'); out.wg = [];
    const key = () => wgState.current.srsKey;
    let k = null, n = 0; const gesehen = new Set();
    for (let i = 0; i < 400 && n < 3; i++) { restartWordgroup(); if (k && key() !== k) continue; if (gesehen.has(wgState.current.answer)) continue; k = key(); gesehen.add(wgState.current.answer);
      wgEl('input').value = wgState.current.answer; checkWordgroup(); n++; out.wg.push(hdr('gtp-wordgroup')); }
    const e = loadGrammarSrs().wordgroup[k]; out.wgW = e.w.length;
    // gleiche Antwort dreimal zählt nicht
    const e2 = { correct: 3, w: ['a'] }; out.wgGleich = wgZaehlt('x', e2);
    // 9 Adjektiv-Deklination je Geschlecht
    openDecline(); document.getElementById('decl-adj-select').value = 'новый'; setDeclGender('fem');
    document.querySelectorAll('#decl-grid input').forEach(i => i.value = i.dataset.answer.split(/\s*[\/|]\s*/)[0]); checkDeclensionTable();
    const g2 = loadGrammarSrs(); out.decl = [!!(g2['decl:fem'] || {})['новый'], !!(g2.decl || {})['новый'], hdr('gtp-decl'), A * 4];
    setDeclGender('masc');
    // Quellen stimmen mit den Kopfzeilen überein
    const s = src(); out.quelle = [s.numnoun[1], s.caseadj[1], s.rektion[1], s.decline[1], s.conjugate[1]];
    out.kopf = ['gtp-numnoun', 'gtp-caseadj', 'gtp-rektion', 'gtp-decl', 'gtp-conj'].map(id => +/von (\d+)/.exec(hdr(id))[1]);
    return out;
  });
  ok('Zahl + Substantiv: Regelfall „1“ zählt nicht, 2–4 zählt; Gesamt = Wörter × 3', /^0 von/.test(r.nn1) && r.nn2 === '1 von ' + r.nnT + ' gelernt', r.nn1 + ' / ' + r.nn2);
  ok('Kasus bilden Adjektive: Gesamt = Adjektive × 24; Nom. m und Akk. m (Ding) zählen nicht', r.caT[0] === r.caT[1] && /^0 von/.test(r.ca0) && /^2 von/.test(r.ca2), JSON.stringify([r.caT, r.ca0, r.ca2]));
  ok('Kasus bilden Adjektive: bei „Alle“ keine Grundform m, aber молодой (f) wird gefragt', r.caFrage[0] === 0 && r.caFrage[1] > 0, JSON.stringify(r.caFrage));
  ok('Rektion: Form bilden zählt je Verb einmal', r.rkT[0] === r.rkT[1] && r.rk[0] > 1 && /^1 von/.test(r.rk[1]), JSON.stringify([r.rkT, r.rk]));
  ok('Konjugieren: vollendete Tabelle unter eigenem Eintrag, Gesamtzahl mit vollendeten', r.pf[0] && !r.pf[1] && r.pf[2], JSON.stringify(r.pf));
  ok('Kasus bilden Substantive: Akk. = Nom. gefragt und gezählt, Grundform nicht', r.cf.join() === 'true,false,false,true,true', r.cf.join());
  ok('Umformen: Vergangenheit je Form (он alte Kennung)', r.tf === 'past:читать|past:читать:она|past:читать:они', r.tf);
  ok('Wortgruppen: Kategorie erst nach 3 verschiedenen richtigen Antworten gelernt', r.wg.length === 3 && /^0 von/.test(r.wg[0]) && /^0 von/.test(r.wg[1]) && /^1 von/.test(r.wg[2]) && r.wgW === 3 && !r.wgGleich, JSON.stringify([r.wg, r.wgW, r.wgGleich]));
  ok('Adjektiv-Deklination: je Geschlecht eigener Eintrag, Gesamt = Adjektive × 4', r.decl[0] && !r.decl[1] && r.decl[2] === '1 von ' + r.decl[3] + ' gelernt', JSON.stringify(r.decl));
  ok('Startseite und Kopfzeilen zählen gleich', r.quelle.join() === r.kopf.join(), JSON.stringify([r.quelle, r.kopf]));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
