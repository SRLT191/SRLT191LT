const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Vollendete Verben der A1-Liste auf der Karte ihres unvollendeten Partners (1.11.): „брать / взять“,
// zuerst unvollendet, dann vollendet; говорить und сказать zu einer Karte; Lernstand wird übernommen
const { chromium } = require('playwright');
const PAARE = [['брать', 'взять'], ['видеть', 'увидеть'], ['давать', 'дать'], ['делать', 'сделать'], ['закрывать', 'закрыть'], ['звонить', 'позвонить'],
  ['открывать', 'открыть'], ['писать', 'написать'], ['покупать', 'купить'], ['понимать', 'понять'], ['отвечать', 'ответить'], ['читать', 'прочитать'],
  ['узнавать', 'узнать'], ['мочь', 'смочь'], ['обедать', 'пообедать'], ['отдыхать', 'отдохнуть'], ['повторять', 'повторить'], ['получать', 'получить'],
  ['предлагать', 'предложить'], ['приглашать', 'пригласить'], ['рождаться', 'родиться'], ['смотреть', 'посмотреть'], ['строить', 'построить'],
  ['спрашивать', 'спросить'], ['приходить', 'прийти'], ['заказывать', 'заказать'], ['говорить', 'сказать']];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  // alter Lernstand auf den Einzelkarten
  await p.addInitScript(() => {
    if (sessionStorage.getItem('gesetzt')) return; sessionStorage.setItem('gesetzt', '1');
    const now = Date.now();
    localStorage.setItem('vokabeltrainer-scores', JSON.stringify({ 'брать': { correct: 1, wrong: 0, box: 1, lastSeen: now }, 'говорить': { correct: 0, wrong: 2, box: 0, lastSeen: now }, 'сказать': { correct: 1, wrong: 0, box: 2, lastSeen: now } }));
    localStorage.setItem('vokabeltrainer-lifetime', JSON.stringify({ ver: 3, run: 1, v: { 'сказать': { c: 3, w: 1, mb: 2, l: now - 9e8, z: now, d: 2, dd: now - 9e8 }, 'говорить': { c: 1, w: 0, mb: 1, l: now - 5e8, z: now, d: 1, dd: now - 5e8 } }, g: {} }));
    localStorage.setItem('vokabeltrainer-bookmarks', JSON.stringify(['сказать']));
  });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(PAARE => {
    const out = { fehlt: [], form: [], stufe: [], tab: [] };
    PAARE.forEach(([i, pf]) => {
      const name = i + ' / ' + pf; const w = allVocabWords().find(x => x.ru === name);
      if (!w) { out.fehlt.push(name); return; }
      if (w.tr !== trLetters(i) + ' / ' + trLetters(pf) || !(w.ruAlt || []).includes(i) || !(w.ruAlt || []).includes(pf) || MERGED_CARDS[name].join() !== [i, pf].join()) out.form.push(name);
      if (wordLevel(w) !== 'A1') out.stufe.push(name + ':' + wordLevel(w));
      if (allVocabWords().some(x => x !== w && x.ru.split(' / ').some(t => t === i || t === pf))) out.form.push(name + ' doppelt');
    });
    const L = loadLifetime();
    out.lern = { scores: scores['говорить / сказать'], brat: scores['брать / взять'], alt: ['брать', 'говорить', 'сказать'].filter(k => scores[k]), life: L.v['говорить / сказать'], merk: [...loadBookmarks()] };
    out.anzahl = allVocabWords().length;
    return out;
  }, PAARE);
  ok('27 Karten „unvollendet / vollendet“ mit Umschrift, ruAlt und Eintrag in MERGED_CARDS', r.fehlt.length === 0 && r.form.length === 0, JSON.stringify([r.fehlt, r.form]));
  ok('alle Paar-Karten A1 (vollendete Verben nach FIPI)', r.stufe.length === 0, r.stufe.join(', '));
  ok('Übungsstand übernommen (Zähler addiert), alte Schlüssel weg', r.lern.scores && r.lern.scores.correct === 1 && r.lern.scores.wrong === 2 && r.lern.brat && r.lern.brat.correct === 1 && r.lern.alt.length === 0, JSON.stringify(r.lern));
  ok('Gesamtstand übernommen („gelernt seit“ das Frühere, Stufe das Höhere), Merkliste umbenannt', r.lern.life && r.lern.life.c === 4 && r.lern.life.d === 2 && r.lern.merk.includes('говорить / сказать') && !r.lern.merk.includes('сказать'), JSON.stringify([r.lern.life, r.lern.merk]));
  const a = await p.evaluate(async () => {
    const w = allVocabWords().find(x => x.ru === 'брать / взять'); setAppView('vocab'); setDirection('de-ru'); setMode('type'); const res = {};
    for (const t of ['брать', 'взять']) { currentWord = w; answered = false; delete scores[getKey(w)]; document.getElementById('answer-input').value = t; await checkAnswer(); res[t] = (scores[getKey(w)] || {}).correct || 0; }
    openWordDetail(w); const g = document.getElementById('wd-grammar-row').style.display !== 'none'; closeOverlay('overlay-worddetail');
    return { res, g, satz: !!getWordSentence(w) };
  });
  ok('DE → RU: eines der beiden Verben genügt', a.res['брать'] === 1 && a.res['взять'] === 1, JSON.stringify(a.res));
  ok('Wortdetails bieten die Konjugation an, Beispielsatz vorhanden', a.g && a.satz, JSON.stringify(a));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
