const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Funktionen der Grammatikwerkzeuge (13.11.): Adjektiv-Tabelle „Alle“, Nachher-Bereich und Punkte, Pronomen-Nachher,
// Aufgaben nach Lernstand, Vorlesen überall, Rektion in zwei Schritten, Rundenende nach Gruppe
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}; setAppView('grammar'); updateGrammarTileProgress();
    const fuellen = sel => document.querySelectorAll(sel + ' input').forEach(i => i.value = i.dataset.answer.replace(/\s*\([^)]*\)/, '').split(/\s*[\/|]\s*/)[0]);
    // Adjektive: Alle
    openDecline(); document.getElementById('decl-adj-select').value = 'новый'; setDeclGender('all');
    out.alle = [document.querySelectorAll('#decl-grid .noun-col').length, document.querySelectorAll('#decl-grid input').length];
    fuellen('#decl-grid'); checkDeclensionTable();
    const g = loadGrammarSrs(); out.alleSrs = DECL_SRS_KEYS.every(k => (g[k] || {})['новый']);
    const af = document.getElementById('decl-after').textContent;
    out.after = [/Tabelle anhören/.test(af), /weiblich: Gen\. = Dat\. = Instr\. = Präp\./.test(af), document.querySelectorAll('#decl-dots .conj-dot.fertig').length];
    setDeclGender('fem'); out.einzel = [document.querySelectorAll('#decl-grid input').length, document.querySelectorAll('#decl-dots .conj-dot.fertig').length];
    setDeclGender('masc');
    // Pronomen: Nachher
    openPronoun(); document.getElementById('pronoun-select').value = 'я'; renderPronounTable(); fuellen('#pronoun-grid'); checkPronounTable();
    out.pron = document.getElementById('pronoun-after').textContent;
    // Aufgaben nach Lernstand: bekannte Formen kommen nach neuen
    const bekannt = new Set(); openCaseAdj();
    for (let i = 0; i < 40; i++) { restartCaseForm('adj'); const t = caseAdjState.current; bekannt.add(t.id); progressMark('caseadj', t.id, true); gtRundeNeu('ca'); }
    let wieder = 0; for (let i = 0; i < 40; i++) { restartCaseForm('adj'); if (bekannt.has(caseAdjState.current.id)) wieder++; gtRundeNeu('ca'); }
    out.lernstand = wieder;
    openPronForm(); const ps = new Set(); for (let i = 0; i < 30; i++) { restartPronForm(); const t = pronFormState.current; if (ps.has(t.id)) out.pronDoppelt = (out.pronDoppelt || 0) + 1; ps.add(t.id); progressMark('pronform', t.id, true); gtRundeNeu('pronform'); }
    openWordgroup(); setWgType('adjnoun'); const ws = new Set(); for (let i = 0; i < 6; i++) { restartWordgroup(); const k = wgState.current.srsKey; if (ws.has(k)) out.wgDoppelt = (out.wgDoppelt || 0) + 1; ws.add(k); progressMark('wordgroup', k, true); }
    // Vorlesen überall
    out.vorlesen = [...document.querySelectorAll('.grammar-panel .gt-settings-body')].filter(x => !x.querySelector('#wg-speak-toggle, #sb-speak-toggle, .gram-speak-toggle')).length;
    const an = wgState.autoSpeak; document.querySelector('#overlay-caseform .gram-speak-toggle').click();
    out.vorlesenSync = [wgState.autoSpeak !== an, document.getElementById('wg-speak-toggle').getAttribute('aria-pressed') === String(wgState.autoSpeak)];
    toggleWgAutoSpeak();
    // Rektion in zwei Schritten
    openRektion(); setRektionMode('choose');
    const t = rektionState.current, art = rkOpt(t.verb.r).prep ? 'praep' : 'fall';
    out.rk1 = document.querySelectorAll('#rektion-opts .case-opt').length;
    rkArt(art); out.rk2 = [document.querySelectorAll('#rektion-opts .case-opt').length, RK_CHOICE.answered, !!document.querySelector('#rektion-opts .case-opt[data-k="' + t.verb.r + '"]')];
    answerRektion(t.verb.r); out.rk3 = rektionState.rCorrect;
    gtChoiceNext(RK_CHOICE); const t2 = rektionState.current, falsch = rkOpt(t2.verb.r).prep ? 'fall' : 'praep';
    out.rkNeu = document.querySelectorAll('#rektion-opts .rk-art').length;
    rkArt(falsch); out.rkFalsch = [RK_CHOICE.answered, !!document.querySelector('#rektion-opts .case-opt.correct'), /^Falsch/.test(document.getElementById('rektion-result').textContent)];
    // Rundenende nach Gruppe
    out.ende = {};
    openPronForm(); gtRundeNeu('pronform'); for (let i = 0; i < 15; i++) { document.getElementById('pronform-input').value = 'xx'; checkPronForm(); nextPronForm(); }
    out.ende.pronform = (document.querySelector('#pronform-q .gt-fehler-gruppen') || {}).textContent || '';
    openTransform(); restartTransform(); for (let i = 0; i < 15; i++) { document.getElementById('transform-input').value = 'xx'; checkTransform(); nextTransform(); }
    out.ende.transform = (document.querySelector('#transform-q .gt-fehler-gruppen') || {}).textContent || '';
    return out;
  });
  ok('Adjektive „Alle“: vier Spalten, 24 Felder, alle vier Lernstände', r.alle[0] === 4 && r.alle[1] === 24 && r.alleSrs, JSON.stringify(r.alle));
  ok('danach: Tabelle anhören, gleiche Formen je Geschlecht, 24 Punkte', r.after[0] && r.after[1] && r.after[2] === 24, JSON.stringify(r.after));
  ok('einzelnes Geschlecht: 6 Felder, Punkte bleiben', r.einzel[0] === 6 && r.einzel[1] === 6, JSON.stringify(r.einzel));
  ok('Pronomen: Tabelle anhören und gleiche Formen (Gen. = Akk.)', /Tabelle anhören/.test(r.pron) && /Gen\. = Akk\./.test(r.pron), r.pron);
  ok('Kasus bilden Adjektive: neue Formen vor bekannten', r.lernstand === 0, String(r.lernstand));
  ok('Pronomen umformen und Wortgruppen: neue Aufgaben zuerst', !r.pronDoppelt && !r.wgDoppelt, JSON.stringify([r.pronDoppelt, r.wgDoppelt]));
  ok('„Vorlesen“ in jeder Einstellungen-Leiste, ein gemeinsamer Schalter', r.vorlesen === 0 && r.vorlesenSync.every(Boolean), JSON.stringify([r.vorlesen, r.vorlesenSync]));
  ok('Rektion Schritt 1: zwei Arten; Schritt 2: nur die passende Gruppe', r.rk1 === 2 && (r.rk2[0] === 4 || r.rk2[0] === 10) && !r.rk2[1] && r.rk2[2] && r.rk3 === 1, JSON.stringify([r.rk1, r.rk2, r.rk3]));
  ok('Rektion: falsche Art zählt als falsch und zeigt die Lösung', r.rkNeu === 2 && r.rkFalsch.every(Boolean), JSON.stringify(r.rkFalsch));
  ok('Rundenende nach Gruppe (Pronomen, Umformen)', /Fehler/.test(r.ende.pronform) && /Fehler/.test(r.ende.transform), JSON.stringify(r.ende));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
