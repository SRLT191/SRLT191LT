const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
// Stufenplan (Checkliste) und Stufe abschließen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = f => p.evaluate(f);
  await check('Stufenplan sichtbar mit Reitern A1–C1', () => ev(() => { openLevelOverview(); const tabs = [...document.querySelectorAll('#lvl-plan-tabs .mode-btn')].map(b => b.dataset.l).join(','); return { ok: tabs === 'A1,A2,B1,B2,C1' && !!document.querySelector('#lvl-plan .lvl-check'), info: tabs }; }));
  await check('A1: Wörter + 12 Werkzeuge, A2: Teile zum Abhaken', () => ev(() => { renderLevelPlan('A1'); const a1 = document.querySelectorAll('#lvl-plan .lvl-check li').length; renderLevelPlan('A2'); const man = document.querySelectorAll('#lvl-plan .lvl-manual input').length; const txt = document.querySelector('#lvl-plan .lvl-manual').textContent; return { ok: a1 === 13 && man === 15, info: a1 + ' Punkte A1, ' + man + ' Teile A2: ' + txt }; }));
  await check('B1: Hinweis ohne Grammatikwerkzeuge', () => ev(() => { renderLevelPlan('B1'); return !!document.querySelector('#lvl-plan .lvl-none'); }));
  await check('Teil abhaken bleibt gespeichert', () => ev(() => { renderLevelPlan('A2'); const cb = document.querySelector('#lvl-plan .lvl-manual input'); cb.click(); renderLevelPlan('A2'); const on = document.querySelector('#lvl-plan .lvl-manual input').checked; document.querySelector('#lvl-plan .lvl-manual input').click(); renderLevelPlan('A2'); const off = !document.querySelector('#lvl-plan .lvl-manual input').checked; return on && off; }));
  await check('Automatischer Haken ab 90 % (Wörter A1)', () => ev(() => { const ws = allVocabWords().filter(w => wordLevel(w) === 'A1'); ws.slice(0, Math.ceil(ws.length * 0.9)).forEach(w => lifeVocab(getKey(w), true, 1)); renderLevelPlan('A1'); return !!document.querySelector('#lvl-plan .lvl-check li:first-child .lvl-ok'); }));
  await check('Werkzeug-Link öffnet Werkzeug', () => ev(() => { renderLevelPlan('A1'); document.querySelector('#lvl-plan .lvl-link').click(); const ok = appView === 'grammar' && !document.getElementById('overlay-levels').classList.contains('open'); setAppView('vocab'); return ok; }));
  // Abschluss
  await check('Abschluss A1 starten: nur A1-Wörter, auch erledigte', () => ev(() => { resetProgress(); const w0 = allVocabWords().find(w => wordLevel(w) === 'A1'); updateScore(w0, true); openLevelOverview(); renderLevelPlan('A1'); [...document.querySelectorAll('#lvl-plan button')].find(b => /abschließen/.test(b.textContent)).click(); const pool = getPool(); return { ok: activeMain === 'exam' && pool.length === allVocabWords().filter(w => wordLevel(w) === 'A1').length && pool.every(w => wordLevel(w) === 'A1') && !!currentWord && wordLevel(currentWord) === 'A1', info: pool.length + ' Wörter, Karte ' + currentWord.ru }; }));
  await check('Erstversuch zählt, Wiederholung nicht', () => ev(() => { const w = currentWord, k = getKey(w); updateScore(w, false); updateScore(w, true); return levelExam.first[k] === false && Object.keys(levelExam.first).length === 1; }));
  await check('Abschluss bleibt nach Neuladen erhalten', async () => { await p.reload(); await p.waitForTimeout(400); return ev(() => ({ ok: !!levelExam && activeMain === 'exam' && Object.keys(levelExam.first).length === 1, info: activeMain })); });
  await check('Aufdecken + Zurücknehmen nimmt Erstversuch zurück', () => ev(() => { setMode('flip'); const k = getKey(currentWord); flipReveal(); flipJudge(true); const a = k in levelExam.first; undoFlip(); const b2 = k in levelExam.first; setMode('free'); return { ok: a && !b2, info: a + '→' + b2 }; }));
  await check('Stufenplan zeigt laufenden Abschluss', () => ev(() => { openLevelOverview(); const t = document.getElementById('lvl-plan').textContent; closeOverlay('overlay-levels'); return { ok: /Abschluss läuft: 1 von \d+ Wörtern/.test(t), info: t.slice(0, 80) }; }));
  await check('Durchspielen mit ≥ 90 % → bestanden mit Datum', () => ev(() => { let i = 0; while (currentWord && i < 900) { updateScore(currentWord, i % 15 !== 0); nextWord(); i++; } const t = document.getElementById('caught-up-title').textContent; const L = loadLifetime(); return { ok: /A1 bestanden!/.test(t) && !!(L.lv && L.lv.A1), info: t + ' · ' + document.getElementById('caught-up-sub').textContent }; }));
  await check('„Zurück zu allen Wörtern“ beendet Abschluss', () => ev(() => { document.getElementById('caught-up-btn').click(); return activeMain === 'all' && !levelExam && !localStorage.getItem('vokabeltrainer-level-exam'); }));
  await check('Stufenplan: A1 bestanden am …, Pokal am Reiter', () => ev(() => { openLevelOverview(); renderLevelPlan('A1'); const t = document.getElementById('lvl-plan').textContent; const tab = !!document.querySelector('#lvl-plan-tabs [data-l="A1"] .ti-trophy'); closeOverlay('overlay-levels'); return { ok: /A1 bestanden am/.test(t) && tab, info: t.slice(0, 60) }; }));
  await check('Nicht bestanden unter 90 %', () => ev(() => { delete loadLifetime().lv.A2; startLevelExam('A2'); let i = 0; while (currentWord && i < 3000 && activeMain === 'exam' && getComputedStyle(document.getElementById('caught-up-panel')).display === 'none') { updateScore(currentWord, i % 2 === 0); nextWord(); i++; } const t = document.getElementById('caught-up-title').textContent; return { ok: /A2 noch nicht bestanden/.test(t) && !loadLifetime().lv.A2, info: t }; }));
  await check('Abbrechen über Stufenplan', () => ev(() => { startLevelExam('B1'); updateScore(currentWord, true); cancelLevelExam(); return !levelExam && activeMain === 'all'; }));
  await check('Normale Übung nach Abschluss unverändert', () => ev(() => { selectMainCat('all'); return !!currentWord && getPool().length > 1000; }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
