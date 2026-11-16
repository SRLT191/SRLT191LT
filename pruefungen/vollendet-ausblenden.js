const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Vokabelkarten (16.11.): Knopf „Vollendet“ blendet auf Verbkarten mit Aspektpaar den vollendeten Partner aus
// (Anzeige, Lösung, Umschrift, Vorlesen, Mehrfachauswahl); gemerkt; nur bei Aspektpaar-Karten sichtbar
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__spoken = []; });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const find = ru => allVocabWords().find(w => w.ru === ru);
    const paar = find('просить / попросить'), bew = find('идти / ходить') || allVocabWords().find(w => MERGED_CARDS[w.ru] && MOTION_INDET.includes(MERGED_CARDS[w.ru][1]));
    const einzel = allVocabWords().find(w => w.ru === 'знать');
    const sicht = () => document.getElementById('pf-btn').style.display !== 'none';
    const wort = () => document.getElementById('russian-word').textContent;
    const out = {};
    setAppView('vocab'); setDirection && quizDirection !== 'ru-de' && setDirection('ru-de');
    window.speak = t => window.__spoken.push(t);
    renderCard(paar); out.vorher = [sicht(), wort(), hidePf];
    togglePfVisible(); out.nachher = [wort(), hidePf, document.getElementById('pf-btn').getAttribute('aria-pressed'), document.getElementById('transcription').textContent];
    speakCurrentWord(); out.gesprochen = window.__spoken.slice(-1)[0];
    renderCard(einzel); out.einzel = sicht();
    renderCard(bew); out.bew = [sicht(), wort()];
    // DE → RU: Lösung nur unvollendet, Eingabe des unvollendeten Verbs richtig
    quizDirection = 'de-ru'; quizMode = 'free'; renderCard(paar);
    document.getElementById('answer-input').value = 'просить'; checkAnswer();
    out.deru = [document.getElementById('correct-reveal-text').textContent, document.getElementById('word-card').className];
    quizMode = 'mc'; answered = false; renderCard(paar);
    out.mc = [...document.querySelectorAll('.mc-btn')].map(x => x.textContent).filter(t => t.includes('просить'));
    return out;
  });
  ok('Knopf auf Aspektpaar-Karte sichtbar, zuerst beide Verben', r.vorher[0] && r.vorher[1] === 'просить / попросить' && r.vorher[2] === false, r.vorher);
  ok('nach Klick nur das unvollendete Verb (Anzeige, Zustand, Umschrift)', r.nachher[0] === 'просить' && r.nachher[1] === true && r.nachher[2] === 'true' && !/poprossit/.test(r.nachher[3]), r.nachher);
  ok('Vorlesen nur unvollendet', r.gesprochen === 'просить', r.gesprochen);
  ok('kein Knopf bei Einzelverb und bei Bewegungsverb-Paar (bleibt ganz)', !r.einzel && !r.bew[0] && r.bew[1].includes(' / '), [r.einzel, r.bew]);
  ok('DE → RU: unvollendetes Verb richtig, Lösung ohne Partner', r.deru[0] === 'просить' && r.deru[1] === 'correct', r.deru);
  ok('Mehrfachauswahl zeigt die Paarkarte ohne Partner', r.mc.length === 1 && r.mc[0] === 'просить', r.mc);
  await p.reload(); await p.waitForTimeout(400);
  const r2 = await p.evaluate(() => { const w = allVocabWords().find(x => x.ru === 'просить / попросить'); quizDirection = 'ru-de'; quizMode = 'free'; renderCard(w); return [hidePf, document.getElementById('russian-word').textContent]; });
  ok('Einstellung bleibt nach Neuladen', r2[0] === true && r2[1] === 'просить', r2);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
