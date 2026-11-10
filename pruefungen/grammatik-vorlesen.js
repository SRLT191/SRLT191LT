const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Grammatik vorlesen (10.11.): ein Schalter für alle Werkzeuge (auch in den Einstellungen), Lösung nach Prüfen/Wahl/Aufdecken,
// Bausteine beim Antippen, Taste 4 und Lautsprecher während der Wort-Tipps im Satzbau, Lautsprecher am Rundenende,
// Lautsprecher verrät vor der Antwort nichts mehr (Zahl + Substantiv, Aspektpaare rückwärts)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__sp = []; const fake = { speaking: false, pending: false, paused: false, getVoices: () => [{ lang: 'ru-RU', name: 'RU' }], cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {}, onvoiceschanged: null, speak(u) { window.__sp.push(u.text); } }; Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); window.SpeechSynthesisUtterance = function (t) { this.text = t; }; });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(async () => {
    const out = {}; const sp = () => __sp.splice(0); const sleep = ms => new Promise(r => setTimeout(r, ms));
    setAppView('grammar');
    // Eingabe-Motor: Zahl + Substantiv
    openNumNoun(); restartNumNoun(); sp(); const nn = numNounState.current;
    document.querySelector('#overlay-numnoun .gt-task-tools button').click(); out.nnVor = sp()[0]; out.nnNoun = nn.noun; out.nnAnswer = nn.answer;
    document.getElementById('numnoun-input').value = 'xxx'; checkNumNoun(); out.nnPruefen = sp();
    document.getElementById('numnoun-input').value = 'xxx'; checkNumNoun(); sp();
    revealNumNoun && (restartNumNoun(), sp(), revealNumNoun(), out.nnZeigen = sp());
    // Aspektpaare rückwärts: vorher nur das gegebene Verb
    openAspect(); aspectState.dir = 'back'; restartAspect(); sp(); const ac = aspectState.current;
    speakAspect(); out.aVor = [sp()[0], ac.given, ac.answer];
    document.getElementById('aspect-input').value = ac.answer; checkAspect(); out.aNach = sp(); aspectState.dir = 'fwd';
    // Wahl-Motor: Kasus-Drill Fall wählen → Beispielsatz
    openCaseDrill(); setCaseMode('abstract'); sp(); const it = caseState.queue[caseState.index];
    answerCaseDrill(it.kasus === 'Gen.' ? 'Dat.' : 'Gen.'); out.cw = sp(); out.cwSoll = prepListExample(it) ? caseWordSatz(prepListExample(it)) : it.prep;
    // Kasus-Drill Form bilden
    setCaseMode('word'); sp(); document.getElementById('case-input').value = caseState.wordCurrent.answer; checkCaseWord(); out.cf = sp(); out.cfSoll = caseWordSatz(caseState.wordCurrent);
    // Rektion Fall wählen: nach der Antwort Beispiel
    openRektion(); setRektionMode('choose'); sp(); const rv = rektionState.current.verb; answerRektion(rv.r); out.rk = sp(); out.rkSoll = rektionExample(rv) || rv.v;
    // Satzbau: Bausteine, Lautsprecher bei Wort-Tipps, Taste 4
    openSentenceBuild(); setWgAnswerMode('click'); restartWordgroup(); sp();
    const btn0 = wgEl('word-bank').querySelector('button'); btn0.click(); out.baustein = [sp(), btn0.textContent];
    undoWgWord(); setWgAnswerMode('type'); restartWordgroup(); sp();
    out.knopfVorTipp = document.getElementById('sb-speak-btn').disabled;
    revealWordgroupStep(); revealWordgroupStep(); sp();
    out.knopfNachTipp = !document.getElementById('sb-speak-btn').disabled;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })); out.taste4 = [sp(), wgState.current.tokens.slice(0, 2).join(' ')];
    wgEl('input').focus(); wgEl('input').value = 'я'; wgEl('input').dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true })); out.taste4Feld = sp().length;
    // Rundenende: Lautsprecher je Fehler
    openGender(); restartGender(); const gs = genderState; sp();
    while (gs.index < gs.queue.length) { const x = gs.queue[gs.index]; gtChoose(GENDER_CHOICE, x.g === 'm' ? 'f' : 'm'); gtChoiceNext(GENDER_CHOICE); }
    const hb = document.querySelectorAll('#overlay-gender .gt-fehler .gt-fehler-hoeren'); out.endeKnoepfe = [hb.length, gs.fehler.length];
    sp(); hb[0] && hb[0].click(); out.endeHoeren = [sp(), gs.fehler[0] && gs.fehler[0].ru];
    // Einstellungen: ein Schalter für alle
    const cb = document.getElementById('gramspeak-toggle'); out.cbAn = cb.checked;
    cb.checked = false; cb.dispatchEvent(new Event('change'));
    out.aus = [wgState.autoSpeak, document.getElementById('sb-speak-toggle').getAttribute('aria-pressed'), document.getElementById('wg-speak-toggle').getAttribute('aria-pressed')];
    openNumNoun(); restartNumNoun(); sp(); document.getElementById('numnoun-input').value = 'xxx'; checkNumNoun(); out.ausStill = sp().length;
    openCaseDrill(); setCaseMode('abstract'); sp(); answerCaseDrill('Gen.'); out.ausStill2 = sp().length;
    document.getElementById('sb-speak-toggle').click(); out.cbWieder = cb.checked;
    await sleep(10);
    return out;
  });
  ok('Zahl + Substantiv: Lautsprecher vorher ohne Lösung', !r.nnVor.endsWith(r.nnAnswer) || r.nnAnswer === r.nnNoun, r.nnVor);
  ok('Eingabe-Motor: Prüfen liest Lösung (einmal)', r.nnPruefen.length === 1 && r.nnPruefen[0].endsWith(r.nnAnswer), r.nnPruefen);
  ok('Eingabe-Motor: Lösung zeigen liest', !r.nnZeigen || r.nnZeigen.length === 1, r.nnZeigen);
  ok('Aspekt rückwärts: vorher nur gegebenes Verb, danach Paar', r.aVor[0] === r.aVor[1] && r.aNach.length === 1 && r.aNach[0] === r.aVor[1] + ', ' + r.aVor[2], [r.aVor, r.aNach]);
  ok('Wahl-Motor: Kasus-Drill liest Beispielsatz', r.cw.length === 1 && r.cw[0] === r.cwSoll, [r.cw, r.cwSoll]);
  ok('Kasus-Drill Form bilden liest Satz', r.cf.length === 1 && r.cf[0] === r.cfSoll, r.cf);
  ok('Rektion Fall wählen liest Beispiel', r.rk.length === 1 && r.rk[0] === r.rkSoll, [r.rk, r.rkSoll]);
  ok('Bausteine: angetipptes Wort', r.baustein[0].length === 1 && r.baustein[0][0] === r.baustein[1], r.baustein);
  ok('Lautsprecher während Wort-Tipps frei', r.knopfVorTipp && r.knopfNachTipp);
  ok('Taste 4: aufgedeckte Wörter', r.taste4[0].length === 1 && r.taste4[0][0] === r.taste4[1], r.taste4);
  ok('Taste 4 auch im Eingabefeld', r.taste4Feld === 1);
  ok('Rundenende: Lautsprecher je Fehler', r.endeKnoepfe[0] === r.endeKnoepfe[1] && r.endeKnoepfe[0] > 0 && r.endeHoeren[0][0] === r.endeHoeren[1], [r.endeKnoepfe, r.endeHoeren]);
  ok('Einstellungen-Schalter steuert alle', r.cbAn && r.aus.join() === 'false,false,false' && r.cbWieder, r.aus);
  ok('aus: nichts automatisch', r.ausStill === 0 && r.ausStill2 === 0);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
