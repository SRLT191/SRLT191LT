const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Gesamtprüfung 10.11. – Korrekturen: Runden mit Fehlerliste in neun Eingabe-Werkzeugen (Fehler wiederholen spielt dieselben Aufgaben),
// keine identische Aufgabe zweimal hintereinander, Wortgruppen „Präposition“ nur mit passenden Substantiven, десяток im Werkzeug Geschlecht,
// Ersatzsätze, Einstellungen einheitlich in der Leiste (⋯-Menü nur Aktionen), Kopf: Fortschritt und ⋯ zusammen rechts,
// Fokus nach Dialog aus dem ⋯-Menü, Tastenkürzel-Übersicht, A2-Abzeichen „Auch Plural“, Literata in Kasus-Drill/Rektion-Liste
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}; setAppView('grammar');
    // Runden: [Name, öffnen, Zustand, Prüfen, Eingabe-ID, Lösung, weiter, Rundenkennung, Panel]
    const T = [
      ['Aspektpaare', () => { openAspect(); setAspectMode && setAspectMode('practice'); }, () => aspectState, checkAspect, 'aspect-input', () => aspectState.current.answer, nextAspect, 'aspect', 'aspect-practice'],
      ['Bewegungsverben Partner', () => { openMotion(); setMotionMode('pair'); }, () => motionState, checkMotionPair, 'motion-pair-input', () => motionState.current.answer, nextMotionPair, 'motion-pair', 'motion-pair-view'],
      ['Zahl + Substantiv', () => openNumNoun(), () => numNounState, checkNumNoun, 'numnoun-input', () => numNounState.current.answer, nextNumNoun, 'numnoun', 'overlay-numnoun'],
      ['Kasus bilden Subst.', () => openCaseForm('noun'), () => caseFormState, () => checkCaseForm('noun'), 'caseform-input', () => caseFormState.current.answer, () => nextCaseForm('noun'), 'cf', 'overlay-caseform'],
      ['Kasus bilden Adj.', () => openCaseAdj(), () => caseAdjState, () => checkCaseForm('adj'), 'caseadj-input', () => caseAdjState.current.answer, () => nextCaseForm('adj'), 'ca', 'overlay-caseadj'],
      ['Pronomen umformen', () => openPronForm(), () => pronFormState, checkPronForm, 'pronform-input', () => pronFormState.current.answer, nextPronForm, 'pronform', 'overlay-pronform'],
      ['Kurzform & Steigerung', () => openAdjForm(), () => adjFormState, checkAdjForm, 'adjform-input', () => adjFormState.current.alts ? adjFormState.current.alts[0] : adjFormState.current.answer, nextAdjForm, 'adjform', 'overlay-adjform'],
      ['Wortgruppen', () => { openWordgroup(); setWgAnswerMode('type'); }, () => wgState, checkWordgroup, 'wg-input', () => wgState.current.answer, nextWordgroup, 'wg', 'overlay-wordgroup'],
      ['Satzbau', () => { openSentenceBuild(); setWgAnswerMode('type'); }, () => wgState, checkWordgroup, 'sb-input', () => wgState.current.answer, nextWordgroup, 'sb', 'overlay-sentencebuild'],
    ];
    out.runden = T.map(([name, open, st, chk, inId, loes, next, id, panel]) => {
      open(); gtRundeNeu(id);
      const score0 = document.getElementById(GT_RUNDEN[id].score).textContent;
      const falsch = [];
      for (let i = 0; i < 15; i++) {
        const inp = document.getElementById(inId);
        if (i < 2) { falsch.push(JSON.stringify(st().current)); inp.value = 'qqq'; } else inp.value = loes();
        chk(); next();
      }
      const p = document.getElementById(panel), q = document.getElementById(GT_RUNDEN[id].q);
      const ende = { leer: !document.getElementById(GT_RUNDEN[id].score.replace(/-score$/, '-result')).textContent, done: p.classList.contains('gt-done'), text: /13 von 15 richtig/.test(q.textContent), fehler: q.querySelectorAll('.gt-fehler li').length, laut: q.querySelectorAll('.gt-fehler-hoeren').length };
      gtRundeWiederholen(id);
      const wieder = [JSON.stringify(st().current)];
      const inp = document.getElementById(inId); inp.value = loes(); chk(); next();
      wieder.push(JSON.stringify(st().current));
      const zaehler = document.getElementById(GT_RUNDEN[id].score).textContent;
      inp.value = loes(); chk(); next();
      const ende2 = p.classList.contains('gt-done') && /2 von 2 richtig/.test(q.textContent);
      gtRundeNeu(id); const neu = !p.classList.contains('gt-done') && /^1 \/ 15/.test(document.getElementById(GT_RUNDEN[id].score).textContent);
      return { name, score0, ende, wieder: wieder.every(w => falsch.includes(w)), zaehler, ende2, neu };
    });
    // keine identische Aufgabe hintereinander (Zahl + Substantiv, 300×)
    openNumNoun(); let gleich = 0; for (let i = 0; i < 300; i++) { const a = JSON.stringify(numNounState.current); gtNext(NUMNOUN_DRILL); if (JSON.stringify(numNounState.current) === a) gleich++; gtRundeNeu('numnoun'); }
    out.gleich = gleich;
    // Wortgruppen „Präposition“
    openWordgroup(); setWgType('prepphrase'); const unpassend = [];
    for (let i = 0; i < 200; i++) { restartWordgroup(); const c = wgState.current, prep = c.tokens[0].replace(/^(во|со|об|обо)$/, m => m[0]); const noun = Object.keys(nounDeclensionData).find(n => c.srsKey && c.answer.endsWith(' ' + c.tokens[c.tokens.length - 1]) && Object.values(nounDeclensionData[n].sg).concat(Object.values(nounDeclensionData[n].pl || {})).includes(c.tokens[c.tokens.length - 1]));
      const k = Object.keys(PREP_SATZ).filter(x => x.startsWith(prep + ':')); if (noun && !k.some(x => PREP_SATZ[x].some(t => t.n.includes(noun)))) unpassend.push(c.answer); }
    out.unpassend = [...new Set(unpassend)].slice(0, 5);
    out.dorogoj = WG_ADJ_FIT['дорогой'][0].includes('P');
    setWgType('adjnoun');
    // десяток, Sätze
    genderPoolCache = null; out.desjatok = (genderPool().find(x => x.ru === 'десяток') || {}).g;
    out.saetze = ['мочь / смочь', 'пробовать / попробовать', 'платить / заплатить', 'обещать / пообещать', 'улыбаться / улыбнуться', 'рождаться / родиться', 'умирать / умереть'].map(k => (getWordSentence(findVocabEntry(k)) || {}).ru);
    out.alt = ['Важно мочь помочь другу.', 'Нельзя обещать и не делать.', 'Дети могут рождаться дома.'].filter(x => buildDictationPool().some(d => d.ru === x));
    // Einstellungen: ⋯-Menüs nur Aktionen
    out.menue = [...document.querySelectorAll('.gt-more-menu .gt-more-item')].map(x => x.textContent.trim()).filter(t => !/^(Neue Runde|Leeren|Übersicht nach Fall|Liste der -ь-Wörter)$/.test(t));
    out.leiste = ['conj-sort-btn', 'conj-scope-btn', 'case-hint-toggle', 'case-plural-toggle', 'case-kasus-chips'].filter(id => !document.getElementById(id).closest('.gt-settings-body'));
    out.notes = ['overlay-conjugate', 'overlay-decline', 'overlay-noun', 'overlay-pronoun'].filter(id => !document.querySelector('#' + id + ' .gt-settings-body .grammar-note-toggle'));
    // Kopf
    out.kopf = [...document.querySelectorAll('.grammar-panel-header')].filter(h => h.querySelector('.gt-more') && !h.querySelector('.gt-head-right > .grammar-panel-progress ~ .gt-more')).length;
    // Tastenkürzel
    const tk = document.querySelector('[data-sec="tasten"], section[aria-label="Tastenkürzel"]') || document.body; const tt = tk.textContent;
    out.tasten = /Kasus-Drill „Fall wählen“ 1–5/.test(tt) && /Rektion „Fall wählen“ 1–9 und 0/.test(tt) && /„Vorsilben“ 1–4/.test(tt) && /In Wortgruppen und Satzbau/.test(tt) && /nicht beim Auswählen/.test(tt);
    // A2 und Schrift
    out.a2 = document.getElementById('case-plural-toggle').dataset.lvl === 'A2';
    openCaseDrill(); setCaseMode('word'); out.schrift = getComputedStyle(document.querySelector('#case-question .case-satz')).fontFamily;
    setCaseMode('abstract');
    return out;
  });
  r.runden.forEach(x => ok(x.name + ': Runde 15, Ende mit 2 Fehlern, Fehler wiederholen = dieselben Aufgaben, Zähler, neue Runde',
    x.ende.done && x.ende.leer && x.ende.text && x.ende.fehler === 2 && x.ende.laut === 2 && x.wieder && /^2 \/ 2 · 1 richtig$/.test(x.zaehler) && x.ende2 && x.neu, x));
  ok('keine identische Aufgabe zweimal hintereinander', r.gleich === 0, r.gleich);
  ok('Wortgruppen „Präposition“: nur passende Substantive', r.unpassend.length === 0, r.unpassend);
  ok('дорогой nicht bei Personen (sonst „teure Tochter“)', !r.dorogoj);
  ok('десяток im Werkzeug Geschlecht (männlich)', r.desjatok === 'm', r.desjatok);
  ok('Ersatzsätze', r.saetze.join('|') === 'Ты можешь мне помочь?|Попробуй этот суп!|Где можно заплатить?|Он обещал позвонить.|Она всегда улыбается.|Я родился в Москве.|Мой дедушка умер в прошлом году.' && !r.alt.length, [r.saetze, r.alt]);
  ok('⋯-Menüs nur Aktionen, Einstellungen in der Leiste', !r.menue.length && !r.leiste.length && !r.notes.length, [r.menue, r.leiste, r.notes]);
  ok('Kopf: Fortschritt und ⋯ zusammen rechts', r.kopf === 0, r.kopf);
  ok('Tastenkürzel-Übersicht vollständig', r.tasten);
  ok('A2-Abzeichen bei „Auch Plural“', r.a2);
  ok('Kasus-Drill-Satz in Literata', /Literata/.test(r.schrift), r.schrift);
  // Fokus nach Dialog aus dem ⋯-Menü
  const f = await p.evaluate(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); openCaseDrill(); const more = document.querySelector('#overlay-casedrill .gt-more-btn'); more.focus(); toggleGtMore(more);
    const it = document.querySelector('#overlay-casedrill .gt-more-item[onclick*="openPrepList"]'); it.focus(); it.click(); await sleep(60); closeOverlay('overlay-preplist'); await sleep(60); return document.activeElement === more; });
  ok('Fokus nach Dialog aus dem ⋯-Menü zurück auf ⋯', f);
  // Handy: Rektion-Menü im Bild
  const m = await b.newPage({ viewport: { width: 390, height: 800 } }); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
  const h = await m.evaluate(() => { setAppView('grammar'); const out = []; for (const n of GRAMMAR_PANELS) { GRAMMAR_PANEL_OPENERS[n](); const more = document.querySelector('#overlay-' + n + ' .gt-more-btn'); if (!more) continue; toggleGtMore(more); const r = more.closest('.gt-more').querySelector('.gt-more-menu').getBoundingClientRect(); if (r.left < 0 || r.right > 390) out.push(n); closeGtMore(); } return out; });
  ok('Handy 390 px: alle ⋯-Menüs im Bild', !h.length, h);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
