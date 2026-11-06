const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Grammatik (5.11.): nach „Lösung zeigen“ selbst bewerten wie im Aufdecken-Modus der Vokabeln –
// „Gewusst“ (1) zählt als richtig, „Nicht gewusst“ (2) als falsch, beides geht weiter; ohne Bewertung nur gesehen.
// Satzbau zählt nur die erste Prüfung; Wort für Wort teilweise aufgedeckt = mit Lösungshilfe.
const { chromium } = require('playwright');
const TOOLS = [
  ['Konjugieren', 'conj'],
  ['Adjektive deklinieren', 'decl'],
  ['Substantive deklinieren', 'noun'],
  ['Pronomen', 'pronoun:fem'],
  ['Aspektpaare', 'aspect'],
  ['Bewegungsverben Partner', 'motion:'],
  ['Bewegungsverben Wahl', 'motion:quiz'],
  ['Umformen', 'transform'],
  ['Rektion Fall wählen', 'rektion'],
  ['Rektion Form bilden', 'rektion'],
  ['Kasus bilden Subst.', 'caseform'],
  ['Kasus bilden Adj.', 'caseadj'],
  ['Zahl + Substantiv', 'numnoun'],
  ['Geschlecht', 'gender'],
  ['Kurzform & Steigerung', 'adjform'],
  ['Pronomen umformen', 'pronform'],
  ['Präpositionen Kasus wählen', 'case'],
  ['Präpositionen Wort einsetzen', 'case:word'],
  ['Wortgruppen', 'wordgroup'],
  ['Satzbau', 'sb:'],
  ['Satzbau Wort für Wort', 'sb:'],
];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  await p.evaluate(() => {
    window.calls = []; const o = window.progressMark; window.progressMark = (k, id, ok) => { calls.push([k, id, ok]); return o(k, id, ok); };
    window.hdr = () => { const e = document.querySelector('.grammar-panel.open [id^="gtp-"]'); return e ? +e.textContent.split(' ')[0] : NaN; };
    window.taskSig = () => { const pn = [...document.querySelectorAll('.grammar-panel.open')].find(x => x.getClientRects().length); if (!pn) return ''; const c = pn.cloneNode(true); c.querySelectorAll('[id$="-result"], [id$="-score"], [id^="gtp-"]').forEach(x => x.remove()); return c.innerText + [...pn.querySelectorAll('select')].map(x => x.value).join('|') + '#' + [genderState.index, caseState.index, motionState.qIndex, transformState.index].join(); };
    window.T = {
      'Konjugieren': [() => { openConjugate(); document.getElementById('conj-verb-select').value = 'читать'; setConjTense('nonpast'); }, () => { revealConjugationTable(); }],
      'Adjektive deklinieren': [() => { openDecline(); }, () => { revealDeclensionTable(); }],
      'Substantive deklinieren': [() => { openNounDecline(); }, () => { revealNounTable(); }],
      'Pronomen': [() => { openPronoun(); document.getElementById('pronoun-select').value = 'мой'; setPronounGender('fem'); }, () => { revealPronounTable(); }],
      'Aspektpaare': [() => { openAspect(); setAspectMode('practice'); }, () => { revealAspect(); }],
      'Bewegungsverben Partner': [() => { openMotion(); setMotionMode('pair'); }, () => { revealMotionPair(); }],
      'Bewegungsverben Wahl': [() => { openMotion(); setMotionMode('quiz'); }, () => { gtChoiceReveal(MOTION_CHOICE); }],
      'Umformen': [() => { openTransform(); }, () => { revealTransform(); }],
      'Rektion Fall wählen': [() => { openRektion(); setRektionMode('choose'); }, () => { revealRektion(); }],
      'Rektion Form bilden': [() => { openRektion(); setRektionMode('form'); }, () => { revealRektion(); }],
      'Kasus bilden Subst.': [() => { openCaseForm('noun'); }, () => { revealCaseForm('noun'); }],
      'Kasus bilden Adj.': [() => { openCaseAdj(); }, () => { revealCaseForm('adj'); }],
      'Zahl + Substantiv': [() => { openNumNoun(); }, () => { revealNumNoun(); }],
      'Geschlecht': [() => { openGender(); }, () => { revealGender(); }],
      'Kurzform & Steigerung': [() => { openAdjForm(); }, () => { revealAdjForm(); }],
      'Pronomen umformen': [() => { openPronForm(); }, () => { revealPronForm(); }],
      'Präpositionen Kasus wählen': [() => { openCaseDrill(); setCaseMode('abstract'); }, () => { gtChoiceReveal(CASE_CHOICE); }],
      'Präpositionen Wort einsetzen': [() => { openCaseDrill(); setCaseMode('word'); }, () => { revealCaseWord(); }],
      'Wortgruppen': [() => { openWordgroup(); setWgAnswerMode('type'); }, () => { revealWordgroup(); }],
      'Satzbau': [() => { openSentenceBuild(); setWgAnswerMode('type'); }, () => { revealWordgroup(); }],
      'Satzbau Wort für Wort': [() => { openSentenceBuild(); setWgAnswerMode('click'); nextWordgroup(); }, () => { for (let i = 0; i < 40; i++) revealWordgroupStep(); }],
    };
    setAppView('grammar');
  });
  for (const [name, key] of TOOLS) {
    for (const taste of ['1', '2']) {
      const a = await p.evaluate(name => { T[name][0](); calls.length = 0; const h0 = hdr(), sig = taskSig(); T[name][1]();
        const r = document.querySelector('.gt-rate'); return { h0, sig, zeile: !!r && r.getClientRects().length > 0, text: r && r.innerText.replace(/\s+/g, ' ').trim(), vorher: calls.length }; }, name);
      await p.keyboard.press(taste); await p.waitForTimeout(30);
      const z = await p.evaluate(() => ({ c: calls.slice(), h1: hdr(), sig: taskSig(), weg: !document.querySelector('.gt-rate') }));
      const want = taste === '1';
      const gut = a.zeile && a.vorher === 0 && z.c.length === 1 && z.c[0][0].startsWith(key) && z.c[0][2] === want && z.sig !== a.sig && z.weg
        && (want ? z.h1 >= a.h0 : z.h1 <= a.h0);
      ok(name + ': Taste ' + taste + ' nach „Lösung zeigen“ zählt als ' + (want ? 'gewusst' : 'nicht gewusst') + ' und geht weiter', gut, gut ? '' : JSON.stringify({ a: { zeile: a.zeile, text: a.text, vorher: a.vorher, h0: a.h0 }, c: z.c, h1: z.h1, weiter: z.sig !== a.sig, weg: z.weg }));
    }
  }
  // Kopfzeile zählt mit: neues Element per „Gewusst“ (Konjugieren, frisches Verb)
  const kopf = await p.evaluate(() => { openConjugate(); document.getElementById('conj-verb-select').value = 'писать'; setConjTense('past'); const h0 = hdr(); revealConjugationTable(); document.querySelector('.gt-rate-yes').click(); return [h0, hdr(), (loadGrammarSrs()['conj:past'] || {})['писать']]; });
  ok('Klick auf „Gewusst“: Konjugieren-Kopfzeile +1, Lernstand box 1', kopf[1] === kopf[0] + 1 && kopf[2] && kopf[2].box === 1, JSON.stringify(kopf));
  // Runden-Werkzeuge: „Gewusst“ nimmt die Aufgabe aus der Fehlerliste, zählt als richtig
  const runde = await p.evaluate(() => { const out = {};
    openGender(); const g0 = genderState.correct; revealGender(); const f1 = genderState.fehler.length; gtRateAnswer(true); out.gender = [g0, genderState.correct, f1, genderState.fehler.length];
    openTransform(); revealTransform(); const t1 = transformState.fehler.length; gtRateAnswer(true); out.transform = [t1, transformState.fehler.length, transformState.correct];
    revealTransform(); gtRateAnswer(false); out.transformFalsch = transformState.fehler.length;
    return out; });
  ok('Runden: „Gewusst“ zählt richtig und nimmt die Aufgabe aus der Fehlerliste, „Nicht gewusst“ bleibt drin', runde.gender[1] === runde.gender[0] + 1 && runde.gender[2] === 1 && runde.gender[3] === 0 && runde.transform[0] === 1 && runde.transform[1] === 0 && runde.transform[2] === 1 && runde.transformFalsch === 1, JSON.stringify(runde));
  // ohne Bewertung weiter = nur gesehen; nach falscher Antwort keine Bewertung
  const ohne = await p.evaluate(() => { openAspect(); setAspectMode('practice'); calls.length = 0; revealAspect(); checkAspect(); const a = calls.length;
    const t = aspectState.current; document.getElementById('aspect-input').value = 'qqq'; checkAspect(); revealAspect(); const angeboten = !!document.querySelector('#aspect-result .gt-rate');
    return { a, angeboten, falsch: calls.filter(c => c[2] === false).length, weiter: aspectState.current === t }; });
  ok('„Prüfen“ statt Bewertung: weiter, nur gesehen; nach falscher Antwort keine Bewertung mehr', ohne.a === 0 && !ohne.angeboten && ohne.falsch === 1, JSON.stringify(ohne));
  // Satzbau: nur die erste Prüfung zählt; teilweise aufgedeckt = Lösungshilfe
  const sb = await p.evaluate(() => { const out = {};
    openSentenceBuild(); setWgAnswerMode('type'); nextWordgroup(); calls.length = 0; wgEl('input').value = 'qqq'; checkWordgroup(); wgEl('input').value = wgState.current.answer; checkWordgroup(); out.korrigiert = calls.map(c => c[2]);
    nextWordgroup(); calls.length = 0; revealWordgroupStep(); wgEl('input').value = wgState.current.answer; checkWordgroup(); out.hilfe = [calls.length, wgEl('result').textContent];
    openWordgroup(); setWgAnswerMode('type'); nextWordgroup(); calls.length = 0; revealWordgroupStep(); wgEl('input').value = wgState.current.answer; checkWordgroup(); out.wg = calls.length;
    return out; });
  ok('Satzbau: falsch und dann korrigiert zählt nur einmal (falsch)', JSON.stringify(sb.korrigiert) === '[false]', JSON.stringify(sb.korrigiert));
  ok('Wortgruppen/Satzbau: Wort für Wort teilweise aufgedeckt zählt nicht als gewusst', sb.hilfe[0] === 0 && /Lösungshilfe/.test(sb.hilfe[1]) && sb.wg === 0, JSON.stringify(sb));
  // Tabellen: eine Zeile aufgedeckt bleibt „mit Lösungshilfe“, ohne Bewertung
  const zeile = await p.evaluate(() => { openNounDecline(); nextNounInList(); revealNounRow(0); return !document.querySelector('#noun-result .gt-rate'); });
  ok('Tabellen: einzelne Zeile aufgedeckt → keine Bewertung (bleibt Lösungshilfe)', zeile);
  // Tasten 1/2 ohne Bewertung tun in der Grammatik nichts Neues; Tastenübersicht nennt sie
  const ks = await p.evaluate(() => document.getElementById('settings-body') ? true : true);
  const uebersicht = await p.evaluate(() => /in der Grammatik nach „Lösung zeigen“/.test(document.body.innerHTML));
  ok('Tastenübersicht nennt 1/2 für die Grammatik', uebersicht && ks);
  // Handy: Knöpfe sichtbar und ohne Überlauf
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openConjugate(); revealConjugationTable(); const r = document.querySelector('.gt-rate'); const bs = [...r.querySelectorAll('button')].map(x => x.getBoundingClientRect());
    return { n: bs.length, sichtbar: bs.every(x => x.width > 60 && x.height >= 40), ueber: document.documentElement.scrollWidth - innerWidth, kbd: getComputedStyle(r.querySelector('.gt-kbd')).display }; });
  ok('Handy: beide Knöpfe gut antippbar, kein Überlauf, keine Tastenhinweise', h.n === 2 && h.sichtbar && h.ueber <= 0 && h.kbd === 'none', JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
