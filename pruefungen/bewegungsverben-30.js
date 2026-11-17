const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Bewegungsverben +5 (17.11.): ехать / поехать, доезжать / доехать, приносить / принести, подходить / подойти,
// заходить / зайти – hinten angehängt, mit Stufe, Umschrift, eigenem Satz; DE → RU nimmt jedes der beiden Verben
const { chromium } = require('playwright');
const NEU = [['ехать', 'поехать', 'losfahren|fahren (perfektiv)', 'A2'], ['доезжать', 'доехать', 'gelangen (mit Fahrzeug)', 'A2'],
  ['приносить', 'принести', 'bringen', 'A1'], ['подходить', 'подойти', 'herangehen', 'A1'], ['заходить', 'зайти', 'vorbeischauen', 'A1']];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(async NEU => {
    const out = { fehler: [] }; const kl = getAllWordsOfCat('Bewegungsverben');
    NEU.forEach(([i, pf, de, lv], k) => { const name = i + ' / ' + pf, w = kl[25 + k], s = w && getWordSentence(w);
      if (!w || w.ru !== name) { out.fehler.push(name + ' fehlt oder nicht hinten'); return; }
      if (w.tr !== trLetters(i) + ' / ' + trLetters(pf) || w.de.join('|') !== de) out.fehler.push(name + ' Form');
      if (wordLevel(w) !== lv) out.fehler.push(name + ' Stufe ' + wordLevel(w));
      if (!s || !s.ru.toLowerCase().includes(pf) || !s.de.includes(de.split('|')[0].replace(/ \(.*\)$/, '')) || sentenceLevel(s.ru, [i, pf]) !== lv) out.fehler.push(name + ' Satz ' + (s && s.ru));
      if (i !== 'ехать' && JSON.stringify(MERGED_CARDS[name]) !== JSON.stringify([i, pf])) out.fehler.push(name + ' MERGED_CARDS');
    });
    out.n = kl.length;
    const w = kl.find(x => x.ru === 'приносить / принести'); setAppView('vocab'); setDirection('de-ru'); setMode('type'); out.antwort = [];
    for (const t of ['приносить', 'принести']) { currentWord = w; answered = false; delete scores[getKey(w)]; document.getElementById('answer-input').value = t; await checkAnswer(); out.antwort.push((scores[getKey(w)] || {}).correct || 0); }
    return out;
  }, NEU);
  ok('5 neue Karten hinten: Umschrift, Übersetzung, Stufe, Satz, MERGED_CARDS', r.fehler.length === 0, r.fehler.join(' | '));
  ok('Bewegungsverben 30', r.n === 30, String(r.n));
  ok('DE → RU: приносить und принести gelten', r.antwort.join() === '1,1', r.antwort.join());
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
