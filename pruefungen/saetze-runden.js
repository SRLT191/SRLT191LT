const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Gesamtprüfung 16.11., Punkt 10: Sammelsätze mit zwei Wörtern werden in Runden zu 5 Wörtern durch eigene Sätze ersetzt.
// Je Wort: eigener Satz mit dem Wort und der Kartenübersetzung, nicht schwerer als das Wort, kein Sammelsatz mehr.
const { chromium } = require('playwright');
const RUNDEN = {
  1: { 'разница': 'Разница между ними большая.', 'половина': 'Половина торта для тебя.', 'выбор': 'Это трудный выбор.', 'изменение': 'Это важное изменение.', 'размер': 'Какой у тебя размер?' },
};
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  for (const [n, woerter] of Object.entries(RUNDEN)) {
    const r = await p.evaluate(woerter => Object.entries(woerter).map(([ru, satz]) => {
      const w = allVocabWords().find(x => x.ru === ru), s = w && getWordSentence(w);
      const L = l => LEVELS.indexOf(l);
      const gut = !!s && s.ru === satz && s.ru.toLowerCase().includes(ru) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, '')))
        && L(sentenceLevel(s.ru)) <= L(wordLevel(w)) && !SENTENCE_PAIRS.some(x => (x.targets || []).includes(ru) && x.targets.length > 1);
      return [ru, gut, s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz'];
    }), woerter);
    r.forEach(([ru, gut, info]) => ok('Runde ' + n + ': ' + ru + ' mit eigenem Satz', gut, info));
  }
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
