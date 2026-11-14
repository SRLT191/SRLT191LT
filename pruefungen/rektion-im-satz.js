const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Rektion (14.11.): Modus „Im Satz“ (30 Sätze mit Lücke), 24 weitere Verben, drei neue Antworten (с + Instr., по + Dat., перед + Instr.),
// Präposition vor dem Wort (во врача), во мне
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}; const gesprochen = []; window.speak = t => gesprochen.push(t);
    out.n = [RK_VERBS.length, new Set(RK_VERBS.map(rkVerbId)).size, RK_OPTIONS.length, RK_SAETZE.length, rektionItems('satz').length];
    out.optOk = RK_VERBS.every(x => !!rkOpt(x.r)) && ['sInstr', 'poDat', 'peredInstr'].every(k => RK_VERBS.some(x => x.r === k));
    const soll = { 'слушать': 'Akk', 'помнить': 'Akk', 'ждать': 'Akk', 'искать': 'Akk', 'требовать': 'Gen', 'улыбаться': 'Dat', 'доверять': 'Dat', 'делиться': 'Instr', 'учиться': 'Dat', 'смотреть': 'naAkk', 'верить:в': 'vAkk', 'влюбляться': 'vAkk',
      'опаздывать': 'naAkk', 'обижаться': 'naAkk', 'платить': 'zaAkk', 'рассказывать': 'oPraep', 'беспокоиться': 'oPraep', 'сомневаться': 'vPraep', 'знакомиться': 'sInstr', 'встречаться': 'sInstr', 'разговаривать': 'sInstr', 'прощаться': 'sInstr', 'скучать': 'poDat', 'извиняться': 'peredInstr' };
    out.fehlt = Object.entries(soll).filter(([id, k]) => !RK_VERBS.some(x => rkVerbId(x) === id && x.r === k)).map(x => x[0]);
    const alle = new Set(); Object.keys(vocab).forEach(k => getAllWordsOfCat(k).forEach(w => { alle.add(w.ru); (MERGED_CARDS[w.ru] || []).forEach(x => alle.add(x)); }));
    out.nichtImWortschatz = Object.keys(soll).map(id => RK_VERBS.find(x => rkVerbId(x) === id).v).filter(v => !alle.has(v));
    const F = (v, n) => rektionItems('form').find(t => rkVerbId(t.verb) === v && (!n || t.noun === n));
    out.formen = [F('влюбляться', 'врач').answer, F('ждать', 'мама').answer, F('требовать').answer, F('скучать', 'дом').answer, F('извиняться', 'сосед').answer, F('знакомиться', 'сестра').answer, F('делиться', 'яблоко').answer, F('учиться').answer, F('сомневаться', 'друг').answer];
    out.ohneTabelle = RK_VERBS.reduce((a, x) => a.concat(x.n.filter(n => !nounDeclensionData[n]).map(n => x.v + ':' + n)), []);
    out.prep = [rkPrep('в', 'врача'), rkPrep('в', 'город'), rkPrep('с', 'студентом'), rkPrep('с', 'сестрой'), rkPrep('о', 'ответе'), rkPrep('о', 'маме')].join(' ');
    out.pron = [rkPronTask(F('сомневаться'), 'я').obj, rkPronTask(F('знакомиться'), 'я').obj, rkPronTask(F('извиняться'), 'я').obj, rkPronTask(F('верить:в'), 'я').obj, rkPronMoeglich(F('скучать', 'мама'))].join('|');
    out.ohneKlammer = RK_VERBS.map(rkDeFrage).filter(x => /\((über|auf|an\)|von|für|aus|mit|vor|als|um|in|zu|bei|jemandem|wem)/.test(x));
    // Sätze: Verb vorhanden, eine Lücke, Lösung = Tabellenform mit Präposition (wo es eine Tabelle gibt)
    const S = rektionItems('satz');
    out.satzFehler = RK_SAETZE.filter(z => !RK_VERBS.some(x => rkVerbId(x) === z.v) || z.ru.split('___').length !== 2 || !z.de || !z.a).map(z => z.v);
    out.satzForm = S.map(t => { const d = nounDeclensionData[t.noun], o = rkOpt(t.verb.r); if (!d) return null; const w = (o.prep ? rkPrep(o.prep, d.sg[o.kasus]) + ' ' : '') + d.sg[o.kasus]; return w === t.obj ? null : t.id + ' ' + t.obj + '≠' + w; }).filter(Boolean);
    out.satzPrep = S.filter(t => { const o = rkOpt(t.verb.r); return o.prep ? !t.obj.startsWith(o.prep + ' ') : / /.test(t.obj); }).map(t => t.id);
    out.total = [rektionTotal(), rektionItems('choose').length + new Set(rektionItems('form').map(x => rektionEinheit(x.id))).size + 30];
    // Bedienung
    setAppView('grammar'); openRektion(); setRektionMode('satz');
    out.modus = [rektionState.mode, document.getElementById('rektion-mode-satz').classList.contains('active'), document.getElementById('rektion-input-row').style.display !== 'none', document.getElementById('rektion-opts').style.display === 'none', rektionState.queue.length, rektionState.queue.every(t => !!t.satz)];
    out.schalter = ['rektion-hint-toggle', 'rektion-pron-toggle'].map(id => document.getElementById(id).style.display !== 'none').join();
    const T = id => S.find(t => t.id === id);
    startRektionRound([T('s:думать'), T('s:жениться'), T('s:играть:в'), T('s:звонить')]);
    const q = document.getElementById('rektion-q');
    out.frage = [/Я часто думаю ___ \(семья\)\./.test(q.textContent), /Ich denke oft an die Familie\./.test(q.textContent), /verlangt: о \+ Präpositiv/.test(q.textContent)];
    const inp = document.getElementById('rektion-input');
    inp.value = 'семье'; checkRektion(); out.ohnePraep = rektionState.lastCorrect;
    out.gegenstueck = rektionState.queue.map(t => t.id).join(','); // думать war falsch → мечтать direkt danach
    nextRektion(); out.paarHinweis = !!document.querySelector('#rektion-q .rk-paar'); inp.value = 'о доме'; checkRektion(); checkRektion();
    inp.value = 'на сестре'; checkRektion(); const res = document.getElementById('rektion-result');
    out.richtig = [rektionState.lastCorrect, res.querySelector('.rk-fb-bsp').textContent.trim(), rektionState.rCorrect, !!loadGrammarSrs().rektion['s:жениться'].correct];
    gesprochen.length = 0; speakRektion(); out.vorlesen = gesprochen.join();
    checkRektion();                                            // zweites Prüfen = weiter
    revealRektion(); out.aufgedeckt = inp.value; nextRektion();
    while (rektionState.current) nextRektion();
    out.ende = [/Он женится/.test(q.textContent), q.querySelectorAll('b').length > 0, /думаю о семье|думаю <b>о семье/.test(q.innerHTML)];
    // Fall-Filter im Satzmodus, Liste zählt Satz wie Form
    setRektionKasus('Instr'); out.filter = [rektionState.queue.length, rektionState.queue.every(t => t.verb.r === 'Instr')]; setRektionKasus('all');
    const s = loadGrammarSrs(); s.rektion = { 'w:желать': { correct: 1, wrong: 0, box: 1, lastSeen: 1 }, 's:желать': { correct: 1, wrong: 0, box: 1, lastSeen: 1 } }; saveGrammarSrs();
    out.stand = rkStaende()['желать'].s;
    // Fall wählen: 13 Präpositionen, drei ohne Taste
    setRektionMode('choose'); startRektionRound([rektionItems('choose').find(t => t.verb.v === 'скучать')]); rkArt('praep');
    const kn = [...document.querySelectorAll('#rektion-opts .case-opt')]; out.knoepfe = [kn.length, kn.filter(k => k.getAttribute('aria-keyshortcuts')).length, kn[kn.length - 1].textContent.trim()];
    answerRektion('poDat'); out.wahl = rektionState.rCorrect;
    openRektionList(); out.liste = [document.querySelectorAll('#overlay-rektionlist .rkl-row').length, [...document.querySelectorAll('#overlay-rektionlist .rkl-title')].map(x => x.textContent).filter(x => /^(с|по|перед) /.test(x)).join('|')]; closeOverlay('overlay-rektionlist');
    const info = document.getElementById('rektion-info-panel').textContent;
    out.info = /Im Satz/.test(info) && /скучать по/.test(info) && /nur mit Personen/.test(info) && /nur per Klick/.test(info);
    return out;
  });
  ok('76 Verben mit eindeutiger Kennung, 17 Antworten, 30 Sätze', r.n.join() === '76,76,17,30,30' && r.optOk, r.n.join());
  ok('24 neue Verben mit bestätigter Rektion, alle im Wortschatz', r.fehlt.length === 0 && r.nichtImWortschatz.length === 0, JSON.stringify([r.fehlt, r.nichtImWortschatz]));
  ok('Formen: влюбляться во врача, ждать маму, требовать ответа, скучать по дому, извиняться перед соседом, знакомиться с сестрой, делиться яблоком, учиться языку, сомневаться в друге',
    r.formen.join() === 'влюбляться во врача,ждать маму,требовать ответа,скучать по дому,извиняться перед соседом,знакомиться с сестрой,делиться яблоком,учиться языку,сомневаться в друге', r.formen.join(' | '));
  ok('Jedes Beispielwort hat eine Formtabelle', r.ohneTabelle.length === 0, r.ohneTabelle.join());
  ok('Präposition vor dem Wort: во врача, в город, со студентом, с сестрой, об ответе, о маме', r.prep === 'во в со с об о', r.prep);
  ok('Pronomen: во мне, со мной, передо мной, в меня; скучать ohne Pronomen', r.pron === 'во мне|со мной|передо мной|в меня|false', r.pron);
  ok('Übersetzung vor der Antwort verrät bei keinem Verb die Präposition', r.ohneKlammer.length === 0, r.ohneKlammer.join());
  ok('Sätze: Verb vorhanden, genau eine Lücke, Übersetzung; Lösung = Tabellenform; Präposition genau bei Präpositionsverben', r.satzFehler.length === 0 && r.satzForm.length === 0 && r.satzPrep.length === 0, JSON.stringify([r.satzFehler, r.satzForm, r.satzPrep]));
  ok('Gesamtzahl = Fall wählen + Form bilden je Verb + 30 Sätze', r.total[0] === r.total[1], r.total.join());
  ok('Modus „Im Satz“: Eingabefeld, 15er-Runde nur aus Sätzen; Hilfe ja, Pronomen nein', r.modus.join() === 'satz,true,true,true,15,true' && r.schalter === 'true,false', JSON.stringify([r.modus, r.schalter]));
  ok('Aufgabe zeigt Satz mit Lücke und Grundform, Übersetzung und (mit Hilfe) den verlangten Fall', r.frage.every(Boolean), r.frage.join());
  ok('Ohne Präposition falsch; richtige Antwort zählt, zeigt den ganzen Satz und liest ihn vor', !r.ohnePraep && r.richtig[0] && r.richtig[1] === 'Он женится на сестре моего друга.' && r.richtig[2] === 2 && r.richtig[3] && r.vorlesen === 'Он женится на сестре моего друга.', JSON.stringify([r.ohnePraep, r.richtig, r.vorlesen]));
  ok('Verwechslungspaar auch im Satz: nach думать kommt мечтать', r.gegenstueck === 's:думать,s:мечтать,s:жениться,s:играть:в,s:звонить' && r.paarHinweis, r.gegenstueck);
  ok('Lösung zeigen füllt die Ergänzung; Rundenende zeigt die Sätze mit Lösung', r.aufgedeckt === 'в футбол' && r.ende[2], JSON.stringify([r.aufgedeckt, r.ende]));
  ok('Fall-Filter gilt im Satzmodus; Satz zählt in der Liste wie „Form bilden“ (sicher)', r.filter[0] === 6 && r.filter[1] && r.stand === 3, JSON.stringify([r.filter, r.stand]));
  ok('Fall wählen: 13 Präpositionen, zehn mit Taste, „перед + Instr.“ per Klick; по + Dat. wird gewertet', r.knoepfe.join() === '13,10,перед + Instr.' && r.wahl === 1, r.knoepfe.join());
  ok('Liste: 76 Zeilen, Abschnitte с/по/перед', r.liste[0] === 76 && r.liste[1] === 'с + Instrumental|по + Dativ|перед + Instrumental', JSON.stringify(r.liste));
  ok('Erklärung nennt „Im Satz“, die neuen Präpositionen und ждать nur mit Personen', r.info);
  await p.evaluate(() => setRektionMode('satz')); await p.reload(); await p.waitForTimeout(400);
  ok('Modus bleibt nach dem Neuladen', await p.evaluate(() => { setAppView('grammar'); openRektion(); return rektionState.mode === 'satz' && !!rektionState.current.satz; }));
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openRektion(); setRektionMode('satz'); startRektionRound([rektionItems('satz').find(t => t.id === 's:поздравлять')]);
    const a = document.documentElement.scrollWidth - innerWidth; setRektionMode('choose'); startRektionRound([rektionItems('choose').find(t => t.verb.v === 'скучать')]); rkArt('praep');
    return [a, document.documentElement.scrollWidth - innerWidth, document.querySelector('.gt-modes .tense-switcher').scrollWidth <= document.querySelector('#overlay-rektion .overlay-body').clientWidth + 1]; });
  ok('Handy: längster Satz, 13 Präpositionsknöpfe und vier Modus-Reiter ohne Überlauf', h[0] <= 0 && h[1] <= 0 && h[2], JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
