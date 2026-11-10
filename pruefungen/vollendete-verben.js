const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// 4.11.: Zustand & Leben +4 (hinten angehängt) und 53 vollendete Verben auf den Karten ihrer unvollendeten
// Partner; стирать, сдавать und учить bleiben bewusst ohne Partner (Bedeutung passt nur halb)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1');
    localStorage.setItem('vokabeltrainer-scores', JSON.stringify({ 'играть': { correct: 1, wrong: 0, box: 1, lastSeen: Date.now() } })); });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(async () => {
    const out = { fehler: [] }, zl = getAllWordsOfCat('Zustand & Leben');
    const NEU = [['появляться / появиться', 'erscheinen', 'A2'], ['выглядеть', 'aussehen', 'A2'], ['переезжать / переехать', 'umziehen', 'B1'], ['исчезать / исчезнуть', 'verschwinden', 'B1']];
    // seit 10.11. nach Stufe sortiert: die vier neuen Karten stehen in der Kategorie
    out.hinten = NEU.every(x => zl.some(w => w.ru === x[0])); out.n = zl.length;
    NEU.forEach(([ru, de, lv]) => { const w = zl.find(x => x.ru === ru), s = w && getWordSentence(w);
      if (!w || w.de.join() !== de || wordLevel(w) !== lv || w.tr !== ru.split(' / ').map(trLetters).join(' / ')) out.fehler.push(ru);
      if (!s || sentenceLevel(s.ru, [ru]) !== lv) out.fehler.push(ru + ' Satz'); });
    const paare = Object.keys(MERGED_CARDS).filter(k => allVocabWords().some(w => w.ru === k && MERGED_CARDS[k].length === 2) && / \/ /.test(k));
    out.paare = paare.length;
    out.ohne = ['стирать', 'сдавать', 'учить'].filter(v => !allVocabWords().some(w => w.ru === v));
    out.fehlt = ['начинать / начать', 'играть / сыграть', 'помогать / помочь', 'гладить / погладить', 'расти / вырасти', 'есть / съесть'].filter(k => !MERGED_CARDS[k] || !allVocabWords().some(w => w.ru === k));
    out.lern = scores['играть / сыграть']; out.alt = !!scores['играть'];
    const w = allVocabWords().find(x => x.ru === 'помогать / помочь'); setAppView('vocab'); setDirection('de-ru'); setMode('type'); out.antwort = [];
    for (const t of ['помогать', 'помочь']) { currentWord = w; answered = false; delete scores[getKey(w)]; document.getElementById('answer-input').value = t; await checkAnswer(); out.antwort.push((scores[getKey(w)] || {}).correct || 0); }
    openWordDetail(allVocabWords().find(x => x.ru === 'переезжать / переехать')); out.badge = (document.querySelector('#wd-sentence-ru .lvl-badge') || {}).textContent;
    return out;
  });
  ok('Zustand & Leben 30, vier neue Karten (nach Stufe sortiert), mit Übersetzung, Stufe und Satz', r.n === 30 && r.hinten && r.fehler.length === 0, r.fehler.join(' | '));
  ok('vollendete Verben auf ihren Karten (Stichprobe), стирать/сдавать/учить ohne Partner', r.fehlt.length === 0 && r.ohne.length === 0, JSON.stringify([r.fehlt, r.ohne]));
  ok('Lernstand übernommen (играть → играть / сыграть)', r.lern && r.lern.correct === 1 && !r.alt, JSON.stringify(r.lern));
  ok('DE → RU: jedes der beiden Verben gilt', r.antwort.join() === '1,1', r.antwort.join());
  ok('Wortdetails: Satzstufe nach der Karte (B1), nicht nach dem schwereren Verb', r.badge && r.badge.trim() === 'B1', String(r.badge));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
