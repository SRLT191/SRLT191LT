const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Satzbau (19.11.): Zukunft bei „Ganzer Satz“ und „Satz + Präposition“ (буду + Infinitiv, 50 bestätigte deutsche Sätze,
// знать/любить ohne Zukunft), Zahl Singular · Plural · Beide bei Besitz und Verneinung (Stoffwörter nur Singular, A2)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = { fehler: [], bsp: {} };
    const satz = SB_ITEMS.filter(i => i.type === 'sentence' || i.type === 'prepsentence');
    out.mitFut = satz.filter(i => i.deFut).length;
    out.ohneFut = satz.filter(i => !i.deFut).map(i => i.verb).sort().join(',');
    wgState.tool = 'sentence';
    wgState.pairs = wgState.pairs || buildWordgroupPairs();
    const schlecht = t => !t || /undefined|null|NaN|  /.test(t);
    wgState.tense = 'future';
    satz.filter(i => i.deFut).forEach(i => { wgState.type = i.type; const t = WG_BUILDERS[i.type](i);
      const subj = WG_SUBJECTS.find(x => x.ru === i.subj);
      if (schlecht(t.answer) || !t.answer.includes(SB_BUDU[subj.key] + ' ' + i.verb + ' ') || t.promptDe !== i.deFut || !/ (werde|wirst|wird|werden|werdet) /.test(t.promptDe) || !/Zukunft|буду/.test(t.hint)) out.fehler.push('Zukunft ' + i.verb + ': ' + t.answer + ' / ' + t.promptDe);
      if (i.verb === 'читать' && i.noun === 'книга') out.bsp.zukunft = t.answer + ' – ' + t.promptDe; });
    // Plural
    const neg = SB_ITEMS.filter(i => i.type === 'negation');
    out.plOk = neg.filter(sbPluralOk).length; out.plNein = neg.filter(i => i.noun && !sbPluralOk(i)).map(i => i.noun).join(',');
    wgState.sbNumber = 'pl';
    ['present', 'past', 'future'].forEach(z => { wgState.tense = z;
      ['possession', 'negation'].forEach(typ => { wgState.type = typ;
        neg.filter(i => sbPluralOk(i) && (typ !== 'possession' || i.owner)).forEach(i => { const t = WG_BUILDERS[typ](i);
          if (schlecht(t.answer) || schlecht(t.promptDe)) out.fehler.push(typ + ' ' + z + ' ' + i.noun + ': ' + t.answer + ' / ' + t.promptDe);
          if (typ === 'possession' && z === 'future' && !/ будут /.test(t.answer)) out.fehler.push('будут fehlt: ' + t.answer);
          if (typ === 'possession' && z === 'past' && !/ были /.test(t.answer)) out.fehler.push('были fehlt: ' + t.answer);
          if (i.noun === 'книга' && i.adj === 'новый') out.bsp[typ + '-' + z] = t.answer + ' – ' + t.promptDe; }); }); });
    // Stoffwörter bleiben im Singular, auch bei Plural
    wgState.tense = 'present'; wgState.type = 'negation';
    const stoff = neg.find(i => i.noun && WG_MASS.has(i.noun));
    if (stoff && sbNumberFor(stoff) !== 'sg') out.fehler.push('Stoffwort im Plural: ' + stoff.noun);
    // Auswahl: Plural nur zählbare, Zukunft nur Sätze mit deFut
    wgState.type = 'negation'; for (let k = 0; k < 40; k++) { const i = sbPick('negation'); if (!sbPluralOk(i)) out.fehler.push('Pick ohne Plural: ' + i.noun); }
    wgState.tense = 'future'; wgState.type = 'sentence'; for (let k = 0; k < 40; k++) { const i = sbPick('sentence'); if (!i.deFut) out.fehler.push('Pick ohne Zukunft: ' + i.verb); }
    wgState.sbNumber = 'sg'; wgState.tense = 'present';
    out.stufe = JSON.stringify([...GRAMMAR_PART_LEVEL, ...GRAMMAR_BADGE_LEVEL].filter(([s]) => s.startsWith('#sb-num')));
    return out;
  });
  ok('50 Sätze mit Zukunft, ohne nur знать/любить', r.mitFut === 50 && r.ohneFut === 'знать,знать,знать,любить,любить,любить', r.mitFut + ' · ' + r.ohneFut);
  ok('Plural nur für zählbare Wörter', r.plOk >= 18 && /отец/.test(r.plNein), r.plOk + ' zählbar · ohne: ' + r.plNein);
  ok('Alle Aufgaben richtig gebaut (Zukunft, Plural in allen Zeiten)', r.fehler.length === 0, r.fehler.slice(0, 4).join(' | '));
  ok('Plural A2 (Punkt im Stufenplan), Beide A2 (Abzeichen)', r.stufe === '[["#sb-num-pl","A2"],["#sb-num-both","A2"]]', r.stufe);
  Object.entries(r.bsp).forEach(([k, v]) => console.log('   ' + k + ': ' + v));
  // Oberfläche
  const ui = await p.evaluate(async () => {
    const sicht = id => { const e = document.getElementById(id); return !!e && e.style.display !== 'none' && e.offsetParent !== null; };
    if (typeof switchView === 'function') switchView('grammar');
    if (typeof openGrammarTool === 'function') openGrammarTool('sentence'); else if (typeof showGrammarTool === 'function') showGrammarTool('sentence');
    wgState.tool = 'sentence';
    const o = {};
    setWgType('sentence'); o.futSatz = document.getElementById('sb-tense-future').style.display !== 'none'; o.zahlSatz = document.getElementById('sb-num-field').style.display !== 'none';
    setWgTense('future'); o.task = wgState.current && wgState.current.answer;
    setWgType('negation'); o.zahlNeg = document.getElementById('sb-num-field').style.display !== 'none';
    setSbNumber('both'); o.both = document.getElementById('sb-num-both').classList.contains('active');
    setWgType('dative'); o.zahlDat = document.getElementById('sb-num-field').style.display !== 'none'; o.zeitDat = wgState.tense;
    setWgType('sentence'); setSbNumber('sg'); setWgTense('present');
    return o;
  });
  ok('Zukunft wählbar bei „Ganzer Satz“, Aufgabe mit буду …', ui.futSatz && /буд/.test(ui.task || ''), ui.task);
  ok('Zahl nur bei Besitz/Verneinung, „Beide“ wählbar', !ui.zahlSatz && ui.zahlNeg && !ui.zahlDat && ui.both, JSON.stringify(ui));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
