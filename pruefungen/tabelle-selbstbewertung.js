const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Tabellen (20.11.): ganz aufgedeckt – mit „Lösung zeigen“ oder Feld für Feld mit dem Auge – ersetzen „Gewusst“ (1) /
// „Nicht gewusst“ (2) den Knopf „Prüfen“; Gewusst = gelernt (auch Punkte je Fall), danach nächstes Wort, „Prüfen“ wieder da
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const TOOLS = [
    ['noun', 'openNounDecline', 'noun-grid', 'revealNounRow', () => document.getElementById('noun-select').value],
    ['decl', 'openDecline', 'decl-grid', 'revealDeclensionRow', () => document.getElementById('decl-adj-select').value],
    ['conj', 'openConjugate', 'conj-grid', 'revealConjugationRow', () => conjId()],
    ['pronoun', 'openPronoun', 'pronoun-grid', 'revealPronounRow', () => document.getElementById('pronoun-select').value],
  ];
  for (const [name, open, grid, row] of TOOLS) {
    const r = await p.evaluate(([open, grid, row]) => {
      const fn = window[open] || (open === 'openDecline' ? window.openDeclensionTool || window.openAdjDecline : null) || (open === 'openPronoun' ? window.openPronounTable || window.openPronoun : null);
      if (!fn) return { fehlt: open };
      setAppView('grammar'); fn();
      const panel = document.getElementById(grid).closest('.grammar-panel'), pruefen = panel.querySelector('.gt-primary');
      const ins = [...document.querySelectorAll('#' + grid + ' .conj-input')].filter(i => !i.disabled);
      // Feld für Feld mit dem Auge (über die Zeilen-Ids)
      const pre = ins[0].id.replace(/\d+$/, '');
      ins.slice(0, -1).forEach(i => window[row](+i.id.slice(pre.length)));
      const vorLetztem = !!panel.querySelector('.gt-table-rate');
      window[row](+ins[ins.length - 1].id.slice(pre.length));
      const rate = panel.querySelector('.gt-table-rate .gt-rate');
      const o = { vorLetztem, rate: !!rate, pruefenWeg: pruefen && pruefen.style.display === 'none' };
      // Enter (Prüfen) springt nicht ohne Bewertung weiter
      const vorher = ins[0].dataset.answer; pruefen.click();
      o.bleibt = !!panel.querySelector('.gt-table-rate .gt-rate') && ins[0].isConnected;
      // Gewusst
      rate.querySelector('.gt-rate-yes').click();
      o.weiter = !panel.querySelector('.gt-table-rate') && pruefen.style.display === '';
      return o;
    }, [open, grid, row]);
    if (r.fehlt) { ok(name + ': Öffner gefunden', false, r.fehlt); continue; }
    ok(name + ': erst beim letzten Feld Gewusst/Nicht gewusst statt Prüfen', !r.vorLetztem && r.rate && r.pruefenWeg, JSON.stringify(r));
    ok(name + ': Prüfen/Enter springt nicht ohne Bewertung, Gewusst → nächstes Wort mit Prüfen', r.bleibt && r.weiter, JSON.stringify(r));
  }
  // Substantiv: Gewusst zählt Tabelle und Fälle, Nicht gewusst falsch
  const r = await p.evaluate(() => {
    localStorage.removeItem('vokabeltrainer-grammar-srs');
    openNounDecline(); const noun = document.getElementById('noun-select').value, ins = nounFallInputs();
    revealNounTable(); document.querySelector('.gt-table-rate .gt-rate-yes').click();
    const all = loadGrammarSrs(), id = noun + '|' + ins[0].dataset.num + '|' + ins[0].dataset.kasus;
    const a = { gelernt: srsDone((all[nounSrsKey()] || {})[noun] || {}), fall: ((all['noun:fall'] || {})[id] || {}).correct || 0 };
    const noun2 = document.getElementById('noun-select').value; revealNounTable(); document.querySelector('.gt-table-rate .gt-rate-no').click();
    const e2 = (loadGrammarSrs()[nounSrsKey()] || {})[noun2] || {};
    return { a, nein: !srsDone(e2) && (e2.wrong || 0) > 0, anderes: noun2 !== noun };
  });
  ok('Substantiv: Gewusst = Tabelle und Fälle gelernt, Nicht gewusst = falsch', r.a.gelernt && r.a.fall > 0 && r.nein && r.anderes, JSON.stringify(r));
  // Tastatur 1
  const k = await p.evaluate(() => { openNounDecline(); const n = document.getElementById('noun-select').value; revealNounTable(); return n; });
  await p.keyboard.press('1'); await p.waitForTimeout(100);
  const k2 = await p.evaluate(() => ({ n: document.getElementById('noun-select').value, rate: !!document.querySelector('.gt-table-rate') }));
  ok('Taste 1 = Gewusst', k2.n !== k && !k2.rate, JSON.stringify(k2));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
