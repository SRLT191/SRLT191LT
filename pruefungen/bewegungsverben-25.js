const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Bewegungsverben +6 (3.11.): Vorsilben-Verben als Aspektpaar-Karten (A2), dazu уйти und вернуться
// auf den Karten уходить / возвращаться; Lernstand der alten Karten wird übernommen
const { chromium } = require('playwright');
const NEU = [['приезжать', 'приехать', 'ankommen (mit Fahrzeug)'], ['уезжать', 'уехать', 'wegfahren'], ['входить', 'войти', 'hineingehen'],
  ['выходить', 'выйти', 'hinausgehen'], ['переходить', 'перейти', 'überqueren'], ['проходить', 'пройти', 'vorbeigehen']];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1');
    localStorage.setItem('vokabeltrainer-scores', JSON.stringify({ 'уходить': { correct: 1, wrong: 0, box: 1, lastSeen: Date.now() } })); });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(async NEU => {
    const out = { fehler: [] }; const kl = getAllWordsOfCat('Bewegungsverben');
    NEU.forEach(([i, pf, de]) => { const name = i + ' / ' + pf, w = kl.find(x => x.ru === name), s = w && getWordSentence(w);
      if (!w) { out.fehler.push(name + ' fehlt'); return; }
      if (w.tr !== trLetters(i) + ' / ' + trLetters(pf) || w.de.join('|') !== de || !w.ruAlt.includes(i) || !w.ruAlt.includes(pf)) out.fehler.push(name + ' Form');
      if (wordLevel(w) !== 'A2') out.fehler.push(name + ' Stufe ' + wordLevel(w));
      if (!s || sentenceLevel(s.ru, [i, pf]) !== 'A2' || LEVELS.indexOf(sentenceLevel(s.ru)) > 1) out.fehler.push(name + ' Satz ' + (s && s.ru));
    });
    ['уходить / уйти', 'возвращаться / вернуться'].forEach(n => { const w = kl.find(x => x.ru === n); if (!w || wordLevel(w) !== 'A1' || !MERGED_CARDS[n]) out.fehler.push(n); });
    out.n = kl.length; out.lern = scores['уходить / уйти']; out.alt = !!scores['уходить'];
    const w = kl.find(x => x.ru === 'входить / войти'); setAppView('vocab'); setDirection('de-ru'); setMode('type'); out.antwort = [];
    for (const t of ['входить', 'войти']) { currentWord = w; answered = false; delete scores[getKey(w)]; document.getElementById('answer-input').value = t; await checkAnswer(); out.antwort.push((scores[getKey(w)] || {}).correct || 0); }
    out.sortiert = kl.every((x, k) => k === 0 || LEVELS.indexOf(wordLevel(kl[k - 1])) <= LEVELS.indexOf(wordLevel(x)));
    return out;
  }, NEU);
  ok('6 neue Karten „unvollendet / vollendet“: Umschrift, Übersetzung, ruAlt, A2, Satz A2', r.fehler.length === 0, r.fehler.join(' | '));
  ok('Bewegungsverben 25, nach Stufe sortiert', r.n === 25 && r.sortiert, r.n + ' / ' + r.sortiert);
  ok('уходить / уйти übernimmt den Lernstand von уходить', r.lern && r.lern.correct === 1 && !r.alt, JSON.stringify(r.lern));
  ok('DE → RU: jedes der beiden Verben gilt', r.antwort.join() === '1,1', r.antwort.join());
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
