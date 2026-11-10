const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Wortgruppen/Satzbau (10.11.): Lautsprecher funktioniert, Schalter „Vorlesen“ (gemerkt, beide Werkzeuge),
// liest automatisch die Lösung (Prüfen, Lösung zeigen) und jeden Wort-Tipp; aus = still
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__sp = []; const fake = { speaking: false, pending: false, paused: false, getVoices: () => [{ lang: 'ru-RU', name: 'RU' }], cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}, onvoiceschanged: null, speak(u) { window.__sp.push(u.text); } }; Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); window.SpeechSynthesisUtterance = function (t) { this.text = t; }; });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}; const sp = () => __sp.splice(0);
    setAppView('grammar');
    for (const [tool, open, pre] of [['wg', () => openWordgroup(), 'wg'], ['sb', () => openSentenceBuild(), 'sb']]) {
      open(); sp();
      const o = out[tool] = {};
      o.vorher = sp().length;                                  // nichts beim Öffnen
      o.knopfAus = document.getElementById(pre + '-speak-btn').disabled;
      // falsch prüfen → Lösung wird vorgelesen
      const voll = () => wgState.current.fullAnswer || wgState.current.answer;
      setWgAnswerMode('type'); restartWordgroup(); sp();
      wgEl('input').value = 'xxx'; checkWordgroup(); o.pruefen = sp(); o.soll = voll();
      wgEl('input').value = 'xxx'; checkWordgroup(); o.zweitesPruefen = sp().length;   // wiederholtes Prüfen: nicht nochmal… (geht weiter)
      // Knopf
      restartWordgroup(); revealWordgroup(); sp(); document.getElementById(pre + '-speak-btn').click(); o.knopf = sp();
      // Lösung zeigen
      restartWordgroup(); sp(); revealWordgroup(); o.zeigen = sp(); o.zeigenSoll = voll();
      // Wort-Tipps
      if (tool === 'sb') {
        restartWordgroup(); sp(); const toks = wgState.current.tokens; const gehoert = [];
        for (let i = 0; i < toks.length; i++) { revealWordgroupStep(); gehoert.push(...sp()); }
        o.tipps = gehoert; o.toks = toks; o.tippVoll = voll();
      }
      // Bausteine-Modus
      setWgAnswerMode('click'); restartWordgroup(); sp(); checkWordgroup(); o.leer = sp().length;
      [...wgEl('word-bank').querySelectorAll('button')].forEach(() => {});
      setWgAnswerMode('type');
    }
    // Schalter aus
    openSentenceBuild(); const tg = document.getElementById('sb-speak-toggle'), tw = document.getElementById('wg-speak-toggle');
    out.an = tg.getAttribute('aria-pressed') === 'true' && tw.getAttribute('aria-pressed') === 'true';
    tg.click(); out.beideAus = tg.getAttribute('aria-pressed') === 'false' && tw.getAttribute('aria-pressed') === 'false';
    out.gemerkt = localStorage.getItem(Object.keys(localStorage).find(k => (localStorage.getItem(k) || '').includes('wgAutoSpeak'))) .includes('"wgAutoSpeak":false');
    restartWordgroup(); sp(); wgEl('input').value = 'xxx'; checkWordgroup(); revealWordgroupStep(); out.ausStill = sp().length;
    document.getElementById('sb-speak-btn').click(); out.ausKnopf = sp().length;
    out.summe = /Vorlesen/.test(document.querySelector('#overlay-sentencebuild .gt-settings-sum').textContent);
    tg.click(); out.summeAn = /Vorlesen/.test(document.querySelector('#overlay-sentencebuild .gt-settings-sum').textContent);
    return out;
  });
  for (const t of ['wg', 'sb']) {
    const o = r[t];
    ok(t + ': nichts beim Öffnen, Knopf vor Antwort gesperrt', o.vorher === 0 && o.knopfAus, o);
    ok(t + ': Prüfen liest Lösung', o.pruefen.length === 1 && o.pruefen[0] === o.soll, o.pruefen);
    ok(t + ': Lautsprecher-Knopf', o.knopf.length === 1, o.knopf);
    ok(t + ': Lösung zeigen liest Lösung', o.zeigen.length === 1 && o.zeigen[0] === o.zeigenSoll, o.zeigen);
    ok(t + ': leeres Prüfen still', o.leer === 0);
  }
  const s = r.sb; ok('Wort-Tipps einzeln, zuletzt ganzer Satz', s.tipps.length === s.toks.length && s.tipps.slice(0, -1).join() === s.toks.slice(0, -1).join() && s.tipps[s.tipps.length - 1] === s.tippVoll, [s.tipps, s.toks]);
  ok('Schalter an, gilt für beide', r.an && r.beideAus); ok('Schalter gemerkt', r.gemerkt);
  ok('aus: kein automatisches Vorlesen, Knopf geht weiter', r.ausStill === 0 && r.ausKnopf === 1, [r.ausStill, r.ausKnopf]);
  ok('Kurzfassung der Einstellungen', !r.summe && r.summeAn);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
