const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// B1-Paket 1 (15.11.): Verben umformen – Adverbialpartizip, Partizip, Passiv mit -ся; Pronomen – который (Tabelle),
// Pronomen umformen „который · никто“; Zahl + Substantiv „Mit Fall“ (Zahlwort gebeugt, оба/обе).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, f = (k, inf) => (buildTransformItems().find(t => t.kind === k && t.inf === inf) || {});
    const it = buildTransformItems();
    out.tf = [it.filter(t => t.kind === 'gerund').length, it.filter(t => t.kind === 'part').length, it.filter(t => t.kind === 'passiv').length, it.filter(t => ['gerund', 'part', 'passiv'].includes(t.kind) && !t.de).length,
      f('gerund', 'прочитать').answer, f('gerund', 'прочитать').task, f('gerund', 'читать').task, f('passiv', 'продавать').answer];
    setAppView('grammar'); openTransform();
    out.scopes = ['gerund', 'part', 'passiv'].map(sc => { setTransformScope(sc); return transformState.queue.length > 0 && transformState.queue.every(t => t.kind === sc); });
    setTransformScope('passiv'); const t = transformState.queue[0];
    out.passivAnz = [document.getElementById('transform-q').textContent.includes(t.satz.split('___')[0].trim()), document.getElementById('transform-input').placeholder];
    out.tipps = [transformTipp(f('gerund', 'прочитать'), 'прочитая'), transformTipp(f('passiv', 'строить'), 'строит'), transformTipp(f('passiv', 'продавать'), 'продаётся')];
    out.ende = transformFehlerZeile(f('passiv', 'строить')) + ' | ' + transformFehlerZeile(f('gerund', 'читать'));
    // Pronomen
    GRAMMAR_PANEL_OPENERS.pronoun(); const sel = document.getElementById('pronoun-select');
    out.pron = [[...sel.querySelectorAll('optgroup')].map(g => g.label).pop(), !!relativeData['который'] && relativeData['который'].fem['Akk.'] === 'которую', (pronounEntry('который') || {}).kind];
    GRAMMAR_PANEL_OPENERS.pronform(); setPronFormScope('rel');
    out.rel = [pfRelTasks().length, pronFormState.current.typ, /___/.test(document.getElementById('pronform-q').textContent), document.getElementById('pronform-input').placeholder];
    setPronFormScope('all'); const typen = new Set(); for (let i = 0; i < 300; i++) typen.add(buildPronFormTask().typ); out.alle = [...typen].sort().join();
    // Zahl + Substantiv
    GRAMMAR_PANEL_OPENERS.numnoun(); if (!numNounState.fall) toggleNumNounFall();
    const c = numNounState.current;
    out.nn = [c.fall, /\S+ \S+/.test(c.answer), document.getElementById('numnoun-pre').textContent.startsWith(c.praep), document.getElementById('nn-range-switcher').querySelector('[data-v]').disabled];
    out.zahl = [2, 3, 4, 5, 7, 8, 11, 20, 30, 40, 100].map(n => NN_FALL_KASUS.map(k => nnZahlFall(n, k[0], 'm')).join('/')).join(' ');
    out.oba = [nnZahlFall('оба', 'Instr.', 'f'), nnZahlFall('оба', 'Präp.', 'm'), nnFallPraep('Präp.', 'обоих'), nnFallPraep('Instr.', 'ста'), nnFallPraep('Dat.', 'пяти')];
    out.srs = [NUMNOUN_DRILL.srs(c), NUMNOUN_DRILL.id(c).includes(':fall:')];
    toggleNumNounFall(); out.zurueck = [!!numNounState.current.fall, document.getElementById('nn-range-switcher').querySelector('[data-v]').disabled];
    out.stufen = ['#transform-scope-btn-gerund', '#transform-scope-btn-part', '#transform-scope-btn-passiv', '#pronform-scope-rel', '#nn-fall-toggle'].map(x => (document.querySelector(x) || {}).dataset ? document.querySelector(x).dataset.lvl : '-').join();
    openLevelOverview(); renderLevelPlan('B1'); out.plan = document.querySelectorAll('#lvl-plan .lvl-manual').length;
    return out;
  });
  ok('Verben umformen: 32 Adverbialpartizipien, 37 Partizipien, 7 Passivsätze, alle mit Bedeutung', r.tf.slice(0, 4).join() === '32,37,7,0' && r.tf[4] === 'прочитав' && /vollendet\)$/.test(r.tf[5]) && /unvollendet/.test(r.tf[6]) && r.tf[7] === 'продаются', JSON.stringify(r.tf));
  ok('Auswahl Adverbialpartizip / Partizip / Passiv: Runde nur aus diesem Typ', r.scopes.every(Boolean), JSON.stringify(r.scopes));
  ok('Passiv: Satz mit Lücke, Platzhalter ohne Person', r.passivAnz[0] && r.passivAnz[1] === 'Passiv mit -ся', JSON.stringify(r.passivAnz));
  ok('Tipps: Aspekt beim Adverbialpartizip, -ся fehlt, Mehrzahl', /vollendetes Verb/.test(r.tipps[0]) && /-ся/.test(r.tipps[1]) && /Mehrzahl/.test(r.tipps[2]), JSON.stringify(r.tipps));
  ok('Fehlerliste am Rundenende: Satz bzw. Grundform → Lösung', /Здесь новый дом\. → строится/.test(r.ende.replace(/<[^>]+>/g, '')) && /читать → читая/.test(r.ende.replace(/<[^>]+>/g, '')), r.ende);
  ok('Pronomen: который als eigene Gruppe mit Tabelle nach Geschlecht', r.pron[0] === 'который (B1)' && r.pron[1] && r.pron[2] === 'gender', JSON.stringify(r.pron));
  ok('Pronomen umformen „который · никто“: 20 Sätze mit Lücke', r.rel[0] === 20 && r.rel[1] === 'rel' && r.rel[2] && r.rel[3] === 'Fehlendes Wort…', JSON.stringify(r.rel));
  ok('„Alle“ ohne die B1-Sätze', r.alle === 'case,extra,poss,prep', r.alle);
  ok('Zahl + Substantiv „Mit Fall“: Wendung in Worten, Präposition vor dem Feld, Zahlbereich gesperrt', r.nn.every(Boolean), JSON.stringify(r.nn));
  ok('Zahlwörter in Gen./Dat./Instr./Präp.', r.zahl === 'двух/двум/двумя/двух трёх/трём/тремя/трёх четырёх/четырём/четырьмя/четырёх пяти/пяти/пятью/пяти семи/семи/семью/семи восьми/восьми/восемью/восьми одиннадцати/одиннадцати/одиннадцатью/одиннадцати двадцати/двадцати/двадцатью/двадцати тридцати/тридцати/тридцатью/тридцати сорока/сорока/сорока/сорока ста/ста/ста/ста', r.zahl);
  ok('оба/обе, об обоих, со ста', r.oba.join() === 'обеими,обоих,об,со,к', r.oba.join());
  ok('Eigener Lernstand „numnoun:fall“ (zählt nicht zum Werkzeug)', r.srs[0] === 'numnoun:fall' && r.srs[1], JSON.stringify(r.srs));
  ok('Ausschalten: wieder normale Aufgaben, Zahlbereich frei', r.zurueck.join() === 'false,false', JSON.stringify(r.zurueck));
  ok('Stufe B1 an allen neuen Auswahlen; Stufenplan B1 mit 6 Teilen', r.stufen === 'B1,B1,B1,B1,B1' && r.plan === 6, r.stufen + ' ' + r.plan);
  ok('Keine JS-Fehler', !errs.length, errs.join(' | '));
  await b.close();
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  const n = R.filter(x => x[0] === 'OK ').length; console.log('\n' + n + ' von ' + R.length + ' bestanden');
  process.exit(n === R.length ? 0 : 1);
})();
