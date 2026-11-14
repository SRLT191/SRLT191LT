const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Präparierte Sicherung (14.11.): HTML und Skript in allen Feldern einer Sicherung dürfen nie ausgeführt
// oder als Element in die Seite gesetzt werden – weder beim Einlesen noch nach dem Neuladen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  p.on('pageerror', e => errs.push(e.message.slice(0, 140))); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const alles = () => p.evaluate(async () => { window.speak = () => {};
    for (const v of ['home', 'vocab', 'grammar', 'listening', 'reading']) { try { setAppView(v); } catch (e) {} await new Promise(r => setTimeout(r, 60)); }
    try { GRAMMAR_PANELS.forEach(t => GRAMMAR_PANEL_OPENERS[t]()); updateGrammarTileProgress(); } catch (e) {}
    // alle Dialoge und Listen öffnen (ohne Zurücksetzen, GitHub, Ein-/Ausfuhr)
    document.querySelectorAll('[onclick*="open"], [onclick*="show"]').forEach(el => { const s = el.getAttribute('onclick'); if (/reset|gh[A-Z]|import|export|l[öo]sch|Picker\(\)/i.test(s)) return; try { el.click(); } catch (e) {} });
    await new Promise(r => setTimeout(r, 400));
    return { xss: window.__xss || 0, elemente: document.querySelectorAll('img[src="x"], svg[onload]').length }; });
  const merge = await p.evaluate(() => {
    const X = '<img src=x onerror="window.__xss=(window.__xss||0)+1">', X2 = '"><svg onload="window.__xss=(window.__xss||0)+1">';
    const now = Date.now(), e = { correct: 0, wrong: 9, box: 0, lastSeen: now, w: [X, X2] }, le = { c: 0, w: 9, mb: 0, l: 0, d: 0, dd: now, z: now, f: 9 };
    const g = {}, lg = {}; Object.values(grammarToolSources()).flatMap(s => s[0]).concat(['muster', 'noun:fall', 'decl:fall']).forEach(k => { g[k] = { [X]: e, [X2]: e }; lg[k] = { [X]: le, [X2]: le }; });
    const K = 'vokabeltrainer-', data = { [K + 'grammar-srs']: JSON.stringify(g), [K + 'lifetime']: JSON.stringify({ v: { [X]: le, [X2]: le }, g: lg, lv: {}, run: 1 }), [K + 'scores']: JSON.stringify({ [X]: e, [X2]: e }), [K + 'scores-de-ru']: JSON.stringify({ [X]: e }),
      [K + 'bookmarks']: JSON.stringify([X, X2]), [K + 'selection']: JSON.stringify({ activeMain: X, activeSub: X2, selectedCats: [X, X2] }), [K + 'favorite-cats']: JSON.stringify([X, X2]),
      [K + 'tool-settings']: JSON.stringify({ nounNumber: X, cfKasus: X2, nnFaelle: X, wgType: X, conjVerb: X, declAdj: X2, noun: X, pronoun: X }), [K + 'level-plan']: JSON.stringify({ [X]: X }), [K + 'my-level']: X, [K + 'theme']: X2, [K + 'view']: X,
      [K + 'grammar-panel']: X2, [K + 'grammar-cat-last']: X, [K + 'daylog']: JSON.stringify({ [X]: [1, 1] }), [K + 'hoertrainer-cats']: JSON.stringify([X]) };
    // alle übrigen Sicherungsschlüssel ebenfalls präparieren (abwechselnd als Text und als JSON-Feld)
    BACKUP_KEYS.filter(k => !(k in data)).forEach((k, i) => { data[k] = i % 2 ? X : JSON.stringify([X, X2]); });
    const fehlt = BACKUP_KEYS.filter(k => !(k in data));
    try { mergeAllFromBackup(data); flushSaves(); return { fehlt, n: Object.keys(data).length }; } catch (er) { return { fehler: er.message }; } });
  ok('präparierte Sicherung wird ohne Absturz eingelesen (' + merge.n + ' Schlüssel)', !merge.fehler, merge.fehler || '');
  const a = await alles();
  ok('nach dem Einlesen: nichts ausgeführt, kein eingeschleustes Element', a.xss === 0 && a.elemente === 0, JSON.stringify(a));
  await p.reload(); await p.waitForTimeout(500);
  const z = await alles();
  ok('nach dem Neuladen: nichts ausgeführt, kein eingeschleustes Element', z.xss === 0 && z.elemente === 0, JSON.stringify(z));
  ok('keine JS-Fehler und keine Dialoge', errs.length === 0, [...new Set(errs)].slice(0, 3).join(' | '));
  if (merge.fehlt && merge.fehlt.length) console.log('-- Hinweis: Sicherungsschlüssel ohne präparierten Wert: ' + merge.fehlt.join(', '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
