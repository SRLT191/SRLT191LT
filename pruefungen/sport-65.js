const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Sport +17: 6 aus der A2-Liste, übrige nach Häufigkeit; коньки (Plural von конёк) nicht im Geschlechter-Werkzeug
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'спортсмен': ['Sportler', 'A2', 'm'], 'футболист': ['Fußballer', 'A2', 'm'], 'хоккеист': ['Eishockeyspieler', 'A2', 'm'],
      'шахматы': ['Schach', 'A2', 'pl'], 'шахматист': ['Schachspieler', 'A2', 'm'], 'бейсбол': ['Baseball', 'A2', 'm'], 'ворота': ['Tor|Torgehäuse', 'B1', 'pl'],
      'старт': ['Start', 'B2', 'm'], 'раунд': ['Runde', 'B2', 'm'], 'гонка': ['Rennen|Wettrennen', 'B2', 'f'], 'финиш': ['Ziel|Zieleinlauf', 'C1', 'm'],
      'кубок': ['Pokal', 'C1', 'm'], 'турнир': ['Turnier', 'C1', 'm'], 'бокс': ['Boxen', 'C1', 'm'], 'вратарь': ['Torwart', 'C1', 'm'],
      'коньки': ['Schlittschuhe', 'C1', null], 'ракетка': ['Schläger', 'C1', 'f'] };
    const kl = getAllWordsOfCat('Sport');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Sport, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0]) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('коньки nicht im Geschlechter-Werkzeug', genderOf('коньки') === null);
    ok('Sport 70 (17.11.: auf 70 erweitert)', kl.length === 70, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
