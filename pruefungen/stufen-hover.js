const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Darüberfahren über einen Balkenabschnitt oder die Legende zeigt rechts Anzahl und Anteil genau dieser
// Wiederholungsstufe (Startseite „Stand je Sprachstufe“ und „Fortschritt nach Stufen“); Wegfahren stellt „geübt“ wieder her
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const soll = await p.evaluate(() => {
    const L = loadLifetime(), now = Date.now(), a1 = allVocabWords().filter(w => wordLevel(w) === 'A1');
    // A1: 10 auf Wiederholung 1, 6 auf 2, 3 auf 3
    a1.slice(0, 19).forEach((w, i) => { L.v[getKey(w)] = { c: 1, w: 0, mb: 1, l: now, z: now, d: i < 10 ? 1 : i < 16 ? 2 : 3, dd: now }; });
    saveLifetime(); setAppView('home'); return { total: a1.length };
  });
  const zeile = () => p.evaluate(() => { const r = document.querySelector('#home-stufen .home-lvr'); return { n: r.querySelector('.home-n').textContent, p: r.querySelector('.home-p').textContent, hl: r.dataset.hl || '' }; });
  const z0 = await zeile();
  await p.hover('#home-stufen .home-lvr .home-t .s2');
  const z2 = await zeile();
  ok('Abschnitt „Wiederholung 2“: rechts 6 / A1-Gesamt und Anteil', z2.n === '6 / ' + soll.total && z2.p === (6 / soll.total * 100 < 1 ? '<1' : Math.round(6 / soll.total * 100)) + ' %' && z2.hl === '2', JSON.stringify(z2));
  await p.hover('#home-stufen .home-lvr .home-t .s1');
  const z1 = await zeile();
  ok('Wechsel auf „Wiederholung 1“: 10 / …', z1.n === '10 / ' + soll.total && z1.hl === '1', JSON.stringify(z1));
  await p.mouse.move(5, 5); await p.waitForTimeout(80);
  const zz = await zeile();
  ok('Wegfahren stellt „geübt“ wieder her', zz.n === z0.n && zz.p === z0.p && !zz.hl, JSON.stringify([z0, zz]));
  await p.hover('#home-stufen .home-lgi[data-st="3"]');
  const leg = await p.evaluate(() => [...document.querySelectorAll('#home-stufen .home-lvr')].map(r => r.dataset.hl + ':' + r.querySelector('.home-n').textContent));
  ok('Legende „3“: alle Zeilen der Karte zeigen Wiederholung 3 (A1: 3, Σ: 3)', leg.every(x => x.startsWith('3:')) && leg[0].startsWith('3:3 /') && leg[leg.length - 1].startsWith('3:3 /'), leg.join(' | '));
  await p.waitForTimeout(250);
  const op = await p.evaluate(() => { const r = document.querySelector('#home-stufen .home-lvr'); return [getComputedStyle(r.querySelector('.s1')).opacity, getComputedStyle(r.querySelector('.s3')).opacity]; });
  ok('Andere Abschnitte abgeblendet, gewählter voll', +op[0] < 0.5 && +op[1] === 1, op.join(' / '));
  await p.mouse.move(5, 5); await p.waitForTimeout(80);
  const fok = await p.evaluate(() => { const l = document.querySelector('#home-stufen .home-lgi[data-st="2"]'); l.focus(); const a = document.querySelector('#home-stufen .home-lvr').querySelector('.home-n').textContent; l.blur(); const b2 = document.querySelector('#home-stufen .home-lvr').querySelector('.home-n').textContent; return [a, b2]; });
  ok('Per Tastatur (Fokus auf der Legende) ebenso, Verlassen stellt wieder her', fok[0].startsWith('6 /') && fok[1] === z0.n, fok.join(' → '));

  // Fortschritt nach Stufen
  await p.evaluate(() => openLevelOverview()); await p.waitForTimeout(150);
  await p.hover('#level-overview-body .lvl-row[data-l="A1"] .s3');
  const lv = await p.evaluate(() => { const r = document.querySelector('#level-overview-body .lvl-row[data-l="A1"]'); return { n: r.querySelector('.lvl-num').textContent, p: r.querySelector('.lvl-pct').textContent }; });
  ok('Stufen-Übersicht: Abschnitt „Wiederholung 3“ zeigt 3 / …', lv.n === '3 / ' + soll.total, JSON.stringify(lv));
  await p.mouse.move(5, 5); await p.waitForTimeout(80);
  const lvz = await p.evaluate(() => document.querySelector('#level-overview-body .lvl-row[data-l="A1"] .lvl-num').textContent);
  ok('Stufen-Übersicht: Wegfahren stellt wieder her', lvz === '19 / ' + soll.total, lvz);

  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
