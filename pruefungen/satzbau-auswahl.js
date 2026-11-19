const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Satzbau „Auswahl“ (19.11.): mehrere Satzarten mit je eigenen Zeiten; neue Satzart = alle Zeiten, gewählte Satzart
// erst nach vorn, dann abwählen; Zeit-Klick nur für die umrandete Satzart; Aufgaben gemischt mit Abzeichen; gespeichert
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const ctx = await b.newContext(); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const zustand = () => p.evaluate(() => ({ sel: wgState.sbSel, f: wgState.sbFocus,
    aktiv: [...document.querySelectorAll('#sb-type-switcher .mode-btn.active')].map(x => x.id.replace('sb-type-', '')).join(','),
    fokus: (document.querySelector('#sb-type-switcher .sb-fokus') || {}).id || '',
    zeiten: ['present', 'past', 'future'].filter(z => document.getElementById('sb-tense-' + z).classList.contains('active')).join(','),
    zahl: document.getElementById('sb-num-field').style.display !== 'none',
    sum: (document.querySelector('#sentencebuild-panel .gt-settings-sum, .gt-settings-sum') ? [...document.querySelectorAll('.gt-settings-sum')].map(x => x.textContent).find(t => /Auswahl/.test(t)) || '' : '') }));
  await p.evaluate(() => { openSentenceBuild(); setWgType('negation'); setWgTense('past'); });
  await p.evaluate(() => toggleSbAuswahl());
  let z = await zustand();
  ok('Auswahl an: Verneinung · Vergangenheit übernommen', z.sel === 'negation:past' && z.aktiv === 'negation' && z.zeiten === 'past', JSON.stringify(z));
  await p.evaluate(() => sbTenseClick('future')); z = await zustand();
  ok('Klick auf Zukunft: Vergangenheit + Zukunft', z.sel === 'negation:past,future' && z.zeiten === 'past,future', z.sel);
  await p.evaluate(() => sbTenseClick('future')); z = await zustand();
  ok('Zweiter Klick wählt Zukunft ab', z.sel === 'negation:past', z.sel);
  await p.evaluate(() => sbTenseClick('past')); z = await zustand();
  ok('Letzte Zeit bleibt', z.sel === 'negation:past', z.sel);
  await p.evaluate(() => sbTypeClick('possession')); z = await zustand();
  ok('Neue Satzart Besitz mit allen Zeiten, umrandet', z.sel === 'negation:past;possession:present,past,future' && z.fokus === 'sb-type-possession' && z.zeiten === 'present,past,future' && z.aktiv === 'possession,negation' && z.zahl, JSON.stringify(z));
  await p.evaluate(() => sbTypeClick('dative')); z = await zustand();
  ok('Satzart ohne Zeit kommt dazu', /dative:present/.test(z.sel), z.sel);
  await p.evaluate(() => sbTypeClick('negation')); z = await zustand();
  ok('Gewählte Satzart: erster Klick holt sie nach vorn', z.f === 'negation' && z.zeiten === 'past' && /negation/.test(z.sel), JSON.stringify(z));
  await p.evaluate(() => sbTenseClick('present')); z = await zustand();
  ok('Zeiten gelten je Satzart', /negation:present,past/.test(z.sel) && /possession:present,past,future/.test(z.sel), z.sel);
  await p.evaluate(() => sbTypeClick('negation')); z = await zustand();
  ok('Zweiter Klick wählt die Satzart ab', !/negation/.test(z.sel) && z.aktiv === 'possession,dative', JSON.stringify(z));
  ok('Kurzfassung nennt die Auswahl', /Auswahl/.test(z.sum) && /Besitz/.test(z.sum), z.sum);
  // Aufgaben gemischt, je mit Abzeichen und passender Zeit
  await p.evaluate(() => { sbTypeClick('negation'); sbTenseClick('present'); }); // Verneinung zurück: alle Zeiten, dann Präsens ab
  const r = await p.evaluate(() => {
    const sel = sbSelLesen(), gesehen = new Set(), fehler = [];
    for (let k = 0; k < 120; k++) { restartWordgroup(); const c = wgState.current;
      gesehen.add(c.sbType + ':' + c.sbTense);
      if (!sel[c.sbType] || (SB_ZEIT_TYPEN.includes(c.sbType) && !sel[c.sbType].includes(c.sbTense))) fehler.push(c.sbType + ':' + c.sbTense);
      const chip = document.querySelector('#sb-q .sb-auswahl-chip'); if (!chip || !chip.textContent.includes(SB_TYP_NAME[c.sbType])) fehler.push('Abzeichen fehlt');
      if (!c.answer || /undefined/.test(c.answer + c.promptDe)) fehler.push('kaputt ' + c.answer); }
    return { gesehen: [...gesehen].sort().join(' '), fehler: fehler.slice(0, 3).join(' | '), sel: wgState.sbSel };
  });
  ok('Aufgaben mischen alle Kombinationen, je mit Abzeichen', !r.fehler && r.gesehen.split(' ').length === 6, r.gesehen + ' · ' + r.sel + ' ' + r.fehler);
  // gespeichert
  await p.evaluate(() => flushSaves && flushSaves());
  const p2 = await ctx.newPage(); await p2.goto('file://' + APP_PATH); await p2.waitForTimeout(400);
  const z2 = await p2.evaluate(() => { openSentenceBuild(); return { an: wgState.sbAuswahl, sel: wgState.sbSel, t: document.getElementById('sb-auswahl-toggle').getAttribute('aria-pressed'),
    aktiv: [...document.querySelectorAll('#sb-type-switcher .mode-btn.active')].length }; });
  ok('Nach Neuladen bleibt die Auswahl', z2.an && z2.sel === r.sel && z2.t === 'true' && z2.aktiv === 3, JSON.stringify(z2));
  // aus: zurück zur Einzelwahl
  const z3 = await p2.evaluate(() => { toggleSbAuswahl(); return { aktiv: [...document.querySelectorAll('#sb-type-switcher .mode-btn.active')].map(x => x.id).join(','), fokus: document.querySelectorAll('.sb-fokus').length, chip: !!document.querySelector('#sb-q .sb-auswahl-chip') }; });
  ok('Auswahl aus: eine Satzart, kein Abzeichen', z3.aktiv.split(',').length === 1 && !z3.fokus && !z3.chip, JSON.stringify(z3));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
