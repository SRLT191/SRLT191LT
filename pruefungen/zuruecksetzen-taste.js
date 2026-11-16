const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
// Tastenkürzel + für das einfache Zurücksetzen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = f => p.evaluate(f);
  const fill = () => ev(() => { getPool().slice(0, 5).forEach(w => updateScore(w, true)); progressMark('gender', 'дом', true); return Object.keys(scores).length; });
  await fill();
  await check('+ im Antwortfeld setzt nicht zurück', async () => { await ev(() => setAppView('vocab')); await p.focus('#answer-input'); await p.keyboard.type('ab'); await p.keyboard.press('+'); return ev(() => ({ ok: Object.keys(scores).length === 5 && document.activeElement.id === 'answer-input', info: 'Feld: „' + document.getElementById('answer-input').value + '“' })); });
  await check('+ außerhalb des Feldes setzt zurück', async () => { await ev(() => { document.getElementById('answer-input').value = ''; document.activeElement.blur(); }); await p.keyboard.press('+'); return ev(() => !Object.keys(scores).length && !Object.keys(grammarSrs).length); });
  await check('Gesamtstand bleibt', () => ev(() => !!loadLifetime().g.gender['дом']));
  await fill();
  await check('+ auf dem Ziffernblock', async () => { await ev(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('NumpadAdd'); return ev(() => !Object.keys(scores).length); });
  await fill();
  await check('Strg++ (Zoom) setzt nicht zurück', async () => { await p.keyboard.press('Control++'); return ev(() => Object.keys(scores).length === 5); });
  await check('Alt+R setzt nicht mehr zurück', async () => { await p.keyboard.press('Alt+KeyR'); return ev(() => Object.keys(scores).length === 5); });
  await check('Bei offenem Dialog tut + nichts', async () => { await ev(() => openSettings()); await p.keyboard.press('+'); const n = await ev(() => Object.keys(scores).length); await ev(() => closeOverlay('overlay-settings')); return n === 5; });
  await check('In der Grammatik-Ansicht: im Eingabefeld nicht, außerhalb schon', async () => { await ev(() => { setAppView('grammar'); showGrammarPanel('caseform'); }); const inp = await p.$('#overlay-caseform input[type=text], #overlay-caseform input:not([type])'); let imFeld = true; if (inp) { await inp.focus(); await p.keyboard.press('+'); imFeld = await ev(() => Object.keys(scores).length === 5); await ev(() => document.activeElement.blur()); } await p.keyboard.press('+'); const ok = await ev(() => !Object.keys(scores).length); await ev(() => setAppView('vocab')); return { ok: imFeld && ok, info: imFeld + ' ' + ok }; });
  await check('Steht in der Übersicht und am Knopf', () => ev(() => /\+\s*Fortschritt zurücksetzen/.test(document.getElementById('set-sec-kuerzel').textContent.replace(/\s+/g, ' ')) && /Taste \+/.test(document.querySelector('.tool-btn-reset').title) && !/Alt\+R/.test(document.documentElement.outerHTML)));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
