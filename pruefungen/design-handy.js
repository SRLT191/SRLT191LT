const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Design (12.11.): Lautsprecher direkt neben dem Wort in allen Werkzeugen (löst den versteckten Lautsprecher aus, auch automatisch);
// Handy: Kopf mit Titel und ⋯ in einer Zeile, Fortschritt darunter; Navigation: Bereich zugeklappt + waagerecht scrollbare Werkzeugzeile
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const init = () => { window.__sp = []; const fake = { speaking: false, pending: false, paused: false, getVoices: () => [{ lang: 'ru-RU', name: 'RU' }], cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}, onvoiceschanged: null, speak(u) { window.__sp.push(u.text); } }; Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
  const p = await b.newPage({ viewport: { width: 1300, height: 850 } }); p.on('pageerror', e => errs.push(e.message)); await p.addInitScript(init);
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const out = { fehlt: [], stumm: [] }; setAppView('grammar');
    for (const n of GRAMMAR_PANELS) {
      GRAMMAR_PANEL_OPENERS[n](); await sleep(20); const panel = document.getElementById('overlay-' + n);
      const modes = [...panel.querySelectorAll('.gt-modes .mode-btn')];
      for (const m of (modes.length ? modes : [null])) {
        if (m) m.click(); await sleep(20);
        panel.querySelectorAll('.gt-task').forEach(t => {
          if (!t.getClientRects().length) return;
          const src = t.querySelector('.gt-task-tools button[onclick*="speak"]'); if (!src) return;
          const ib = t.querySelector('.gt-speak-inline');
          if (!ib || !ib.getClientRects().length || src.getClientRects().length) { out.fehlt.push(n + (m ? '/' + m.textContent.trim() : '')); return; }
          __sp.length = 0; if (!ib.disabled) { ib.click(); if (!__sp.length) out.stumm.push(n); }
        });
      }
    }
    // Neuaufbau: Knopf kommt wieder; gesperrt wie die Quelle (Satzbau vor der Antwort)
    openGender(); nextGender(); await sleep(10); out.neu = !!document.querySelector('#gender-q .gt-speak-inline');
    openSentenceBuild(); restartWordgroup(); await sleep(10); out.gesperrt = document.querySelector('#overlay-sentencebuild .gt-speak-inline').disabled;
    revealWordgroup(); await sleep(10); out.frei = !document.querySelector('#overlay-sentencebuild .gt-speak-inline').disabled;
    // automatisches Vorlesen mit versteckter Quelle
    __sp.length = 0; openNumNoun(); document.getElementById('numnoun-input').value = 'x'; checkNumNoun(); out.auto = __sp.length;
    out.chevDesktop = [...document.querySelectorAll('.gcat-chev')].some(c => c.getClientRects().length);
    return out;
  });
  ok('Lautsprecher neben dem Wort in allen Werkzeugen (Quelle versteckt)', !r.fehlt.length, r.fehlt);
  ok('Knopf neben dem Wort liest vor', !r.stumm.length, r.stumm);
  ok('nach Neuaufbau wieder da, gesperrt wie die Quelle', r.neu && r.gesperrt && r.frei, r);
  ok('automatisches Vorlesen trotz versteckter Quelle', r.auto === 1, r.auto);
  ok('Desktop: kein Pfeil an den Bereichen', !r.chevDesktop);
  const m = await b.newPage({ ...devices['Pixel 7'] }); m.on('pageerror', e => errs.push(e.message)); await m.addInitScript(init);
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); setAppView('grammar'); openGender(); await sleep(50);
    const hd = document.querySelector('#overlay-gender .grammar-panel-header'), t = hd.querySelector('.overlay-title-group').getBoundingClientRect(), mo = hd.querySelector('.gt-more').getBoundingClientRect(), pr = hd.querySelector('.grammar-panel-progress').getBoundingClientRect();
    const cats = document.getElementById('grammar-cats'), nav = document.getElementById('grammar-nav');
    const sichtbar = [...cats.querySelectorAll('.grammar-chip')].filter(c => c.getClientRects().length).length;
    const navH = nav.getBoundingClientRect().height, chip = document.getElementById('gchip-gender').getBoundingClientRect(), navR = nav.getBoundingClientRect();
    document.getElementById('gcat-noun').click(); const auf = [...cats.querySelectorAll('.grammar-chip')].filter(c => c.getClientRects().length).length;
    document.getElementById('gcat-verb').click(); await sleep(30); const zu = [...cats.querySelectorAll('.grammar-chip')].filter(c => c.getClientRects().length).length;
    return { eineZeile: Math.abs((t.top + t.bottom) / 2 - (mo.top + mo.bottom) / 2) < 12, fortUnter: pr.top >= t.bottom - 4 && pr.left < t.left + 40,
      sichtbar, navEinzeilig: navH < 60, chipImBild: chip.left >= navR.left - 1 && chip.right <= navR.right + 1, auf, zu, verb: document.getElementById('gcat-verb').classList.contains('active'), breit: document.documentElement.scrollWidth <= innerWidth };
  });
  ok('Handy: Titel und ⋯ in einer Zeile, Fortschritt darunter', h.eineZeile && h.fortUnter, h);
  ok('Handy: Bereich zugeklappt, Werkzeugzeile einzeilig, aktives Werkzeug im Bild', h.sichtbar === 1 && h.navEinzeilig && h.chipImBild, h);
  ok('Handy: Bereich antippen klappt auf, Auswahl klappt wieder zu', h.auf === 6 && h.zu === 1 && h.verb && h.breit, h);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
