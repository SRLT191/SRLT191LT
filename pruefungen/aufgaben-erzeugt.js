const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Erzeugte Aufgaben (14.11.): je Werkzeug einige hundert Aufgaben erzeugen und aufdecken – kein „undefined“,
// kein „—“ als Lösung, keine lateinischen Buchstaben oder doppelten Leerzeichen in der russischen Lösung
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } }); p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    window.speak = () => {}; setAppView('grammar'); const funde = {}, zahl = {};
    const add = (k, v) => { const a = (funde[k] = funde[k] || []); if (a.length < 6 && !a.includes(v)) a.push(v); };
    const KAPUTT = /undefined|\bnull\b|NaN|\[object/;
    const pruef = (name, antwort) => { const pn = document.querySelector('.grammar-panel.open'); zahl[name] = (zahl[name] || 0) + 1;
      const txt = [...pn.querySelectorAll('.gt-task, .case-question, [id$="-q"], [id$="-result"], [id$="-after"]')].filter(x => x.getClientRects().length).map(x => x.textContent).join(' ‖ ');
      if (KAPUTT.test(txt)) add(name + ': kaputter Text', txt.replace(/\s+/g, ' ').slice(0, 150));
      if (antwort != null) { const a = String(antwort); if (!a.trim()) add(name + ': leere Lösung', txt.slice(0, 80)); if (/[A-Za-z]/.test(a)) add(name + ': Latein in der Lösung', a); if (/\s{2,}|^\s|\s$/.test(a)) add(name + ': Leerzeichen', JSON.stringify(a)); if (/—/.test(a)) add(name + ': Strich als Lösung', a); }
      const neu = pn.querySelector('.gt-end-actions button:last-child'); if (neu && neu.getClientRects().length) neu.click(); };
    const lauf = (name, open, schritt, n) => { try { open(); for (let i = 0; i < n; i++) pruef(name, schritt()); } catch (e) { add(name + ': Absturz', e.message.slice(0, 120)); } };
    lauf('Aspektpaare', () => openAspect(), () => { const a = aspectState.current; revealAspect(); const x = aspectState.dir === 'fwd' ? a && a.pf : a && a.ipf; nextAspect(); return x || null; }, 250);
    ['all', 'past', 'future', 'imperative', 'aspect'].forEach(sc => lauf('Umformen ' + sc, () => { setTransformScope(sc); openTransform(); }, () => { const t = transformState.current; revealTransform(); const a = t && t.answer; nextTransform(); return a; }, 150));
    setTransformScope('all');
    [['mixed', 'all'], ['sg', 'all'], ['pl', 'all'], ['mixed', 'Nom.']].forEach(([num, k]) => lauf('Kasus bilden Substantive ' + num + '/' + k, () => { openCaseForm('noun'); setCaseFormNumber(num, 'noun'); setCaseFormCase('all', 'noun'); if (k !== 'all') setCaseFormCase(k, 'noun'); }, () => { const t = caseFormState.current; revealCaseForm('noun'); const a = t && t.answer; nextCaseForm('noun'); return a; }, 200));
    setCaseFormNumber('mixed', 'noun'); setCaseFormCase('all', 'noun');
    lauf('Kasus bilden Adjektive', () => openCaseAdj(), () => { const t = caseAdjState.current; revealCaseForm('adj'); const a = t && t.answer; nextCaseForm('adj'); return a; }, 400);
    [['20', false], ['100', false], ['gross', false], ['100', true]].forEach(([rg, wr]) => lauf('Zahl + Substantiv ' + rg + (wr ? ' in Worten' : ''), () => { openNumNoun(); if (numNounState.schreiben !== wr) toggleNumNounWrite(); setNumNounRange(rg); }, () => { const t = numNounState.current; revealNumNoun(); const a = t && t.answer; nextNumNoun(); return a; }, 200));
    if (numNounState.schreiben) toggleNumNounWrite(); setNumNounRange('20');
    lauf('Kurzform & Steigerung', () => openAdjForm(), () => { const t = adjFormState.current; revealAdjForm(); const a = t && t.answer; nextAdjForm(); return a; }, 400);
    lauf('Pronomen umformen', () => openPronForm(), () => { const t = pronFormState.current; revealPronForm(); const a = t && t.answer; nextPronForm(); return a; }, 400);
    lauf('Rektion Form bilden', () => { openRektion(); setRektionMode('form'); }, () => { revealRektion(); rektionAdvance(); return null; }, 200);
    lauf('Rektion Fall wählen', () => { openRektion(); setRektionMode('choose'); }, () => { revealRektion(); rektionAdvance(); return null; }, 100);
    const wg = (name, open, typen, n) => typen.forEach(ty => lauf(name + ' ' + ty, () => { open(); setWgType(ty); open(); }, () => { restartWordgroup(); const t = wgState.current; if (!t) return ''; revealWordgroup(); try { sbErklaerung(t.answer.replace(/[.,!?]/g, '').split(' ')); } catch (e) { add(name + ' ' + ty + ': Erklärung stürzt ab', t.answer); } return t.answer; }, n));
    wg('Wortgruppen', () => openWordgroup(), ['adjnoun', 'detnoun', 'numadjnoun', 'prepphrase'], 250);
    const sbTypen = [...new Set(SB_ITEMS.map(i => i.type))];
    // jede Zeit; Satzarten ohne diese Zeit fallen von selbst auf die Gegenwart zurück
    ['present', 'past', 'future'].forEach(z => wg('Satzbau ' + z, () => { openSentenceBuild(); setWgTense(z); }, sbTypen, 100));
    setWgTense('present');
    // Tabellen: jedes Wort einmal aufbauen und aufdecken
    const tab = (name, open, selId, render, reveal, after) => { try { open(); const sel = document.getElementById(selId); [...sel.options].forEach(o => { sel.value = o.value; render(); reveal(); zahl[name] = (zahl[name] || 0) + 1;
      const pn = document.querySelector('.grammar-panel.open'), txt = pn.querySelector('.conj-grid').textContent + ' ' + [...pn.querySelectorAll('.conj-grid input')].map(i => i.value).join(' ') + ' ' + pn.querySelector('.conj-de-hint').textContent + ' ' + ((document.getElementById(after) || {}).textContent || '');
      if (KAPUTT.test(txt)) add(name + ': kaputter Text', o.value + ': ' + txt.replace(/\s+/g, ' ').slice(0, 120)); }); } catch (e) { add(name + ': Absturz', e.message.slice(0, 120)); } };
    ['nonpast', 'past', 'future', 'imperative'].forEach(z => tab('Konjugieren ' + z, () => { openConjugate(); setConjTense(z); }, 'conj-verb-select', renderConjugationTable, revealConjugationTable, 'conj-after'));
    setConjTense('nonpast');
    tab('Deklination Substantive', () => { openNounDecline(); setNounNumber('both'); }, 'noun-select', renderNounTable, revealNounTable, 'noun-after'); setNounNumber('sg');
    tab('Deklination Adjektive', () => { openDecline(); setDeclGender('all'); }, 'decl-adj-select', renderDeclensionTable, revealDeclensionTable, 'decl-after'); setDeclGender('masc');
    tab('Pronomen-Tabellen', () => openPronoun(), 'pronoun-select', renderPronounTable, revealPronounTable, 'pronoun-after');
    return { funde, zahl, summe: Object.values(zahl).reduce((a, x) => a + x, 0) };
  });
  const f = Object.entries(r.funde).map(([k, v]) => k + ' → ' + v.join(' | '));
  const leer = Object.entries(r.zahl).filter(x => x[1] < 5).map(x => x[0]);
  ok(r.summe + ' Aufgaben und Tabellen in ' + Object.keys(r.zahl).length + ' Läufen erzeugt und aufgedeckt: keine kaputten Texte oder Lösungen', f.length === 0, f.slice(0, 6).join(' ;; '));
  ok('jeder Lauf hat Aufgaben erzeugt', leer.length === 0, leer.join(', '));
  ok('Keine JS-Fehler', errs.length === 0, [...new Set(errs)].slice(0, 3).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
