const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Kategorien neu geordnet (16.11.): 8 Substantivgruppen (leichteste zuerst), Adverbien als eigene Wortart nach den Adjektiven
// (seit 26.11. Gruppe mit sechs Unterkategorien, Prüfung adverbien-wortart),
// Farben und Nationalitäten bei den Adjektiven, Verben mit Trenner Grundwortschatz/Themen, alter Name „Adverben“ wird übernommen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const c = await b.newContext({ viewport: { width: 1300, height: 1000 } }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('vokabeltrainer-selection', JSON.stringify({ activeMain: 'Adverben', selectedCats: ['Adverben', 'Farben'], blocks: { Adverben: [0] } })); localStorage.setItem('vokabeltrainer-hearquiz-settings', JSON.stringify({ cats: ['Adverben'] })); } });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const L = ['A1', 'A2'], ant = cc => getAllWordsOfCat(cc).filter(w => L.includes(wordLevel(w))).length / getAllWordsOfCat(cc).length;
    const subst = Object.values(SUBSTANTIVE_GROUPS).flat();
    const sortiert = Object.values(SUBSTANTIVE_GROUPS).every(g => g.every((x, i) => !i || ant(g[i - 1]) >= ant(x) - 0.001));
    return { gruppen: Object.keys(SUBSTANTIVE_GROUPS).length, alle: SUBSTANTIVE_THEMEN.every(t => subst.filter(x => x === t).length === 1) && subst.length === SUBSTANTIVE_THEMEN.length, sortiert,
      adj: WORTART_GROUPS['Adjektive'].includes('Farben') && WORTART_GROUPS['Adjektive'].includes('Nationalitäten'), inhalt: !!WORTART_GROUPS['Inhaltswörter'], adv: !!WORTART_GROUPS['Adverbien'] && !vocab['Adverbien'] && !vocab['Adverben'],
      main: activeMain, sel: [...selectedCats].sort().join(','), blk: true, hq: (() => { loadHearquizSettings(); return [...hqState.selectedCats].join(); })() };
  });
  ok('8 Substantivgruppen, jede Substantivkategorie genau einmal', r.gruppen === 8 && r.alle);
  ok('innerhalb der Gruppen die leichtesten Kategorien zuerst (Anteil A1/A2)', r.sortiert);
  ok('Farben und Nationalitäten bei den Adjektiven, keine Gruppe „Inhaltswörter“', r.adj && !r.inhalt);
  const ADV = ['Art & Weise', 'Einschätzung & Verbindung', 'Grad & Menge', 'Ort & Richtung', 'Zeit & Häufigkeit (Adv.)', 'Zustand („es ist …“)'];
  ok('alter Name „Adverben“: Auswahl wird zur Gruppe Adverbien, gespeicherte Listen nehmen ihre sechs Unterkategorien', r.adv && r.main === 'Adverbien' && r.sel === ADV.concat('Farben').sort().join(',') && r.hq.split(',').sort().join(',') === ADV.slice().sort().join(','), JSON.stringify(r));
  const s = await p.evaluate(() => {
    setAppView('vocab'); expandedMain = null; expandedTheme = 'Verben'; buildNav();
    const kacheln = [...document.querySelectorAll('#main-row > .tile-wrap > .tile, #main-row > .tile')].map(t => t.dataset.cat || t.textContent.trim().split(' (')[0]);
    const ia = kacheln.indexOf('Adjektive'), iv = kacheln.findIndex(x => /^Adverbien/.test(x)), ig = kacheln.indexOf('Grammatikwörter');
    const tr = [...document.querySelectorAll('#main-row .sub-trenner')].map(x => x.textContent);
    return { ia, iv, ig, tr, k: kacheln.join('|') };
  });
  ok('Seitenleiste: Adverbien als eigene Kachel zwischen Adjektiven und Grammatikwörtern', s.ia >= 0 && s.iv > s.ia && s.ig > s.iv, s.k);
  ok('Verben mit Zwischenzeilen „Grundwortschatz“ und „Themen“', s.tr.join() === 'Grundwortschatz,Themen', s.tr.join());
  const n = await p.evaluate(() => ({ alt: !!vocab['Wetter & Natur'], neu: getAllWordsOfCat('Natur & Wetter (Adj.)').length, gr: WORTART_GROUPS['Adjektive'].includes('Natur & Wetter (Adj.)'), mig: migrateCatName('Wetter & Natur') }));
  ok('Adjektive „Natur & Wetter (Adj.)“ (vorher „Wetter & Natur“, gleiche Reihenfolge wie bei den Verben), alter Name wird übernommen', !n.alt && n.neu === 30 && n.gr && n.mig === 'Natur & Wetter (Adj.)', JSON.stringify(n));
  ok('keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close(); process.exit(R.every(x => x[0] === 'OK ') ? 0 : 1);
})();
