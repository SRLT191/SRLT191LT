// Adverbien (26.11.): eigene Wortart mit sechs Unterkategorien statt einer Kategorie „Adverbien“ (110 Wörter).
// Jedes Wort genau einmal, Reihenfolge wie vorher, leichteste Unterkategorie zuerst, Lernstand bleibt (hängt am Wort),
// gespeicherte Auswahllisten mit „Adverbien“ nehmen die sechs Unterkategorien.
const { chromium } = require('playwright');
const path = require('path');
let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 600) : '')); } };
// später hinten angehängt (27.11.: Grad & Menge +1, Einschätzung & Verbindung +2, Prüfung adverbien-3)
const NEU = ['довольно', 'может быть', 'по-моему'];
const UK = { 'Grad & Menge': 15, 'Einschätzung & Verbindung': 10, 'Ort & Richtung': 21, 'Zeit & Häufigkeit (Adv.)': 40, 'Art & Weise': 17, 'Zustand („es ist …“)': 10 };
// alte Reihenfolge der Kategorie „Adverbien“ (bis 25.11.)
const ALT = 'здесь там сейчас потом всегда сегодня вчера завтра очень много хорошо плохо так конечно уже только тоже вдруг сразу рано почти поэтому вместе поздно рядом домой наконец никогда иногда снова назад сначала немного слишком быстро теперь тогда совсем долго точно сюда туда утром вечером действительно достаточно несколько скорее ясно ещё просто прямо затем значит например дома днём раньше летом зимой весной осенью холодно жарко по-русски часто особенно далеко близко редко обычно вовремя случайно навсегда едва везде вперёд справа слева направо налево впереди сзади медленно обязательно недавно пешком громко мало интересно приятно сложно смешно невозможно недалеко наверняка вполне неплохо нарочно заранее сверху стыдно постепенно отдельно снизу регулярно молча позавчера послезавтра пасмурно'.split(' ');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const fehlerJs = []; page.on('pageerror', e => fehlerJs.push(e.message));
  // Lernstand für „очень“ und alte Auswahllisten mit „Adverbien“ vor dem Start
  await page.addInitScript(() => { if (sessionStorage.getItem('adv')) return; sessionStorage.setItem('adv', '1');
    localStorage.setItem('vokabeltrainer-scores', JSON.stringify({ 'очень': { box: 2, correct: 1 } }));
    localStorage.setItem('vokabeltrainer-selection', JSON.stringify({ activeMain: 'Adverbien', selectedCats: ['Adverbien', 'Farben'] }));
    localStorage.setItem('vokabeltrainer-hearquiz-settings', JSON.stringify({ cats: ['Adverbien'] })); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(400);

  const r = await page.evaluate(UK => {
    const L = ['A1', 'A2'], ant = c => getAllWordsOfCat(c).filter(w => L.includes(wordLevel(w))).length / getAllWordsOfCat(c).length;
    const grp = WORTART_GROUPS['Adverbien'] || [];
    const alle = Object.keys(vocab).flatMap(c => getAllWordsOfCat(c).map(w => w.ru));
    return { grp, zahlen: grp.map(c => getAllWordsOfCat(c).length), alt: !!vocab['Adverbien'], woerter: grp.flatMap(c => getAllWordsOfCat(c).map(w => w.ru)),
      doppelt: alle.filter((x, i) => alle.indexOf(x) !== i), sortiert: grp.every((c, i) => !i || ant(grp[i - 1]) >= ant(c) - 0.001),
      gleicheNamen: Object.keys(CAT_GROUP_POOLS).filter(g => vocab[g]), symbole: grp.map(c => CAT_ICONS[c] || null),
      folge: wortartFolge().slice(wortartFolge().indexOf('Material & Stoff'), wortartFolge().indexOf('Material & Stoff') + 8),
      score: !!scores['очень'] && hasCorrectAnswer(findVocabEntry('очень')), main: activeMain, sel: [...selectedCats].sort(),
      hq: (() => { loadHearquizSettings(); return [...hqState.selectedCats].sort(); })() };
  }, UK);
  ok('Gruppe Adverbien mit sechs Unterkategorien, alte Kategorie weg', JSON.stringify(r.grp) === JSON.stringify(Object.keys(UK)) && !r.alt, r.grp);
  ok('Unterkategorien mit 15 · 10 · 21 · 40 · 17 · 10 Wörtern', JSON.stringify(r.zahlen) === JSON.stringify(Object.values(UK)), r.zahlen);
  ok('alle 110 alten und die neuen Adverbien genau einmal, keine Dubletten im Wortschatz', r.woerter.length === 110 + NEU.length && NEU.every(w => r.woerter.includes(w)) && ALT.every(w => r.woerter.includes(w)) && !r.doppelt.length, { fehlt: ALT.filter(w => !r.woerter.includes(w)), doppelt: r.doppelt });
  const proKat = await page.evaluate(() => WORTART_GROUPS['Adverbien'].map(c => getAllWordsOfCat(c).map(w => w.ru)));
  ok('innerhalb jeder Unterkategorie die alte Reihenfolge', proKat.every(ws => ws.filter(w => !NEU.includes(w)).every((w, i, a) => !i || ALT.indexOf(a[i - 1]) < ALT.indexOf(w))));
  ok('leichteste Unterkategorie zuerst (Anteil A1/A2)', r.sortiert);
  ok('keine Oberkategorie heißt wie eine Kategorie', !r.gleicheNamen.length, r.gleicheNamen);
  ok('jede Unterkategorie hat ein Symbol', r.symbole.every(Boolean), r.symbole);
  ok('Reihenfolge: nach den Adjektiven folgen die Adverbien', JSON.stringify(r.folge.slice(1, 7)) === JSON.stringify(Object.keys(UK)), r.folge);
  ok('Lernstand bleibt (hängt am Wort)', r.score);
  const ADV = Object.keys(UK).slice().sort();
  ok('gespeicherte Auswahl „Adverbien“: Gruppe bleibt gewählt, Listen nehmen die sechs Unterkategorien', r.main === 'Adverbien'
    && JSON.stringify(r.sel) === JSON.stringify(ADV.concat('Farben').sort()) && JSON.stringify(r.hq) === JSON.stringify(ADV), r);

  // Seitenleiste: Gruppe wählt 110 Wörter, Unterkategorie nur ihre
  const s = await page.evaluate(() => {
    setAppView('vocab'); expandedMain = null; expandedTheme = 'Adverbien'; buildNav();
    activateCatGroup('Adverbien'); const gruppe = getPoolRaw().length;
    selectWholeCat('Ort & Richtung'); const ort = getPoolRaw().length;
    return { gruppe, ort, knoepfe: [...document.querySelectorAll('.sub-btn[data-cat]')].map(b => b.dataset.cat).filter(c => WORTART_GROUPS['Adverbien'].includes(c)).length };
  });
  ok('Klick auf Adverbien übt alle, auf „Ort & Richtung“ nur deren 21; sechs Knöpfe in der Seitenleiste', s.gruppe === 110 + NEU.length && s.ort === 21 && s.knoepfe === 6, s);

  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
