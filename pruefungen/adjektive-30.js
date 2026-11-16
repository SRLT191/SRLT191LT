const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// seit 16.11. stehen Farben (20 feste Farbwörter) und Nationalitäten in der Gruppe Adjektive – sie zählen hier nicht mit
// Wortschatzrunde 26.10.2026: alle Adjektivkategorien mit mindestens 30 Wörtern (A1 zuerst, dann A2, dann schwerer),
// jedes neue Wort mit Transliteration, Stufe und Beispielsatz
const { chromium } = require('playwright');
const NEU = ['крупный','гигантский','прямоугольный','компактный','женатый','довольный','одетый','сумасшедший','нормальный','далёкий','обратный','прибрежный','пограничный','параллельный','скорый','вчерашний','прежний','завтрашний','нынешний','шоколадный','медовый','алюминиевый','джинсовый','кружевной','бесплатный','единый','определённый','сплошной','тройной','воздушный','земной','небесный','лунный','песчаный','человеческий','федеральный','судебный','королевский','частный','телефонный','специальный','родной','финансовый','футбольный'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  await check('jede Adjektivkategorie hat mindestens 30 Wörter', () => p.evaluate(() => {
    const klein = WORTART_GROUPS['Adjektive'].filter(c => !['Farben', 'Nationalitäten'].includes(c)).map(c => [c, getAllWordsOfCat(c).length]).filter(([, n]) => n < 30);
    return { ok: klein.length === 0, info: klein.map(x => x.join(' ')).join(', ') };
  }));
  await check('neue Wörter: Transliteration, Stufe, Satz, keine Dublette', () => p.evaluate(NEU => {
    const alle = allVocabWords(); const fehl = [];
    NEU.forEach(ru => {
      const w = alle.filter(x => x.ru === ru);
      if (w.length !== 1) { fehl.push(ru + ' ×' + w.length); return; }
      const s = getWordSentence(w[0]);
      if (!w[0].tr || !wordLevel(w[0]) || !s || !s.ru.toLowerCase().includes(ru)) fehl.push(ru);
    });
    return { ok: fehl.length === 0, info: fehl.join(', ') };
  }, NEU));
  await check('neue Sätze haben eine passende Stufe (nicht leichter als das Wort)', () => p.evaluate(NEU => {
    const L = ['A1', 'A2', 'B1', 'B2', 'C1']; const falsch = [];
    NEU.forEach(ru => { const w = allVocabWords().find(x => x.ru === ru); const s = getWordSentence(w);
      if (L.indexOf(sentenceLevel(s.ru)) < L.indexOf(wordLevel(w))) falsch.push(ru); });
    return { ok: falsch.length === 0, info: falsch.join(', ') };
  }, NEU));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  if (R.some(r => r[0] !== 'OK ')) process.exitCode = 1;
  await b.close();
})();
