const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Wissenschaft & Forschung +19: A2-Wörter (Lexikalisches Minimum), dann nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'физик': ['Physiker', 'A2', 'm'], 'химик': ['Chemiker', 'A2', 'm'], 'биолог': ['Biologe', 'A2', 'm'], 'математик': ['Mathematiker', 'A2', 'm'],
      'философ': ['Philosoph', 'A2', 'm'], 'психолог': ['Psychologe', 'A2', 'm'], 'географ': ['Geograf', 'A2', 'm'], 'филолог': ['Philologe', 'A2', 'm'],
      'филология': ['Philologie', 'A2', 'f'], 'факт': ['Tatsache', 'A2', 'm'], 'грант': ['Fördergeld', 'B1', 'm'], 'статья': ['Artikel', 'B2', 'f'],
      'электричество': ['Elektrizität', 'B2', 'n'], 'прогресс': ['Fortschritt', 'B2', 'm'], 'кислород': ['Sauerstoff', 'B2', 'm'], 'организм': ['Organismus', 'B2', 'm'],
      'термин': ['Fachbegriff', 'B2', 'm'], 'доклад': ['Vortrag', 'B2', 'm'], 'ген': ['Gen', 'B2', 'm'] };
    const kl = getAllWordsOfCat('Wissenschaft & Forschung');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Wissenschaft & Forschung, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv) && sentenceLevel(s.ru, [ru]) === lv, s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g === '-') ok(ru + ': kein Substantiv mit großgeschriebener Übersetzung – nicht im Werkzeug Geschlecht', !genderPool().some(x => x.ru === ru));
      else ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g && genderPool().some(x => x.ru === ru), JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Wissenschaft & Forschung 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
