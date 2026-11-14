const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
const { chromium } = require('playwright');
const FILE = 'file://' + (process.argv[2] || APP_PATH);
const THEME = process.argv[3] || '';
(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const w of [320, 360, 390, 700, 768]) {
    const p = await b.newPage({ viewport: { width: w, height: 800 } });
    p.on('pageerror', e => out.push(w + ' JS: ' + e.message));
    p.on('dialog', d => d.dismiss());
    await p.goto(FILE); await p.waitForTimeout(300);
    const res = await p.evaluate(() => {
      const probs = [];
      const test = (label) => {
        const doc = document.documentElement;
        if (doc.scrollWidth > innerWidth + 1) probs.push(label + ': Seite ' + doc.scrollWidth + 'px');
        // sichtbare Elemente, die über den rechten Rand ragen oder aus ihrem Kasten laufen
        document.querySelectorAll('table, .grammar-panel.open *, .overlay.open *').forEach(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || getComputedStyle(el).visibility === 'hidden') return;
          if (el.tagName === 'TABLE') {
            const box = el.parentElement.getBoundingClientRect();
            const scroller = (() => { let e = el.parentElement; while (e) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowX)) return true; e = e.parentElement; } return false; })();
            const pcs = getComputedStyle(el.parentElement); const inner = box.right - parseFloat(pcs.paddingRight) - parseFloat(pcs.borderRightWidth);
            if (r.right > inner + 2 && !/(auto|scroll)/.test(pcs.overflowX)) probs.push(label + ': Tabelle ' + (el.id || el.className || '') + ' +' + Math.round(r.right - inner) + 'px');
          } else if (r.right > innerWidth + 2) {
            const sc = (() => { let e = el.parentElement; while (e) { const s = getComputedStyle(e); if (/(auto|scroll|hidden)/.test(s.overflowX)) return true; e = e.parentElement; } return false; })();
            if (!sc) probs.push(label + ': ' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : '') + ' +' + Math.round(r.right - innerWidth) + 'px');
          }
        });
      };
      const views = [
        ['Startseite', () => setAppView('home')],
        ['Vokabeln', () => setAppView('vocab')],
        ['Vokabeln falsch', () => { setAppView('vocab'); setMode('free'); document.getElementById('answer-input').value = 'Krankenhauseinweisungsformularausgabestelle'; checkAnswer(); }],
        ['Vokabeln Auswahl', () => { setAppView('vocab'); setMode('mc'); }],
        ['Vokabeln Aufdecken', () => { setMode('flip'); flipReveal(); }],
      ];
      GRAMMAR_PANELS.forEach(n => views.push(['Grammatik ' + n, () => { setMode('free'); setAppView('grammar'); showGrammarPanel(n); const ib = document.querySelector('.grammar-panel.open .conj-info-btn'); if (ib) ib.click(); if (typeof revealCurrentTool === 'function') revealCurrentTool(); }]));
      views.push(['Rektion beantwortet', () => { showGrammarPanel('rektion'); setRektionMode('choose'); answerRektion('Gen'); }]);
      views.push(['Rektion Form falsch', () => { setRektionMode('form'); document.getElementById('rektion-input').value = 'xx'; checkRektion(); }]);
      views.push(['Geschlecht beantwortet', () => { showGrammarPanel('gender'); restartGender(); answerGender('pl'); clearTimeout(genderState.timer); }]);
      views.push(['Kurzform falsch', () => { showGrammarPanel('adjform'); document.getElementById('adjform-input').value = 'xx'; checkAdjForm(); }]);
      views.push(['Satzbau Info', () => { showGrammarPanel('sentencebuild'); setWgType('imperative'); toggleSentenceBuildInfo(); }]);
      views.push(['Geschlecht Info', () => { showGrammarPanel('gender'); toggleGenderInfo(); }]);
      views.push(['Rektion Info', () => { showGrammarPanel('rektion'); setRektionMode('choose'); toggleRektionInfo(); }]);
      views.push(['Konjugieren Vergangenheit', () => { showGrammarPanel('conjugate'); setConjTense('past'); }]);
      views.push(['Substantive Plural', () => { showGrammarPanel('noun'); setNounNumber('pl'); }]);
      views.push(['Bewegung Liste', () => { showGrammarPanel('motion'); setMotionMode('list'); }]);
      views.push(['Aspekt Liste', () => { showGrammarPanel('aspect'); setAspectMode('list'); }]);
      const probeText = () => { if (!TEXTE.length) TEXTE.push({ id: 'probe', lvl: 'A1', titel: 'Проба', de: 'Probe', saetze: [{ ru: 'Это первое предложение, оно довольно длинное и идёт до конца строки.', de: 'Das ist der erste Satz, er ist ziemlich lang und reicht bis zum Zeilenende.' }, { ru: 'Второе.', de: 'Der zweite.' }] }); return TEXTE[0].id; };
      views.push(['Textverständnis Liste', () => { probeText(); readState.id = null; setAppView('reading'); }]);
      views.push(['Textverständnis Text', () => { setAppView('reading'); openText(probeText()); }]);
      views.push(['Textverständnis Übersetzung', () => { setAppView('reading'); openText(probeText()); readZeigen(); toggleReadGanz(); }]);
      views.push(['Textverständnis Abschluss', () => { setAppView('reading'); openText(probeText()); readNeu(); readZeigen(); readRate(false); readZeigen(); readRate(true); }]);
      ['hoertrainer','dictation','hearquiz'].forEach(n => views.push(['Hören ' + n, () => { setAppView('listening'); showListeningPanel(n); const ib = document.querySelector('#listening-' + n + ' .conj-info-btn, #overlay-' + n + ' .conj-info-btn'); if (ib) ib.click(); }]));
      const dialogs = [['Einstellungen', "openSettings(); document.querySelectorAll('.set-sec').forEach(s => s.classList.add('open', 'active'))", 'overlay-settings'], ['Kürzel', 'openShortcuts()', 'overlay-settings'], ['Vokabelliste', 'openVocabList()', 'overlay-vocab'], ['Alphabet', 'openAlphabet()', 'overlay-alphabet'], ['Kategorien', 'openCategoryPicker()', 'overlay-categories'], ['Blöcke', "openBlockPicker('Essen')", 'overlay-blocks'], ['Wortansicht', 'openWordDetail(currentWord)', 'overlay-worddetail'], ['Runde', 'openSessionSummary()', 'overlay-session'], ['Hörquiz-Runde', 'openHearquizSession()', 'overlay-hq-session'], ['Verbliste', "setAppView('grammar');showGrammarPanel('conjugate');openFormPicker('conj')", 'overlay-formpicker'], ['Stufen', 'openLevelOverview()', 'overlay-levels'], ['Einstufung', 'openPlacement();startPlacement()', 'overlay-placement'], ['Nomenliste', "showGrammarPanel('noun');openFormPicker('noun')", 'overlay-formpicker']];
      for (const [l, f] of views) { try { f(); } catch (e) { probs.push(l + ': Fehler ' + e.message); } test(l); }
      for (const [l, f, id] of dialogs) { try { setAppView('vocab'); eval(f); } catch (e) { probs.push(l + ': Fehler ' + e.message); } test('Dialog ' + l); try { closeOverlay(id); } catch (e) {} }
      return [...new Set(probs)];
    });
    res.forEach(r => out.push(w + 'px ' + r));
    await p.close();
  }
  console.log(out.length ? out.join('\n') : 'kein Überlauf');
  await b.close();
})();
