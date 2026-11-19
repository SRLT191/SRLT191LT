const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Mehrfachauswahl (19.11.): Verben umformen, Kurzform & Steigerung, Pronomen umformen, Geschlecht, Rektion, Konjugieren
// (Klick wählt dazu/ab, „Alle“ bzw. „Gemischt“ setzt zurück) und Wortgruppen „Auswahl“ (Art + Zahl je Art)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const ctx = await b.newContext(); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const aktiv = sel => p.evaluate(s => [...document.querySelectorAll(s + ' .mode-btn.active')].map(x => x.textContent.trim()).join('|'), sel);
  // Verben umformen
  let r = await p.evaluate(() => { setAppView('grammar'); openTransform();
    document.getElementById('transform-scope-btn-konj').click(); document.getElementById('transform-scope-btn-part').click();
    const sc = transformState.scope, kinds = [...new Set(transformPool().map(t => t.kind))].sort().join(',');
    document.getElementById('transform-scope-btn-konj').click(); const sc2 = transformState.scope;
    document.getElementById('transform-scope-btn-part').click(); const sc3 = transformState.scope;
    document.getElementById('transform-scope-btn-gerund').click(); document.getElementById('transform-scope-btn-all').click();
    return { sc, kinds, sc2, sc3, sc4: transformState.scope }; });
  ok('Umformen: Konjunktiv + Partizip, abwählen, Alle', r.sc === 'konj,part' && r.kinds === 'konj,part' && r.sc2 === 'part' && r.sc3 === 'all' && r.sc4 === 'all', JSON.stringify(r));
  await p.evaluate(() => document.getElementById('transform-scope-btn-passiv').click());
  ok('Umformen: Knöpfe zeigen die Auswahl', await aktiv('#transform-scope-btn-all').catch(() => '') === '' && (await p.evaluate(() => document.getElementById('transform-scope-btn-passiv').classList.contains('active') && !document.getElementById('transform-scope-btn-all').classList.contains('active'))));
  // Kurzform & Steigerung
  r = await p.evaluate(() => { openAdjForm(); adjFormScopeKlick('comp'); adjFormScopeKlick('ppp');
    const typen = new Set(); for (let i = 0; i < 60; i++) typen.add(buildAdjFormTask().typ);
    return { sc: adjFormState.scope, typen: [...typen].sort().join(','), btn: ['comp', 'ppp', 'all'].map(x => document.getElementById('adjform-scope-' + x).classList.contains('active')).join(',') }; });
  ok('Kurzform & Steigerung: Komparativ + Partizip-Kurzform', r.sc === 'comp,ppp' && r.typen === 'comp,ppp' && r.btn === 'true,true,false', JSON.stringify(r));
  // Pronomen umformen
  r = await p.evaluate(() => { openPronForm(); pronFormScopeKlick('prep'); pronFormScopeKlick('rel');
    const typen = new Set(); for (let i = 0; i < 80; i++) typen.add(buildPronFormTask().typ);
    return { sc: pronFormState.scope, typen: [...typen].sort().join(',') }; });
  ok('Pronomen umformen: Mit Präposition + который · никто', r.sc === 'prep,rel' && /prep/.test(r.typen) && !/case|poss|extra/.test(r.typen), JSON.stringify(r));
  // Geschlecht
  r = await p.evaluate(() => { openGender(); genderScopeKlick('soft'); genderScopeKlick('exc');
    const typen = [...new Set(genderScopePool().map(x => x.typ))].sort().join(',');
    return { sc: genderState.scope, typen, kopf: genderProgressText(loadGrammarSrs()) }; });
  ok('Geschlecht: -ь-Wörter + Ausnahmen, Kopf nennt beide', r.sc === 'soft,exc' && r.typen === 'exc,soft' && /-ь-Wörter \+ Ausnahmen/.test(r.kopf), JSON.stringify(r));
  // Rektion
  r = await p.evaluate(() => { rektionKasusKlick('Dat'); rektionKasusKlick('Instr');
    const rs = [...new Set(rektionPool('kasus').map(t => t.verb.r))].sort().join(',');
    const sw = [...document.querySelectorAll('#rektion-kasus-switcher .mode-btn.active')].map(x => x.dataset.v).join(',');
    return { k: rektionState.kasus, rs, sw }; });
  ok('Rektion: Dativ + Instrumental', r.k === 'Dat,Instr' && r.rs === 'Dat,Instr' && r.sw === 'Dat,Instr', JSON.stringify(r));
  // Konjugieren
  r = await p.evaluate(() => { openConjugate(); setConjTense('nonpast');
    conjZeitKlick('past'); const a = { mixed: conjState.mixed, z: conjState.zeiten, t: conjState.tense,
      btn: ['nonpast', 'past', 'imperative', 'mixed'].map(x => document.getElementById('conj-tense-btn-' + x).classList.contains('active')).join(',') };
    const zeiten = new Set(); for (let i = 0; i < 40; i++) zeiten.add(conjMixedTense('читать'));
    conjZeitKlick('imperative'); const z3 = conjState.zeiten, gem = document.getElementById('conj-tense-btn-mixed').classList.contains('active');
    conjZeitKlick('nonpast'); conjZeitKlick('imperative'); const single = { mixed: conjState.mixed, t: conjState.tense };
    conjZeitKlick('past'); const nichtLeer = { mixed: conjState.mixed, t: conjState.tense };
    setConjMixed(); const g2 = { z: conjState.zeiten, mixed: conjState.mixed };
    setConjTense('nonpast');
    return { a, zeiten: [...zeiten].sort().join(','), z3, gem, single, nichtLeer, g2 }; });
  ok('Konjugieren: Präsens + Vergangenheit gemischt', r.a.mixed && r.a.z === 'nonpast,past' && r.a.btn === 'true,true,false,false' && r.zeiten === 'nonpast,past', JSON.stringify(r.a) + ' ' + r.zeiten);
  ok('Konjugieren: drei Zeiten = Gemischt, eine Zeit = feste Tabelle, letzte bleibt', r.z3 === '' && r.gem && !r.single.mixed && r.single.t === 'past' && !r.nichtLeer.mixed && r.nichtLeer.t === 'past' && r.g2.z === '' && r.g2.mixed, JSON.stringify(r));
  // Wortgruppen „Auswahl“
  r = await p.evaluate(() => { openWordgroup(); setWgType('adjnoun'); setWgNumber('sg'); toggleWgAuswahl();
    const o = { start: wgState.wgSel };
    wgNumKlick('pl'); o.beide = wgState.wgSel;
    wgTypeKlick('prepphrase'); o.prep = wgState.wgSel; o.fokus = (document.querySelector('#wg-type-switcher .sb-fokus') || {}).id;
    wgNumKlick('sg'); o.prepPl = wgState.wgSel;
    wgTypeKlick('detnoun'); o.zahlSicht = document.getElementById('wg-num-switcher').style.display;
    wgTypeKlick('adjnoun'); wgTypeKlick('adjnoun'); o.ohneAdj = wgState.wgSel;
    const gesehen = new Set(), fehler = [];
    for (let i = 0; i < 80; i++) { restartWordgroup(); const c = wgState.current; gesehen.add(c.wgType + ':' + c.wgNumber);
      const chip = document.querySelector('#wg-q .sb-auswahl-chip'); if (!chip || !chip.textContent.includes(WG_TYP_NAME[c.wgType])) fehler.push('chip');
      if (/undefined/.test(c.answer + c.promptDe)) fehler.push('kaputt'); }
    o.gesehen = [...gesehen].sort().join(' '); o.fehler = fehler.slice(0, 2).join(',');
    return o; });
  ok('Wortgruppen: Auswahl mit Zahl je Art', r.start === 'adjnoun:sg' && r.beide === 'adjnoun:sg,pl' && r.prep === 'adjnoun:sg,pl;prepphrase:sg,pl' && r.fokus === 'wg-type-prepphrase' && r.prepPl === 'adjnoun:sg,pl;prepphrase:pl' && r.zahlSicht === 'none' && r.ohneAdj === 'prepphrase:pl;detnoun:sg', JSON.stringify(r));
  ok('Wortgruppen: Aufgaben gemischt mit Abzeichen', !r.fehler && /detnoun/.test(r.gesehen) && /prepphrase:pl/.test(r.gesehen) && !/prepphrase:sg/.test(r.gesehen), r.gesehen + ' ' + r.fehler);
  // gespeichert
  await p.evaluate(() => { transformScopeKlick('konj'); flushSaves && flushSaves(); });
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message)); await p2.goto('file://' + APP_PATH); await p2.waitForTimeout(400);
  r = await p2.evaluate(() => ({ t: transformState.scope, a: adjFormState.scope, pf: pronFormState.scope, g: genderState.scope, rk: rektionState.kasus, wg: wgState.wgAuswahl + ' ' + wgState.wgSel }));
  ok('Nach Neuladen bleibt jede Auswahl', r.t === 'passiv,konj' || r.t === 'konj,passiv', JSON.stringify(r));
  ok('… auch in den anderen Werkzeugen', r.a === 'comp,ppp' && r.pf === 'prep,rel' && r.g === 'soft,exc' && r.rk === 'Dat,Instr' && r.wg === 'true prepphrase:pl;detnoun:sg', JSON.stringify(r));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
