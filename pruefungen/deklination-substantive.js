const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Deklination Substantive (12.11.): Nominativ Singular vorgegeben, Nur Endungen, Muster, gleiche Formen,
// Beispielsatz + „Tabelle anhören“, Beide (Sg + Pl), Punkte je Fall, Fragewörter, Enter → nächstes leeres Feld,
// Reihenfolge der Einstellungen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {};
    const sel = () => document.getElementById('noun-select');
    const ins = () => [...document.querySelectorAll('#noun-grid input.conj-input')];
    const fill = () => ins().filter(i => !i.disabled).forEach(i => { const a = i.dataset.answer.split(/\s*[\/|]\s*/)[0]; const st = i.dataset.stem || ''; i.value = st ? a.slice(st.length) : a; });
    setAppView('grammar'); openNounDecline(); setNounNumber('sg');
    sel().value = 'книга'; renderNounTable();
    const nom = ins()[0];
    out.nom = [nom.disabled, nom.value, ins().filter(i => !i.disabled).length];
    out.frage = [...document.querySelectorAll('#noun-grid .noun-frage')].map(x => x.textContent).join('|');
    // Enter springt ins nächste leere Feld
    const e = ins().filter(i => !i.disabled); e[1].value = 'книге';
    e[0].focus(); e[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    out.enter = document.activeElement === e[2];
    // vollständig richtig: Punkte je Fall, gleiche Formen, Beispiel, Tabelle anhören
    fill(); checkNounTable();
    out.ok = [nounState.allCorrect, document.getElementById('noun-result').textContent];
    const after = document.getElementById('noun-after');
    out.after = [!!after.querySelector('button[onclick="speakNounTable()"]'), after.textContent];
    out.fall = Object.keys(loadGrammarSrs()['noun:fall'] || {}).filter(k => k.startsWith('книга|sg|')).sort().join(',');
    out.dots = [document.querySelectorAll('#noun-dots .conj-dot').length, document.querySelectorAll('#noun-dots .conj-dot.fertig').length];
    out.srs = !!(loadGrammarSrs().noun || {})['книга'];
    out.zaehltNicht = !Object.values(grammarToolSources()).some(s => s[0].includes('noun:fall'));
    // Nur Endungen
    toggleNounEndings();
    out.stamm = [...document.querySelectorAll('#noun-grid .conj-stem')].map(x => x.textContent);
    fill(); checkNounTable(); out.stammOk = nounState.allCorrect;
    toggleNounEndings();
    // Muster
    toggleNounMuster(); sel().value = 'вода'; renderNounTable();
    out.muster = document.getElementById('noun-de-hint').textContent;
    revealNounTable(); out.musterAfter = document.getElementById('noun-after').textContent;
    sel().value = 'книга'; renderNounTable(); out.musterBelebt = document.getElementById('noun-de-hint').textContent;
    toggleNounMuster();
    // belebt: Akk. = Gen.
    sel().value = 'брат'; renderNounTable(); revealNounTable();
    out.belebt = document.getElementById('noun-after').textContent;
    // Beide
    setNounNumber('both'); sel().value = 'стол'; renderNounTable();
    out.beide = [document.querySelectorAll('#noun-grid .noun-col').length, ins().filter(i => !i.disabled).length, document.getElementById('noun-grid').classList.contains('noun-zwei')];
    out.spalten = (() => { const c = [...document.querySelectorAll('#noun-grid .noun-col')].map(x => x.getBoundingClientRect()); return c.length === 2 && Math.abs(c[0].top - c[1].top) < 2; })();
    fill(); checkNounTable();
    const g = loadGrammarSrs(); out.beideSrs = !!(g.noun || {})['стол'] && !!(g['noun:pl'] || {})['стол'];
    out.beideGleich = document.getElementById('noun-after').textContent;
    sel().value = 'любовь'; renderNounTable();
    out.ohnePl = [document.querySelectorAll('#noun-grid .noun-col').length, ins().filter(i => i.disabled && i.value === '—').length, document.querySelector('#noun-grid .noun-col-fehlt') ? 1 : 0];
    fill(); checkNounTable(); out.ohnePlOk = nounState.allCorrect && !(loadGrammarSrs()['noun:pl'] || {})['любовь'];
    out.beideListe = [...sel().options].some(o => o.value === 'деньги') && [...sel().options].some(o => o.value === 'любовь');
    setNounNumber('pl'); sel().value = 'стол'; renderNounTable();
    out.plNom = ins()[0].disabled;
    // Einstellungen: Übungsoptionen zuerst, dann Trenner, dann Sortierung/Erklärung
    const row = document.querySelector('#overlay-noun .gt-settings-row');
    out.reihe = [...row.children].map(c => c.id || (c.classList.contains('gt-field') ? 'Zahl' : null) || (c.classList.contains('grammar-note-toggle') ? 'grammar-note-toggle' : c.className.split(' ').pop())).join(' ');
    out.eyeTitle = document.querySelector('#noun-grid .conj-reveal-one-btn').title;
    setNounNumber('sg');
    return out;
  });
  ok('Nominativ Singular vorgegeben (gesperrt), 5 Felder zum Eintippen', r.nom[0] && r.nom[1] === 'книга' && r.nom[2] === 5, JSON.stringify(r.nom));
  ok('Fragewörter unter den Fällen', r.frage === 'кто? что?|кого? чего?|кому? чему?|кого? что?|кем? чем?|о ком? о чём?', r.frage);
  ok('Enter springt ins nächste leere Feld', r.enter);
  ok('richtig gelöst, Lernstand gespeichert', r.ok[0] && r.srs, JSON.stringify(r.ok));
  ok('danach: Tabelle anhören, gleiche Formen (Dat. = Präp.), Beispielsatz', r.after[0] && /Gleiche Formen: Dat\. = Präp\./.test(r.after[1]), r.after[1]);
  ok('Lernstand je Fall (5 Fälle) und Punkte am Wort, zählt nicht im Gesamtstand', r.fall === 'книга|sg|Akk.,книга|sg|Dat.,книга|sg|Gen.,книга|sg|Instr.,книга|sg|Präp.' && r.dots[0] === 5 && r.zaehltNicht, JSON.stringify([r.fall, r.dots]));
  ok('Nur Endungen: Stamm книг vorgegeben, Endungen reichen', r.stamm.length === 5 && r.stamm.every(s => s === 'книг') && r.stammOk, JSON.stringify(r.stamm));
  ok('Muster: вода wie книга (vorher und nachher)', /wie книга/.test(r.muster) && /Gleiches Muster wie книга:книга, книги/.test(r.musterAfter), r.muster + ' / ' + r.musterAfter);
  ok('Muster nur mit gleicher Belebtheit (книга nicht wie мама)', !/wie мама/.test(r.musterBelebt), r.musterBelebt);
  ok('belebt: Akk. = Gen. (belebt)', /Akk\. = Gen\. \(belebt\)/.test(r.belebt), r.belebt);
  ok('Beide: zwei Spalten nebeneinander, 11 Felder, beide Lernstände', r.beide[0] === 2 && r.beide[1] === 11 && r.beide[2] && r.spalten && r.beideSrs, JSON.stringify([r.beide, r.spalten, r.beideSrs]));
  ok('Beide: gleiche Formen je Zahl (Singular: Akk. = Nom. (unbelebt))', /Singular: Akk\. = Nom\. \(unbelebt\)/.test(r.beideGleich) && /Plural: Akk\. = Nom\. \(unbelebt\)/.test(r.beideGleich), r.beideGleich);
  ok('Beide: любовь ohne Plural – Spalte mit „—“ gesperrt, zählt nur Singular', r.ohnePl[0] === 2 && r.ohnePl[1] === 6 && r.ohnePl[2] === 1 && r.ohnePlOk && r.beideListe, JSON.stringify([r.ohnePl, r.ohnePlOk, r.beideListe]));
  ok('Plural: Nominativ wird abgefragt', !r.plNom);
  ok('Einstellungen: Hilfe, Zahl, Nur Endungen, Beispielwort | Sortierung, Erklärung', /^noun-hint-toggle Zahl noun-endings-toggle noun-muster-toggle gt-settings-sep noun-sort-btn grammar-note-toggle( |$)/.test(r.reihe), r.reihe);
  ok('Augen-Knopf: „Form zeigen“', r.eyeTitle === 'Form zeigen', r.eyeTitle);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
