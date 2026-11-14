const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Beschädigte und alte Speicherwerte (14.11.): die App startet mit unbekannten Kategorien, kaputtem JSON,
// alten Einstellungswerten und fremden Typen in den Speicherschlüsseln – ohne Fehler und mit einer Karte
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const K = 'vokabeltrainer-';
  const faelle = {
    'unbekannte Kategorie in der Auswahl': [K + 'selection', JSON.stringify({ activeMain: 'gibtesnicht', activeSub: 'x', selectedCats: ['gibtesnicht'], blocks: { gibtesnicht: [0, 99] } })],
    'Auswahl ist ein Feld': [K + 'selection', '["a","b"]'], 'Auswahl kaputtes JSON': [K + 'selection', '{kaputt'],
    'unbekannte Lieblingskategorie': [K + 'favorite-cats', '["gibtesnicht"]'], 'unbekannte Ansicht': [K + 'view', 'gibtesnicht'],
    'unbekanntes Werkzeug': [K + 'grammar-panel', 'gibtesnicht'], 'unbekannte Grammatikgruppe': [K + 'grammar-cat-last', 'gibtesnicht'],
    'unbekannte Stufe': [K + 'my-level', 'Z9'], 'Stufenplan mit Fremdwerten': [K + 'level-plan', '{"x":"y"}'],
    'alte Einstellungswerte': [K + 'tool-settings', JSON.stringify({ nounNumber: 'x', cfKasus: 5, caKasus: 'Lok.', nnFaelle: 'r9', nnRange: 7, wgType: 'x', sbType: 'x', conjTense: 'x', declGender: 'x', hoertrainerOrder: 'x', musterAlle: 'ja' })],
    'Einstellungen kaputtes JSON': [K + 'tool-settings', '{kaputt'], 'Einstellungen sind Text': [K + 'tool-settings', '"text"'],
    'Übungsstand ist ein Feld': [K + 'grammar-srs', '[1,2]'], 'Übungsstand mit Fremdtypen': [K + 'grammar-srs', JSON.stringify({ conj: 5, caseform: 'x', muster: { 'ca|hart|fem|Gen.': { w: 'kein Feld' } }, wordgroup: { a: null } })],
    'Gesamtstand ist Text': [K + 'lifetime', '"text"'], 'Gesamtstand ohne Teile': [K + 'lifetime', '{}'], 'Gesamtstand mit Fremdtypen': [K + 'lifetime', JSON.stringify({ v: 5, g: { conj: 'x', muster: null }, lv: [], run: 'x' })],
    'Vokabelstand null': [K + 'scores', 'null'], 'Vokabelstand mit Fremdtypen': [K + 'scores', JSON.stringify({ 'мама': 5, 'папа': null, 'дом': 'x' })],
    'Merkliste ist ein Objekt': [K + 'bookmarks', '{"a":1}'], 'Tagesprotokoll mit Fremdtypen': [K + 'daylog', JSON.stringify({ heute: 'x', '2026-01-01': null })],
    'Hörtrainer mit unbekannter Kategorie': [K + 'hoertrainer-cats', '["gibtesnicht"]'], 'Blockgröße Text': [K + 'block-size', 'abc'], 'Sitzungsziel negativ': [K + 'session-goal', '-5'], 'Tempo Text': [K + 'speak-rate', 'abc'], 'Farbschema unbekannt': [K + 'theme', 'lila'],
  };
  const funde = [];
  for (const [name, [k, v]] of Object.entries(faelle)) {
    const c = await b.newContext(); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
    await p.addInitScript(([k, v]) => { try { if (!localStorage.getItem('__gesetzt')) { localStorage.setItem(k, v); localStorage.setItem('__gesetzt', '1'); } } catch (e) {} }, [k, v]);
    await p.goto('file://' + APP_PATH); await p.waitForTimeout(250);
    const s = await p.evaluate(async () => { window.speak = () => {}; const o = [];
      for (const v of ['home', 'vocab', 'grammar', 'listening', 'reading']) { try { setAppView(v); } catch (e) { o.push(v + ': ' + e.message.slice(0, 80)); } await new Promise(r => setTimeout(r, 40)); }
      try { GRAMMAR_PANELS.forEach(t => GRAMMAR_PANEL_OPENERS[t]()); updateGrammarTileProgress(); } catch (e) { o.push('Werkzeug: ' + e.message.slice(0, 80)); }
      try { setAppView('vocab'); selectMainCat('all'); if (!currentWord) o.push('keine Karte'); } catch (e) { o.push('Vokabeln: ' + e.message.slice(0, 80)); }
      try { saveToolSettings(); flushSaves(); } catch (e) { o.push('Speichern: ' + e.message.slice(0, 80)); }
      return o; });
    const f = [...new Set(errs)].concat(s); if (f.length) funde.push(name + ' → ' + f.join(' | '));
    await c.close();
  }
  ok(Object.keys(faelle).length + ' beschädigte oder alte Speicherwerte: Start ohne Fehler, alle Ansichten und Werkzeuge öffnen', funde.length === 0, funde.slice(0, 4).join(' ;; '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
