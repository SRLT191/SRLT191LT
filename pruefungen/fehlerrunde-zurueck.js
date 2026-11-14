const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Fehlerrunde (14.11.): Leiste über der Karte führt direkt zur vorher gewählten Kategorie zurück
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}; window.speak = () => {}; setAppView('vocab');
    const bar = () => document.getElementById('session-bar'), knopf = () => document.querySelector('#session-back-btn span').textContent;
    const cat = Object.keys(vocab)[3]; selectWholeCat(cat);
    out.vorher = bar().style.display === 'none';
    sessionWrong = getPool().slice(0, 2); retrySessionWrong();
    out.inRunde = [activeMain, bar().style.display, document.getElementById('session-bar-text').textContent, knopf() === '← Zurück zu „' + cat + '“'];
    retrySessionWrong();   // zweiter Aufruf überschreibt die gemerkte Auswahl nicht
    document.getElementById('session-back-btn').click();
    out.zurueck = [activeMain === cat, bar().style.display, getPool().length > 2, document.getElementById('sidebar-mobile-label').textContent === cat];
    // aus „Alle Kategorien“
    selectMainCat('all'); sessionWrong = getPool().slice(0, 1); retrySessionWrong(); out.alle = [knopf(), document.getElementById('session-bar-text').textContent]; sessionZurueck(); out.alleZ = activeMain;
    // gemerkte Auswahl gibt es nicht mehr → Alle Kategorien
    sessionWrong = getPool().slice(0, 1); retrySessionWrong(); sessionPrev = { main: 'gibtesnicht', sub: null }; sessionZurueck(); out.weg = activeMain;
    return out;
  });
  ok('Leiste nur in der Fehlerrunde', r.vorher && r.inRunde[0] === 'session' && r.inRunde[1] === 'flex', JSON.stringify(r.inRunde));
  ok('Leiste nennt Anzahl und die vorherige Kategorie', r.inRunde[2] === 'Fehler dieser Runde · 2 Wörter' && r.inRunde[3], r.inRunde[2]);
  ok('Zurück: Kategorie wieder gewählt, Leiste weg, voller Wortvorrat, Handy-Beschriftung', r.zurueck[0] && r.zurueck[1] === 'none' && r.zurueck[2] && r.zurueck[3], JSON.stringify(r.zurueck));
  ok('aus „Alle Kategorien“: Knopf und Einzahl', r.alle[0] === '← Zurück zu „Alle Kategorien“' && r.alle[1] === 'Fehler dieser Runde · 1 Wort' && r.alleZ === 'all', JSON.stringify(r.alle));
  ok('Auswahl gibt es nicht mehr → Alle Kategorien', r.weg === 'all', r.weg);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
