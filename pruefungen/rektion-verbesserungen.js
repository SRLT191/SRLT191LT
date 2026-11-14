const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Rektion (14.11.): Liste mit Standpunkt, „x von y sicher“, Suche, Sprungmarken, „nur offene“, Sortierung, Aspektpartner,
// Beispiel liest vor, Handy zweizeilig; Werkzeug: Übersetzung ohne verräterische Klammer, Rückmeldung in drei Zeilen,
// Filter (Fall, nur ≠ Deutsch), Verwechslungspaare, Pronomen bei „Form bilden“
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, ov = document.getElementById('overlay-rektionlist'), E = (c, w) => ({ correct: c, wrong: w, box: c ? 1 : 0, lastSeen: 1 });
    const gesprochen = []; window.speak = t => gesprochen.push(t);
    setAppView('grammar'); openRektion(); setRektionMode('choose');
    const s = loadGrammarSrs(); s.rektion = { 'w:помогать': E(1, 0), 'f:помогать:мама': E(1, 0), 'w:звонить': E(1, 2), 'w:мешать': E(0, 3), 'w:состоять': E(1, 0), 'f:верить:~он': E(1, 0) }; saveGrammarSrs();
    openRektionList();
    const zeile = v => [...ov.querySelectorAll('.rkl-row')].find(z => z.querySelector('.rkl-v').firstChild.textContent === v);
    const st = v => (/\bs(\d)\b/.exec(zeile(v).querySelector('.rkl-st').className) || [])[1];
    // 1 Stand je Verb + Überschrift
    out.stand = ['помогать', 'звонить', 'мешать', 'советовать', 'состоять', 'верить'].map(st).join('');
    out.titel = zeile('мешать').querySelector('.rkl-st').getAttribute('aria-label');
    out.kopf = [...ov.querySelectorAll('.rkl-group')].map(g => g.querySelector('.rkl-title').textContent + ': ' + g.querySelector('.rkl-n').textContent).filter(x => /^(Dativ|из)/.test(x));
    // 2 Suche + Sprungmarken
    out.sprung = ov.querySelectorAll('#rektion-list-sprung button').length;
    ov.querySelector('.overlay-body').scrollTop = 0; rkListSprung('kDat');
    out.gesprungen = ov.querySelector('.overlay-body').scrollTop > 200;
    const such = document.getElementById('rektion-list-search'), suche = q => { such.value = q; such.dispatchEvent(new Event('input')); return [...ov.querySelectorAll('.rkl-row .rkl-v')].map(x => x.firstChild.textContent).join(','); };
    out.suche = [suche('lachen'), suche('помочь'), suche('ещ'), suche('zzz') + '|' + (ov.querySelector('.rkl-leer') || {}).textContent]; suche('');
    // 3 nur offene
    toggleRektionListOffen(); out.offen = [ov.querySelectorAll('.rkl-row').length, RK_VERBS.length, !!zeile('помогать'), !!zeile('звонить'), document.getElementById('rektion-list-offen').getAttribute('aria-pressed')]; toggleRektionListOffen();
    // 4 Beispiel liest vor (ohne die Zeile aufzuklappen)
    const bsp = zeile('звонить').querySelector('.rkl-bsp'); bsp.click(); out.vorlesen = [gesprochen.join('|'), bsp.textContent, bsp.tagName, zeile('звонить').classList.contains('open')];
    // 5 Sortierung
    setRektionListSort('abc'); const abc = [...ov.querySelectorAll('.rkl-row .rkl-v')].map(x => x.firstChild.textContent);
    out.abc = [abc.length, abc[0], abc.join() === abc.slice().sort((a, c) => a.localeCompare(c, 'ru')).join(), ov.querySelectorAll('.rkl-fall').length, ov.querySelectorAll('.rkl-head').length, document.getElementById('rektion-list-sprung').children.length];
    setRektionListSort('schwer'); out.schwer = [...ov.querySelectorAll('.rkl-row .rkl-v')].slice(0, 2).map(x => x.firstChild.textContent).join(',') + '|' + document.querySelector('#rektion-list-sort .active').dataset.v;
    setRektionListSort('fall');
    // 6 Aspektpartner
    out.pf = [(zeile('помогать').querySelector('.rkl-pf') || {}).textContent, !!zeile('бояться').querySelector('.rkl-pf'), ov.querySelectorAll('.rkl-pf').length];
    closeOverlay('overlay-rektionlist');
    // 8 Übersetzung vor der Antwort
    const de = id => rkDeFrage(RK_VERBS.find(x => rkVerbId(x) === id));
    out.frage = [de('смеяться'), de('верить'), de('играть:в'), de('отвечать:на'), de('работать:кем'), de('сердиться'), de('жениться')];
    out.klammer = RK_VERBS.map(rkDeFrage).filter(x => /\((über|auf|an\)|von|für|aus|mit|vor|als|jemandem|wem)/.test(x));
    const lach = rektionItems('choose').find(t => t.verb.v === 'смеяться');
    startRektionRound([lach, rektionItems('choose').find(t => t.verb.v === 'помогать')]);
    out.frageDom = document.getElementById('rektion-q').textContent;
    // 9 Rückmeldung in drei Zeilen
    rkArt('praep'); answerRektion('nadInstr');
    const fb = document.querySelector('#rektion-result .rk-fb');
    out.fb = [fb.children.length, fb.querySelector('.rk-fb-regel').textContent, !!fb.querySelector('.rk-fb-vgl .rkl-anders'), fb.querySelector('.rk-fb-bsp').tagName];
    gesprochen.length = 0; fb.querySelector('.rk-fb-bsp').click(); out.fbVorlesen = gesprochen.join();
    gtChoiceNext(RK_CHOICE); rkArt('fall'); answerRektion('Dat'); out.fbGleich = [!!document.querySelector('#rektion-result .rk-fb-vgl .rkl-anders'), document.querySelector('#rektion-result .rk-fb-vgl').textContent];
    // 11 Filter
    setRektionKasus('Instr'); out.fInstr = [rektionState.queue.length, rektionState.queue.every(t => t.verb.r === 'Instr')];
    setRektionKasus('praep'); toggleRektionAnders(); out.fPraep = [rektionState.queue.length > 5, rektionState.queue.every(t => rkOpt(t.verb.r).prep && rkAnders(t.verb))];
    out.sum = document.querySelector('#rektion-settings .gt-settings-sum').textContent;
    out.gespeichert = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /tool-settings/.test(k)) || 'x') || '{}');
    out.sichtbar = ['rektion-hint-toggle', 'rektion-pron-toggle', 'rektion-anders-toggle'].map(id => document.getElementById(id).style.display !== 'none');
    setRektionMode('form'); out.fForm = [rektionState.queue.length > 5, rektionState.queue.every(t => rkOpt(t.verb.r).prep && rkAnders(t.verb))];
    out.sichtbarForm = ['rektion-hint-toggle', 'rektion-pron-toggle'].map(id => document.getElementById(id).style.display !== 'none');
    setRektionKasus('all'); toggleRektionAnders(); out.sumStd = document.querySelector('#rektion-settings .gt-settings-sum').textContent;
    // 12 Verwechslungspaare
    setRektionMode('choose');
    const W = v => rektionItems('choose').find(t => rkVerbId(t.verb) === v);
    startRektionRound([W('играть:в'), W('помогать'), W('играть:на'), W('думать')]);
    rkArt('fall'); const n1 = rektionState.queue.map(t => rkVerbId(t.verb)).join(',');
    gtChoiceNext(RK_CHOICE); out.paar1 = [n1, !!document.querySelector('#rektion-q .rk-paar'), document.querySelector('#rektion-q .rk-paar').textContent];
    rkArt('fall'); out.paarKette = rektionState.queue.length;                       // Gegenstück selbst falsch: keine weitere Einfügung
    gtChoiceNext(RK_CHOICE); gtChoiceNext(RK_CHOICE); out.skip = rektionState.queue.map(t => rkVerbId(t.verb)).join(',');   // помогать übersprungen: nichts eingefügt
    rkArt('fall'); out.paarNeu = rektionState.queue.map(t => rkVerbId(t.verb)).join(',');   // думать falsch: мечтать kommt neu dazu
    out.partner = [rkPartner('звонить'), rkPartner('звать'), rkPartner('состоять')];
    out.paareOk = RK_PAARE.every(pp => pp.every(id => RK_VERBS.some(x => rkVerbId(x) === id)));
    // 13 Pronomen
    const F = (v, n) => rektionItems('form').find(t => rkVerbId(t.verb) === v && (!n || t.noun === n));
    out.pron = [rkPronTask(F('звонить'), 'он').obj, rkPronTask(F('думать'), 'я').obj, rkPronTask(F('думать'), 'она').obj, rkPronTask(F('смеяться'), 'я').obj, rkPronTask(F('готовиться'), 'я').obj, rkPronTask(F('благодарить'), 'они').obj, rkPronTask(F('болеть за'), 'он').obj, rkPronTask(F('бояться'), 'она').obj];
    out.pronId = [rkPronTask(F('болеть за'), 'он').id, rektionEinheit(rkPronTask(F('болеть за'), 'он').id)];
    out.pronMoegl = [rkPronMoeglich(F('звонить', 'мама')), rkPronMoeglich(F('думать', 'вопрос')), rkPronMoeglich(F('становиться', 'врач')), rkPronMoeglich(F('работать:кем', 'врач'))];
    setRektionMode('form'); let mit = 0, nurPers = true; for (let i = 0; i < 30; i++) { restartRektion(); rektionState.queue.forEach(t => { if (t.pron) { mit++; if (!RK_PRON.includes(t.noun)) nurPers = false; } }); }
    out.pronRunden = [mit > 10, mit < 200, nurPers];
    const total = rektionTotal();
    startRektionRound([rkPronTask(F('звонить'), 'он')]); out.pronFrage = document.getElementById('rektion-q').textContent;
    document.getElementById('rektion-input').value = 'ему'; checkRektion(); out.pronOk = [rektionState.lastCorrect, !!loadGrammarSrs().rektion['f:звонить:~он'], rektionTotal() === total];
    toggleRektionPron(); let ohne = 0; for (let i = 0; i < 20; i++) { restartRektion(); ohne += rektionState.queue.filter(t => t.pron).length; } out.pronAus = ohne; toggleRektionPron();
    const info = document.getElementById('rektion-info-panel').textContent;
    out.info = /Verwechslungspaare/.test(info) && /Pronomen/.test(info) && /nur offene/.test(info) && /Schwierige zuerst/.test(info) && /nur ≠ Deutsch/.test(info) && /drei kurze Zeilen/.test(info);
    return out;
  });
  ok('Liste: Stand je Verb als Punkt (sicher 3, halb 2, geübt 1, neu 0; ohne Formaufgaben reicht „Fall wählen“; Pronomen-Aufgabe zählt zur Einheit)', r.stand === '321032' && r.titel === 'geübt, noch nicht richtig', r.stand + ' ' + r.titel);
  ok('Liste: „x von y sicher“ je Abschnitt', r.kopf.join('|') === 'Dativ: 1 von 19 sicher|из + Genitiv: 1 von 1 sicher', r.kopf.join('|'));
  ok('Liste: Sprungmarken je Fall (17) springen zum Abschnitt', r.sprung === 17 && r.gesprungen, JSON.stringify([r.sprung, r.gesprungen]));
  ok('Liste: Suche nach Übersetzung, Aspektpartner, ё = е; ohne Treffer ein Hinweis', r.suche[0] === 'смеяться' && r.suche[1] === 'помогать' && /^[^,]*$/.test(r.suche[2]) && r.suche[2] !== '' && /^\|Keine Verben/.test(r.suche[3]), JSON.stringify(r.suche));
  ok('Liste: „nur offene“ blendet sichere Verben aus', r.offen[0] === r.offen[1] - 2 && !r.offen[2] && r.offen[3] && r.offen[4] === 'true', JSON.stringify(r.offen));
  ok('Liste: Beispiel antippen liest es vor', r.vorlesen[0] === r.vorlesen[1] && r.vorlesen[2] === 'BUTTON' && !r.vorlesen[3], JSON.stringify(r.vorlesen));
  ok('Liste: Sortierung А–Я (eine Liste mit Fall-Marke, ohne Überschriften und Sprungmarken)', r.abc[0] === 76 && r.abc[2] && r.abc[3] === 76 && r.abc[4] === 0 && r.abc[5] === 0, JSON.stringify(r.abc));
  ok('Liste: „Schwierige zuerst“ nach Fehlern', r.schwer === 'мешать,звонить|schwer', r.schwer);
  ok('Liste: vollendeter Partner, soweit im Wortschatz', r.pf[0] === ' / помочь' && !r.pf[1] && r.pf[2] >= 20, JSON.stringify(r.pf));
  ok('Werkzeug: Übersetzung vor der Antwort ohne verräterische Klammer', r.frage.join('|') === 'lachen|glauben (Person)|spielen (ein Spiel)|antworten (Frage, Brief)|arbeiten (Beruf)|sich ärgern, böse sein|heiraten (vom Mann gesagt)' && r.klammer.length === 0 && /lachen/.test(r.frageDom) && !/über/.test(r.frageDom), JSON.stringify([r.frage, r.klammer, r.frageDom]));
  ok('Werkzeug: Rückmeldung in drei Zeilen (Regel mit voller Übersetzung, „≠ Deutsch“, Beispiel als Knopf, liest vor)', r.fb[0] === 3 && /смеяться \+ над \+ Instrumental · lachen \(über\)/.test(r.fb[1]) && r.fb[2] && r.fb[3] === 'BUTTON' && /^смеяться над /.test(r.fbVorlesen), JSON.stringify([r.fb, r.fbVorlesen]));
  ok('Werkzeug: gleiche Rektion ohne Marke, mit „wie im Deutschen“', !r.fbGleich[0] && /wie im Deutschen/.test(r.fbGleich[1]), JSON.stringify(r.fbGleich));
  ok('Einstellungen: Fall-Filter und „nur ≠ Deutsch“ wirken in beiden Modi', r.fInstr[0] === 8 && r.fInstr[1] && r.fPraep[0] && r.fPraep[1] && r.fForm[0] && r.fForm[1], JSON.stringify([r.fInstr, r.fPraep, r.fForm]));
  ok('Einstellungen: Kurzfassung nennt Abweichungen, sonst „Standard“; Hilfe und Pronomen nur bei „Form bilden“', /mit Präp\./.test(r.sum) && /nur ≠ Deutsch/.test(r.sum) && r.sumStd === 'Standard' && r.sichtbar.join() === 'false,false,true' && r.sichtbarForm.join() === 'true,true', JSON.stringify([r.sum, r.sumStd, r.sichtbar, r.sichtbarForm]));
  ok('Verwechslungspaar: nach Fehler rückt das Gegenstück direkt nach, mit Hinweis', r.paar1[0] === 'играть:в,играть:на,помогать,думать' && r.paar1[1] && /Gegenstück zu играть/.test(r.paar1[2]), JSON.stringify(r.paar1));
  ok('Verwechslungspaar: keine Kette, nichts beim Überspringen, fehlendes Gegenstück kommt neu dazu', r.paarKette === 4 && r.skip === 'играть:в,играть:на,помогать,думать' && r.paarNeu === 'играть:в,играть:на,помогать,думать,мечтать', JSON.stringify([r.paarKette, r.skip, r.paarNeu]));
  ok('Verwechslungspaare beidseitig, nur vorhandene Verben', r.partner.join() === 'звать,звонить,' && r.paareOk, JSON.stringify(r.partner));
  ok('Pronomen: ему · обо мне · о ней · надо мной · ко мне · их · за него · её', r.pron.join('|') === 'ему|обо мне|о ней|надо мной|ко мне|их|за него|её', r.pron.join('|'));
  ok('Pronomen: nur bei Personen, nicht bei становиться/работать; zählt zur Einheit des Verbs', r.pronMoegl.join() === 'true,false,false,false' && r.pronId[1] === 'f:болеть за', JSON.stringify([r.pronMoegl, r.pronId]));
  ok('Pronomen: kommen in Runden ab und zu vor, abschaltbar; Aufgabe wird gestellt und gewertet, Gesamtzahl unverändert', r.pronRunden.every(Boolean) && r.pronAus === 0 && /звонить \+ он/.test(r.pronFrage) && /des Pronomens/.test(r.pronFrage) && r.pronOk.every(Boolean), JSON.stringify([r.pronRunden, r.pronAus, r.pronFrage, r.pronOk]));
  ok('Erklärung nennt die Neuerungen', r.info);
  // Einstellungen überleben das Neuladen
  await p.evaluate(() => { setRektionKasus('Gen'); toggleRektionAnders(); toggleRektionPron(); });
  await p.reload(); await p.waitForTimeout(400);
  const n = await p.evaluate(() => { setAppView('grammar'); openRektion(); return [rektionState.kasus, rektionState.nurAnders, rektionState.pron, document.querySelector('#rektion-kasus-switcher .active').dataset.v, document.getElementById('rektion-anders-toggle').getAttribute('aria-pressed'), rektionState.queue.every(t => t.verb.r === 'Gen')]; });
  ok('Filter und Pronomen-Schalter bleiben nach dem Neuladen', n.join() === 'Gen,true,false,Gen,true,true', n.join());
  // Handy: zwei Zeilen, Antippen zeigt den Vergleich
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openRektion(); openRektionList();
    const z = [...document.querySelectorAll('#overlay-rektionlist .rkl-row')].find(x => /^звонить/.test(x.textContent)), R = s => z.querySelector(s).getBoundingClientRect();
    const out = { hoehe: Math.round(z.getBoundingClientRect().height), gleich: Math.abs(R('.rkl-v').top - R('.rkl-de').top) < 6 && Math.abs(R('.rkl-bsp').top - R('.rkl-chips').top) < 8, zweite: R('.rkl-bsp').top > R('.rkl-v').bottom - 2, vgl: getComputedStyle(z.querySelector('.rkl-vgl-t')).display };
    z.click(); out.offen = getComputedStyle(z.querySelector('.rkl-vgl-t')).display; out.ueber = document.documentElement.scrollWidth - innerWidth;
    const sp = document.getElementById('rektion-list-sprung'); out.sprung = [getComputedStyle(sp).position, sp.scrollWidth > sp.clientWidth];
    setRektionListSort('schwer'); document.querySelector('#overlay-rektionlist .rkl-row').click(); out.sort = document.querySelector('#rektion-list-sort .active').dataset.v;
    return out; });
  ok('Handy: Zeile zweizeilig (Verb · Übersetzung / Beispiel · Marken), höchstens 62 px', h.gleich && h.zweite && h.hoehe <= 62, JSON.stringify(h));
  ok('Handy: Vergleich erst nach Antippen der Zeile; kein Überlauf; Sprungmarken bleiben oben und rollen seitlich', h.vgl === 'none' && h.offen === 'block' && h.ueber <= 0 && h.sprung[0] === 'sticky' && h.sprung[1] && h.sort === 'schwer', JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
