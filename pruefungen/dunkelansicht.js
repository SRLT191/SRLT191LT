const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
const { chromium } = require('playwright');
const FILE = 'file://' + (process.argv[2] || APP_PATH);
(async () => {
  const b = await chromium.launch();
  const all = {};
  const errs = [];
  for (const theme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 1100, height: 900 }, colorScheme: theme });
    p.on('dialog', d => d.dismiss());
    p.on('pageerror', e => errs.push(theme + ': ' + e.message));
    await p.goto(FILE); await p.waitForTimeout(300);
    const res = await p.evaluate((theme) => {
      const cur = document.documentElement.getAttribute('data-theme');
      if ((theme === 'dark') !== (cur === 'dark' || (!cur && matchMedia('(prefers-color-scheme: dark)').matches))) setThemeMode(theme);
      const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = el => { const stack = []; let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } e = e.parentElement; } let base = { r: 255, g: 255, b: 255 }; if (!stack.length || stack[stack.length - 1].a < 1) base = parse(getComputedStyle(document.body).backgroundColor) || base; for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
      const probs = [];
      const scan = label => {
        document.querySelectorAll('body *').forEach(el => {
          if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          if (el.closest('button:disabled, input:disabled, select:disabled')) return; // gesperrte Bedienelemente sind von der Kontrastregel ausgenommen
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
          const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
          let e = el, hidden = false; while (e) { if (getComputedStyle(e).display === 'none') { hidden = true; break; } e = e.parentElement; } if (hidden) return;
          const fg = parse(cs.color); if (!fg) return; const bg = bgOf(el);
          const fgc = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
          const L1 = lum(fgc), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          let op = 1; e = el; while (e) { op *= +getComputedStyle(e).opacity; e = e.parentElement; }
          const eff = op < 1 ? 1 + (ratio - 1) * op : ratio;
          if (eff < 3) probs.push(label + ' | ' + eff.toFixed(2) + ' | ' + (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + ' „' + el.textContent.trim().slice(0, 30) + '“');
        });
      };
      const steps = [
        ['Startseite', () => { setAppView('home'); }],
        ['Vokabeln', () => { setAppView('vocab'); setMode('free'); }],
        ['Vokabeln richtig', async () => { document.getElementById('answer-input').value = stripClarification(currentWord.de[0]); await checkAnswer(); }],
        ['Vokabeln falsch', async () => { nextWord(); document.getElementById('answer-input').value = 'qqq'; await checkAnswer(); }],
        ['Auswahl', () => { nextWord(); setMode('mc'); }],
        ['Aufdecken', () => { setMode('flip'); flipReveal(); }],
      ];
      GRAMMAR_PANELS.forEach(n => steps.push(['Grammatik ' + n, () => { setMode('free'); setAppView('grammar'); showGrammarPanel(n); const ib = document.querySelector('.grammar-panel.open .conj-info-btn'); if (ib && document.querySelector('.grammar-panel.open .conj-info-panel') && getComputedStyle(document.querySelector('.grammar-panel.open .conj-info-panel')).display === 'none') ib.click(); }]));
      steps.push(['Rektion beantwortet', () => { showGrammarPanel('rektion'); setRektionMode('choose'); answerRektion('Gen'); }]);
      steps.push(['Rektion Form falsch', () => { setRektionMode('form'); document.getElementById('rektion-input').value = 'xx'; checkRektion(); }]);
      steps.push(['Geschlecht beantwortet', () => { showGrammarPanel('gender'); restartGender(); answerGender('pl'); clearTimeout(genderState.timer); }]);
      steps.push(['Kurzform falsch', () => { showGrammarPanel('adjform'); document.getElementById('adjform-input').value = 'xx'; checkAdjForm(); }]);
      steps.push(['Satzbau Info', () => { showGrammarPanel('sentencebuild'); setWgType('imperative'); toggleSentenceBuildInfo(); }]);
      steps.push(['Geschlecht Info', () => { showGrammarPanel('gender'); toggleGenderInfo(); }]);
      steps.push(['Rektion Info', () => { showGrammarPanel('rektion'); setRektionMode('choose'); toggleRektionInfo(); }]);
      steps.push(['Konjugieren geprüft (falsch)', () => { showGrammarPanel('conjugate'); document.querySelectorAll('#overlay-conjugate input.conj-input').forEach((i, k) => i.value = k % 2 ? 'xx' : i.dataset.answer); checkConjugationTable(); }]);
      steps.push(['Konjugieren aufgedeckt', () => { revealConjugationTable(); }]);
      steps.push(['Wortgruppen falsch', () => { showGrammarPanel('wordgroup'); wgEl('input').value = 'xx'; checkWordgroup(); }]);
      const probeText = () => { if (!TEXTE.length) TEXTE.push({ id: 'probe', lvl: 'A1', titel: 'Проба', de: 'Probe', saetze: [{ ru: 'Это первое предложение, оно довольно длинное и идёт до конца строки.', de: 'Das ist der erste Satz, er ist ziemlich lang und reicht bis zum Zeilenende.' }, { ru: 'Второе.', de: 'Der zweite.' }] }); return TEXTE[0].id; };
      steps.push(['Textverständnis Liste', () => { probeText(); readState.id = null; setAppView('reading'); }]);
      steps.push(['Textverständnis Text', () => { setAppView('reading'); openText(probeText()); }]);
      steps.push(['Textverständnis Übersetzung', () => { setAppView('reading'); openText(probeText()); readZeigen(); toggleReadGanz(); }]);
      steps.push(['Textverständnis Abschluss', () => { setAppView('reading'); openText(probeText()); readNeu(); readZeigen(); readRate(false); readZeigen(); readRate(true); }]);
      ['hoertrainer','dictation','hearquiz'].forEach(n => steps.push(['Hören ' + n, () => { setAppView('listening'); showListeningPanel(n); }]));
      steps.push(['Diktat geprüft', () => { document.getElementById('dictation-input').value = 'нет да'; checkDictation(); }]);
      const dialogs = [['Einstellungen', "openSettings(); document.querySelectorAll('.set-sec').forEach(s => s.classList.add('open', 'active'))", 'overlay-settings'], ['Kürzel', 'openShortcuts()', 'overlay-settings'], ['Vokabelliste', 'openVocabList()', 'overlay-vocab'], ['Kategorien', 'openCategoryPicker()', 'overlay-categories'], ['Wortansicht', 'openWordDetail(currentWord)', 'overlay-worddetail'], ['Runde', 'openSessionSummary()', 'overlay-session'], ['Verbliste', "setAppView('grammar');showGrammarPanel('conjugate');openFormPicker('conj')", 'overlay-formpicker'], ['Stufen', 'openLevelOverview()', 'overlay-levels'], ['Einstufung', 'openPlacement();startPlacement()', 'overlay-placement'], ['Alphabet', 'openAlphabet()', 'overlay-alphabet'], ['Alphabet A–Я', "setAlphaOrder('abc')", 'overlay-alphabet']];
      return (async () => {
        for (const [l, f] of steps) { try { await f(); } catch (e) { probs.push(l + ' | Fehler ' + e.message); } scan(l); }
        for (const [l, f, id] of dialogs) { try { setAppView('vocab'); eval(f); } catch (e) {} scan('Dialog ' + l); try { closeOverlay(id); } catch (e) {} }
        return [...new Set(probs)];
      })();
    }, theme);
    all[theme] = res;
    await p.close();
  }
  for (const t in all) { const m = new Map(); all[t].forEach(x => { const [l, r, sel] = x.split(' | '); const key = (sel||'').replace(/ „.*/, ''); const v = m.get(key) || { r: 99, n: 0, ex: sel, where: l }; v.n++; if (+r < v.r) { v.r = +r; v.ex = sel; v.where = l; } m.set(key, v); });
    console.log('== ' + t + ': ' + m.size + ' verschiedene Stellen'); [...m.entries()].sort((a, b) => a[1].r - b[1].r).slice(0, 40).forEach(([k, v]) => console.log('  ' + v.r.toFixed(2) + ' ' + v.ex + ' (' + v.where + ')')); }
  if (errs.length) { console.log('XX JS-Fehler: ' + errs.slice(0, 3).join(' | ')); process.exitCode = 1; }
  await b.close();
})();
