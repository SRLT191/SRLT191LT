const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Vereinheitlichung der Grammatikwerkzeuge (13.11.): Runden 15, „Neue Runde“ überall, Hilfe zuerst, Beschriftungen,
// Richtung als Reiter, Feldbreiten, Platzhalter/Abzeichen, Sortierung, Nur regelmäßige, Kurzfassung, Sitzungszeile, Muster-Abzeichen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}; setAppView('grammar'); updateGrammarTileProgress(); updateGtSettingsSummary();
    const RUNDE = ['aspect', 'motion', 'transform', 'rektion', 'caseform', 'numnoun', 'gender', 'caseadj', 'adjform', 'pronform', 'casedrill', 'wordgroup', 'sentencebuild'];
    out.runden = []; out.menue = []; out.hilfe = []; out.label = []; out.sum = []; out.breit = [];
    GRAMMAR_PANELS.forEach(n => {
      GRAMMAR_PANEL_OPENERS[n](); const pn = document.getElementById('overlay-' + n);
      const sc = [...pn.querySelectorAll('[id$="-score"]')].find(x => x.getClientRects().length);
      if (RUNDE.includes(n)) {
        if (!sc || !/^1 \/ 15 /.test(sc.textContent)) out.runden.push(n + ':' + (sc ? sc.textContent : '-'));
        pn.querySelector('.gt-more-btn') && pn.querySelector('.gt-more-btn').click();
        if (![...pn.querySelectorAll('.gt-more-item')].some(x => x.style.display !== 'none' && /Neue Runde/.test(x.textContent))) out.menue.push(n);
        closeGtMore();
      }
      const row = pn.querySelector('.gt-settings-row');
      if (row) {
        const erster = row.children[0]; const hat = row.querySelector('[id$="hint-toggle"], #conj-class-toggle');
        if (hat && erster !== hat) out.hilfe.push(n);
        pn.querySelectorAll('.gt-settings-row > .tense-switcher').forEach(() => out.label.push(n));
      }
      const sum = pn.querySelector('.gt-settings-sum'); if (sum && sum.textContent !== 'Standard') out.sum.push(n + ':' + sum.textContent);
      const inp = [...pn.querySelectorAll('input.conj-input')].filter(i => i.getClientRects().length)[0];
      if (inp && n !== 'sentencebuild' && inp.getBoundingClientRect().width > 530) out.breit.push(n + ':' + Math.round(inp.getBoundingClientRect().width));
    });
    out.casedrill = !document.querySelector('#case-choice-actions button[onclick*="gtChoiceReveal"]');
    out.richtung = ['aspect', 'motion'].map(n => !!document.querySelector('#overlay-' + n + ' .gt-richtung .tense-switcher') && !document.querySelector('#overlay-' + n + ' .gt-settings .mode-btn[id*="dir"]'));
    out.sort = ['conj', 'decl', 'noun'].map(k => document.querySelector('#' + k + '-sort-btn span').textContent.slice(0, 12));
    out.namen = [document.querySelector('#conj-class-toggle span').textContent, document.querySelector('#noun-muster-toggle span').textContent, document.getElementById('wg-diff-easy').textContent, document.querySelector('.muster-alle-toggle span').textContent];
    // Hilfe Aspektpaare und Adjektiv-Deklination
    openAspect(); toggleAspectHint(); let h = 0; for (let i = 0; i < 40 && !h; i++) { restartAspect(); h = document.getElementById('aspect-hint') ? 1 : 0; } out.aspectHilfe = h; toggleAspectHint();
    openDecline(); const mit = /\(/.test(document.getElementById('decl-de-hint').textContent); toggleDeclHint(); out.declHilfe = [mit, /\(/.test(document.getElementById('decl-de-hint').textContent)]; toggleDeclHint();
    // Nur regelmäßige
    openCaseAdj(); toggleCaseAdjReg(); let reg = true; for (let i = 0; i < 60; i++) { restartCaseForm('adj'); if (!adjIstRegel(caseAdjState.current.word)) reg = false; gtRundeNeu('ca'); } toggleCaseAdjReg();
    openAdjForm(); toggleAdjFormReg(); for (let i = 0; i < 60; i++) { restartAdjForm(); if (!adjFormIstRegel(adjFormState.current)) reg = false; } toggleAdjFormReg();
    toggleTransformReg(); openTransform(); if (!transformState.queue.every(transformIstRegel)) reg = false; toggleTransformReg();
    out.reg = reg;
    // Abzeichen und Platzhalter
    openPronForm(); openAdjForm(); openTransform(); openWordgroup(); for (let i = 0; i < 40 && !wgState.current.hint; i++) restartWordgroup();
    out.chip = ['pronform', 'adjform', 'transform', 'aspect', 'wordgroup'].map(n => !!document.querySelector('#overlay-' + n + ' .cf-form-chip'));
    out.platz = [document.getElementById('pronform-input').placeholder, document.getElementById('adjform-input').placeholder, document.getElementById('caseadj-input').placeholder];
    // Kurzfassung nennt Abweichung; Sitzungszeile; Muster-Abzeichen
    openCaseForm('noun'); toggleCaseFormHint('noun'); updateGtSettingsSummary(); out.sumAb = document.querySelector('#overlay-caseform .gt-settings-sum').textContent; toggleCaseFormHint('noun');
    openConjugate(); out.sitzung = ['conj', 'decl', 'noun'].map(k => document.getElementById(k + '-score').textContent);
    out.muster = [...document.querySelectorAll('.gt-head-right > .gt-muster')].length;
    out.kbd = getComputedStyle(document.querySelector('#overlay-rektion')).display;
    return out;
  });
  ok('Runden überall 15', r.runden.length === 0, r.runden.join(' '));
  ok('„Neue Runde“ im ⋯-Menü jedes Rundenwerkzeugs', r.menue.length === 0, r.menue.join(' '));
  ok('Hilfe steht zuerst; jede Auswahlgruppe ist beschriftet', r.hilfe.length === 0 && r.label.length === 0, JSON.stringify([r.hilfe, r.label]));
  ok('Kurzfassung „Standard“ ohne Abweichung, sonst die Abweichung', r.sum.length === 0 && r.sumAb === 'Hilfe aus', JSON.stringify([r.sum, r.sumAb]));
  ok('Einzelwort-Felder und Tabellen höchstens 520 px breit (außer Satzbau)', r.breit.length === 0, r.breit.join(' '));
  ok('Kasus-Drill „Fall wählen“ ohne „Lösung zeigen“', r.casedrill);
  ok('Richtung als Reiter (Aspektpaare, Bewegungsverben)', r.richtung.every(Boolean), JSON.stringify(r.richtung));
  ok('Sortierung einheitlich benannt', r.sort.every(x => x === 'Sortierung: '), r.sort.join('|'));
  ok('Namen: Hilfe · Beispielwort · Nur regelmäßige · Sichere Muster', r.namen.join('|') === 'Hilfe|Beispielwort|Nur regelmäßige|Sichere Muster', r.namen.join('|'));
  ok('Hilfe in Aspektpaaren (Bildung) und Adjektiv-Deklination (Typ)', r.aspectHilfe === 1 && r.declHilfe[0] && !r.declHilfe[1], JSON.stringify([r.aspectHilfe, r.declHilfe]));
  ok('„Nur regelmäßige“ in Kasus bilden Adjektive, Kurzform & Steigerung, Umformen', r.reg);
  ok('gesuchte Form als Abzeichen', r.chip.every(Boolean), JSON.stringify(r.chip));
  ok('Platzhalter nennen die Form, höchstens Fall + Zahl', !r.platz.some(x => x === 'Form eingeben…') && !/männlich|Lebewesen/.test(r.platz[2]), r.platz.join(' | '));
  ok('Tabellen: Sitzungszeile immer sichtbar', r.sitzung.every(x => /^In dieser Sitzung: /.test(x)), r.sitzung.join(' | '));
  ok('Muster-Abzeichen in der Kopfzeile (6 Werkzeuge)', r.muster === 6, String(r.muster));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
