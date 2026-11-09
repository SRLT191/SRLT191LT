const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// „Stand je Sprachstufe“: Legende erklärt, wann man jede Stufe frühestens erreicht; jeder Farbabschnitt nennt
// Anzahl und Anteil; Zeile Σ über alle Stufen und Gesamtzahl der Vokabeln.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const L = loadLifetime(), now = Date.now(), a1 = allVocabWords().filter(w => wordLevel(w) === 'A1'), b2 = allVocabWords().filter(w => wordLevel(w) === 'B2');
    [[1, 3], [2, 2], [5, 1]].reduce((k, [d, n]) => { for (let i = 0; i < n; i++) L.v[getKey(a1[k + i])] = { c: d, w: 0, mb: d, l: now, d, dd: now }; return k + n; }, 0);
    L.v[getKey(b2[0])] = { c: 2, w: 0, mb: 2, l: now, d: 2, dd: now };
    saveLifetime(); setAppView('home');
    const rows = [...document.querySelectorAll('#home-stufen .home-lvr')], sum = rows[rows.length - 1];
    return { leg: [...document.querySelectorAll('.home-legend .home-lgi')].map(x => x.title), legFokus: [...document.querySelectorAll('.home-legend .home-lgi')].every(x => x.tabIndex === 0),
      a1Segs: [...rows[0].querySelectorAll('.home-t span')].map(x => x.title), a1Total: allVocabWords().filter(w => wordLevel(w) === 'A1').length,
      zeilen: rows.length, sumB: sum.querySelector('b').textContent, sumN: sum.querySelector('.home-n').textContent, sumKlick: sum.getAttribute('role'),
      sumSegs: [...sum.querySelectorAll('.home-t span')].map(x => x.className + ':' + x.title.split(':')[0]),
      text: document.querySelector('.home-lv-sum').textContent, gesamt: allVocabWords().length.toLocaleString('de-DE'), gesamtN: allVocabWords().length, rowTitle: rows[0].title };
  });
  ok('Legende: Tooltip je Stufe mit Mindestabstand (sofort, 1, 3, 7, 14 Tage), per Tastatur erreichbar', r.legFokus && /sofort/.test(r.leg[0]) && /1 Tag nach Wiederholung 1/.test(r.leg[1]) && /3 Tage nach Wiederholung 2/.test(r.leg[2]) && /7 Tage nach Wiederholung 3/.test(r.leg[3]) && /14 Tage nach Wiederholung 4.*sicher/.test(r.leg[4]), r.leg.join(' | '));
  ok('A1-Abschnitte nennen Stufe, Anzahl und Anteil', r.a1Segs.join('|') === `A1 · Wiederholung 5 (sicher): 1 Wort (<1 % von ${r.a1Total})|A1 · Wiederholung 2: 2 Wörter (<1 % von ${r.a1Total})|A1 · Wiederholung 1: 3 Wörter (<1 % von ${r.a1Total})`, r.a1Segs.join(' | '));
  ok('Zeilen-Tooltip nennt auch „noch nicht geübt“', r.rowTitle.endsWith('noch nicht geübt: ' + (r.a1Total - 6)), r.rowTitle);
  ok('Zeile Σ: Summe aller Stufen, nicht anklickbar', r.zeilen === 6 && r.sumB === 'Σ' && r.sumN === '7 / ' + r.gesamt && r.sumKlick === null && r.sumSegs.join() === 's5:Gesamt · Wiederholung 5 (sicher),s2:Gesamt · Wiederholung 2,s1:Gesamt · Wiederholung 1', JSON.stringify([r.sumN, r.sumSegs]));
  ok('Gesamtzeile mit Vokabelzahl', r.text === `${r.gesamt} Vokabeln insgesamt · 1 sicher · 6 in Wiederholung · ${(r.gesamtN - 7).toLocaleString('de-DE')} noch nicht geübt`, r.text);
  await p.setViewportSize({ width: 320, height: 800 }); await p.waitForTimeout(150);
  ok('320 px: kein Überlauf', await p.evaluate(() => document.documentElement.scrollWidth <= 320));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
