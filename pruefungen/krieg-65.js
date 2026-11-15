const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Krieg +16: Substantive nach Häufigkeit (keine passenden A1/A2-Wörter mehr)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'капитан': ['Hauptmann|Kapitän', 'A2', 'm'], 'пистолет': ['Pistole', 'A2', 'm'], 'сержант': ['Feldwebel|Sergeant', 'A2', 'm'],
      'лейтенант': ['Leutnant', 'A2', 'm'], 'офицер': ['Offizier', 'A2', 'm'], 'полковник': ['Oberst', 'A2', 'm'], 'майор': ['Major', 'A2', 'm'],
      'бой': ['Kampf|Gefecht', 'A2', 'm'], 'выстрел': ['Schuss', 'B1', 'm'], 'командир': ['Kommandeur|Befehlshaber', 'B1', 'm'], 'взрыв': ['Explosion', 'B1', 'm'],
      'нападение': ['Überfall', 'B1', 'n'], 'защита': ['Schutz', 'B1', 'f'], 'пуля': ['Kugel|Patrone', 'B1', 'f'], 'битва': ['Schlacht', 'B2', 'f'], 'флот': ['Flotte|Marine', 'B2', 'm'] };
    const kl = getAllWordsOfCat('Krieg');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Krieg, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru) && s.de.includes(w.de[0].replace(/\s*\(.*\)$/, '')) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv), s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g) ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g, JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Krieg 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
