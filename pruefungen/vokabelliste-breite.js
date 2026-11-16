const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Vokabelliste: am PC breit genug für alle Spalten, passt sich jeder Dialogbreite an (auch nach Größe-Ziehen)
// statt seitlich zu rollen; schmal entfällt die Spalte „Kategorie“; beginnt immer links oben.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const lauf = async (w, h, size, opt = {}) => {
    const p = await b.newPage(Object.assign({ viewport: { width: w, height: h } }, opt)); p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
    await p.evaluate(s => { if (s) localStorage.setItem('vokabeltrainer-dialog-sizes', JSON.stringify({ 'overlay-vocab': s })); }, size);
    if (size) { await p.reload(); await p.waitForTimeout(300); }
    const r = await p.evaluate(() => {
      setAppView('vocab'); activateCatGroup('Alltag'); openVocabList();
      const body = document.querySelector('#overlay-vocab .overlay-body'); body.scrollLeft = 300;   // alte Rollposition
      closeOverlay('overlay-vocab'); openVocabList();
      const box = document.querySelector('#overlay-vocab .overlay-box');
      const sichtbar = el => el && getComputedStyle(el).display !== 'none';
      return { box: Math.round(box.getBoundingClientRect().width), cw: body.clientWidth, sw: body.scrollWidth, sl: body.scrollLeft,
        kat: sichtbar(document.querySelector('#overlay-vocab .vocab-table th:nth-child(3)')), stand: sichtbar(document.querySelector('#overlay-vocab .vocab-table th:nth-child(4)')),
        doc: document.documentElement.scrollWidth };
    });
    await p.close(); return r;
  };
  let r = await lauf(2000, 1092, null);
  ok('PC 2000 px: Liste 960 px breit, alle Spalten sichtbar, kein seitliches Rollen', r.box === 960 && r.kat && r.stand && r.sw <= r.cw, JSON.stringify(r));
  ok('beginnt links (alte Rollposition zurückgesetzt)', r.sl === 0, String(r.sl));
  r = await lauf(2000, 1092, { w: 456, h: 860 });
  ok('selbst schmal gezogen (456 px): kein seitliches Rollen, Kategorie ausgeblendet, Stand bleibt', r.box === 456 && r.sw <= r.cw && !r.kat && r.stand, JSON.stringify(r));
  r = await lauf(1280, 800, null);
  ok('PC 1280 px: alle Spalten, kein seitliches Rollen', r.kat && r.sw <= r.cw, JSON.stringify(r));
  r = await lauf(360, 740, null, { isMobile: true, hasTouch: true });
  ok('Handy 360 px: kein seitliches Rollen, Seite läuft nicht über', r.sw <= r.cw && r.doc <= 360 && r.stand, JSON.stringify(r));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
