const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Technik +12: A1 (FIPI-Vormerkliste), A2 (Lexikalisches Minimum), dann nach Häufigkeit
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = await p.evaluate(() => {
    const R = []; const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
    const NEU = { 'техника': ['Technik|Geräte', 'A1', 'f'], 'радио': ['Radio', 'A2', 'n'], 'магнитофон': ['Tonbandgerät', 'A2', 'm'], 'плеер': ['Player', 'A2', 'm'],
      'телеграмма': ['Telegramm', 'A2', 'f'], 'оборудование': ['Ausrüstung', 'B1', 'n'], 'диск': ['Scheibe|CD/DVD', 'B2', 'm'], 'мотор': ['Motor', 'B2', 'm'],
      'аппарат': ['Apparat', 'B2', 'm'], 'механизм': ['Mechanismus', 'B2', 'm'], 'деталь': ['Bauteil|Detail', 'B2', 'f'], 'технология': ['Technologie', 'B2', 'f'] };
    const kl = getAllWordsOfCat('Technik');
    Object.entries(NEU).forEach(([ru, [de, lv, g]]) => {
      const w = kl.find(x => x.ru === ru), s = w && getWordSentence(w);
      ok(ru + ': in Technik, Umschrift nach Regel, nur bestätigte Übersetzung', w && w.tr === trLetters(ru) && w.de.join('|') === de, w ? w.tr + ' · ' + w.de.join(', ') : 'fehlt');
      ok(ru + ': Stufe ' + lv + ', Satz mit Wort und Übersetzung, nicht schwerer als das Wort', w && wordLevel(w) === lv && s
        && s.ru.toLowerCase().includes(ru.toLowerCase()) && w.de.some(d => s.de.includes(d.replace(/\s*\(.*\)$/, ''))) && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(lv) && sentenceLevel(s.ru, [ru]) === lv, s ? s.ru + ' / ' + s.de + ' · ' + sentenceLevel(s.ru) : 'kein Satz');
      if (g === '-') ok(ru + ': kein Substantiv mit großgeschriebener Übersetzung – nicht im Werkzeug Geschlecht', !genderPool().some(x => x.ru === ru));
      else ok(ru + ': Geschlecht ' + g, (genderOf(ru) || {}).g === g && genderPool().some(x => x.ru === ru), JSON.stringify(genderOf(ru)));
    });
    ok('Kein Wort doppelt im Wortschatz', (() => { const all = allVocabWords().map(w => w.ru); return all.length === new Set(all).size; })());
    ok('Technik 65', kl.length === 65, String(kl.length));
    return R;
  });
  R.push([errs.length ? 'XX ' : 'OK ', 'Keine JS-Fehler', errs.slice(0, 2).join(' | ')]);
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
