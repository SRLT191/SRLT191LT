const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Gesamtprüfung 16.11. – Wortschatz: Stufen (бар, национальный вопрос, растение, Länder, Verkehr, смартфон, Schimpfwörter),
// Übersetzungen, verschobene Wörter am Ende ihrer neuen Kategorie, korrigierte Beispielsätze (Satz nie schwerer als das Wort)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const W = ru => allVocabWords().find(w => w.ru === ru);
    const STUFE = { 'бар': 'C1', 'национальный вопрос': 'C1', 'растение': 'A2', 'Россия': 'A1', 'Германия': 'A1', 'Европа': 'A2', 'Азия': 'A2', 'Африка': 'A2',
      'светофор': 'A2', 'пешеход': 'A2', 'смартфон': 'A2', 'сука': 'B2', 'придурок': 'B2' };
    const stufe = Object.entries(STUFE).filter(([ru, l]) => wordLevel(W(ru)) !== l).map(([ru]) => ru + ' ' + wordLevel(W(ru)));
    const DE = { 'качаться': 'schaukeln|Krafttraining machen', 'равный': 'gleich|ebenbürtig', 'народный': 'Volks-|volkstümlich', 'общественный': 'gesellschaftlich|öffentlich',
      'самый': 'der …ste (Superlativ)', 'гастроли': 'Tournee|Gastspiel', 'приёмка': 'Warenannahme', 'талон': 'Wartenummer', 'полис': 'Versichertenkarte', 'пирожок': 'Piroschka|Teigtasche' };
    const de = Object.entries(DE).filter(([ru, d]) => W(ru).de.join('|') !== d).map(([ru]) => ru);
    const ZIEL = { 'чек': 'Ökonomie', 'соседка': 'Wohnen', 'студентка': 'Bildung', 'ученица': 'Bildung', 'парень': 'Menschen', 'дата': 'Zeit' };
    const ziel = Object.entries(ZIEL).filter(([ru, c]) => !getAllWordsOfCat(c).some(w => w.ru === ru)).map(([ru]) => ru);
    // 16.11.: danach kamen weitere Wörter hinten dazu – geprüft wird nur noch, dass die verschobenen in ihrer Kategorie stehen
    const ende = [['Ökonomie', 'чек'], ['Wohnen', 'соседка'], ['Bildung', 'студентка'], ['Bildung', 'ученица'], ['Menschen', 'парень'], ['Zeit', 'дата']].map(([c, ru]) => getAllWordsOfCat(c).some(w => w.ru === ru) ? ru : '-' + ru);
    const doppelt = (() => { const a = allVocabWords().map(w => w.ru); return a.length - new Set(a).size; })();
    const L = l => LEVELS.indexOf(l);
    const SAETZE = ['хлеб', 'русский', 'по-русски', 'персона', 'орбита', 'Колумбия', 'Сирия', 'Европа', 'Азия', 'Африка', 'золото', 'гастроли', 'каждый', 'поход', 'полтора', 'тратить', 'копать', 'вешать'];
    const schwer = SAETZE.map(ru => [ru, W(ru), getWordSentence(W(ru) || { ru, de: [''] })]).filter(([ru, w, s]) => !w || !s || L(sentenceLevel(s.ru)) > L(wordLevel(w)) || !s.ru.toLowerCase().includes(ru.toLowerCase().split(' / ')[0].slice(0, 4)))
      .map(([ru, w, s]) => ru + ': ' + (s ? s.ru + ' ' + sentenceLevel(s.ru) : 'kein Satz'));
    const alt = ['Я хочу хлеб утром', 'Его паспорт русский', 'Персона была', 'У Земли есть орбита', 'известна кофе', 'Сирия находится в Азии', 'бежит быстро', 'Рассвет красивый сегодня', 'сажает семена быстро',
      'билет на путешествие', 'Мой глаз красный', 'Нос холодный зимой', 'Каждый день я иду в школу', 'мы идём в поход', 'копать яму и вешать', 'Надо платить и не тратить', 'который видит письмо'];
    const satzRu = SENTENCE_PAIRS.map(x => x.ru).concat(allVocabWords().map(w => (getWordSentence(w) || {}).ru || ''));
    const altDa = alt.filter(x => satzRu.some(s => s && s.includes(x)));
    const deAlt = ['Das Gold', 'Das Aluminium', 'Das Silber', 'Der Kuchen ist lecker', 'Die Weintraube', 'Der Pfeffer', 'Unsere Klasse', 'hineingehen', 'Vorabend des neuen Jahres', 'erzählt über', 'Linie der Metro', 'Das Netzwerk', 'Die Immunität', 'Die Union zwischen', 'Ein Armband ist', 'möchte etwas trinken', 'Ich möchte schlafen', 'Terminschein', 'Versicherungspolice', 'Versicherungskarte', 'eine Pirogge']
      .filter(x => SENTENCE_PAIRS.some(s => s.de.includes(x)) || allVocabWords().some(w => ((getWordSentence(w) || {}).de || '').includes(x)));
    return { stufe, de, ziel, ende, doppelt, schwer, altDa, deAlt };
  });
  ok('Wortstufen angepasst', !r.stufe.length, r.stufe);
  ok('Übersetzungen angepasst', !r.de.length, r.de);
  ok('verschobene Wörter in der neuen Kategorie', !r.ziel.length, r.ziel);
  ok('verschobene Wörter stehen in ihrer neuen Kategorie', r.ende.every(x => !x.startsWith('-')), r.ende);
  ok('kein Wort doppelt', r.doppelt === 0, r.doppelt);
  ok('neue Beispielsätze enthalten das Wort und sind nicht schwerer als das Wort', !r.schwer.length, r.schwer);
  ok('alte russische Sätze sind weg', !r.altDa.length, r.altDa);
  ok('alte deutsche Wendungen sind weg', !r.deAlt.length, r.deAlt);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
