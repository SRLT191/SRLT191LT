const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Auto-Vorlesen in den Vokabeln: RU → DE liest das Wort beim Anzeigen, DE → RU erst nach der Antwort
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__sp = []; const fake = { speaking: false, pending: false, paused: false, getVoices: () => [{ lang: 'ru-RU', name: 'RU' }], cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}, onvoiceschanged: null, speak(u) { window.__sp.push(u.text); } }; Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); window.SpeechSynthesisUtterance = function (t) { this.text = t; }; });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = (f, a) => p.evaluate(f, a);
  // eine Karte in Richtung dir und Modus mode zeigen; liefert, was beim Anzeigen gesprochen wurde
  const karte = (dir, mode, auto) => ev(([dir, mode, auto]) => {
    // vorgelesen wird nur in der Vokabelansicht (beim Start steht „Heute“)
    setAppView('vocab'); autoplayAudio = auto; setDirection(dir); setMode(mode);
    const w = allVocabWords().find(x => x.ru === 'книга'); __sp.length = 0; renderCard(w);
    return { beimAnzeigen: [...__sp], ru: w.ru };
  }, [dir, mode, auto]);
  const gesprochen = () => ev(() => __sp.filter(t => t === 'книга').length);

  await check('RU → DE: liest beim Anzeigen (wie bisher)', async () => {
    const k = await karte('ru-de', 'free', true); await ev(() => { __sp.length = 0; document.getElementById('answer-input').value = 'Buch'; return checkAnswer(); });
    const danach = await gesprochen(); return { ok: k.beimAnzeigen.includes('книга') && danach === 0, info: 'Anzeigen: ' + k.beimAnzeigen.join(',') + ' · nach Antwort: ' + danach };
  });
  await check('DE → RU Freitext: nichts beim Anzeigen, russisches Wort nach dem Prüfen', async () => {
    const k = await karte('de-ru', 'free', true); await ev(() => { document.getElementById('answer-input').value = 'qqq'; return checkAnswer(); });
    const n = await gesprochen(); return { ok: k.beimAnzeigen.length === 0 && n === 1, info: 'Anzeigen: ' + k.beimAnzeigen.length + ' · nach Prüfen: ' + n };
  });
  await check('DE → RU Auswahl: nach dem Antippen', async () => {
    const k = await karte('de-ru', 'mc', true); await ev(() => checkMC(0)); const n = await gesprochen();
    return { ok: k.beimAnzeigen.length === 0 && n === 1, info: 'nach Antippen: ' + n };
  });
  await check('DE → RU Aufdecken: beim Aufdecken', async () => {
    const k = await karte('de-ru', 'flip', true); await ev(() => flipReveal()); const n = await gesprochen();
    return { ok: k.beimAnzeigen.length === 0 && n === 1, info: 'nach Aufdecken: ' + n };
  });
  await check('DE → RU Auflösen (←): liest die Lösung', async () => {
    await karte('de-ru', 'free', true); await ev(() => revealCurrentWord()); const n = await gesprochen();
    return { ok: n === 1, info: 'nach Auflösen: ' + n };
  });
  await check('Auto-Vorlesen aus: DE → RU bleibt stumm', async () => {
    await karte('de-ru', 'free', false); await ev(() => { document.getElementById('answer-input').value = 'книга'; return checkAnswer(); });
    const n = await gesprochen(); return { ok: n === 0, info: 'gesprochen: ' + n };
  });
  await check('Einstellung nennt DE → RU', () => ev(() => /DE → RU nach der Antwort/.test(document.getElementById('overlay-settings').textContent)));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  if (R.some(r => r[0] !== 'OK ')) process.exitCode = 1;
  await b.close();
})();
