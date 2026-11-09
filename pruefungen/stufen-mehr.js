const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Startseite: „heute aufstiegsbereit“ je Stufe (↑N), frühester Termin für „sicher“, am Handy Zahlen per Antippen,
// Verlauf der sicheren Vokabeln (12 Wochen) und dieselbe Karte für die Grammatik.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const JETZT = new Date('2026-10-29T12:00:00+01:00').getTime(), D = 864e5;
  const SAAT = ([jetzt, D]) => {
    const L = loadLifetime(), a1 = allVocabWords().filter(w => wordLevel(w) === 'A1');
    const set = (w, d, ddVor) => { L.v[getKey(w)] = { c: d, w: 0, mb: d, l: jetzt, d, dd: jetzt - ddVor * D }; };
    set(a1[0], 1, 2);  // Stufe 1, vor 2 Tagen → bereit (1 Tag nötig)
    set(a1[1], 1, 0);  // Stufe 1, heute → nicht bereit
    set(a1[2], 3, 8);  // Stufe 3, vor 8 Tagen → bereit (7 nötig)
    set(a1[3], 4, 10); // Stufe 4, vor 10 Tagen → sicher frühestens in 4 Tagen (2.11.)
    set(a1[4], 4, 10); // dito
    set(a1[5], 4, 2);  // Stufe 4, vor 2 Tagen → sicher frühestens in 12 Tagen (10.11.)
    set(a1[6], 5, 20); set(a1[7], 5, 3); set(a1[8], 5, 100);   // sicher seit 20, 3 und 100 Tagen
    L.g.conj = { a: { c: 1, w: 0, mb: 1, l: jetzt, d: 2, dd: jetzt - 5 * D }, b: { c: 1, w: 0, mb: 1, l: jetzt, d: 5, dd: jetzt - D } };
    L.g.case = { x: { c: 1, w: 0, mb: 1, l: jetzt, d: 1, dd: jetzt } };
    saveLifetime(); setAppView('home');
  };
  const p = await b.newPage({ viewport: { width: 1280, height: 1400 }, timezoneId: 'Europe/Berlin' }); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date(JETZT) });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  await p.evaluate(SAAT, [JETZT, D]);
  const r = await p.evaluate(() => {
    const a1 = document.querySelector('#home-stufen .home-lvr'), sum = document.querySelector('#home-stufen .home-lvr-sum');
    return { up: a1.querySelector('.home-up').textContent, upT: a1.querySelector('.home-up').title, upSum: sum.querySelector('.home-up').textContent,
      title: a1.title, text: document.querySelector('#home-stufen .home-lv-sum').textContent,
      verlauf: document.querySelector('#home-stufen .home-verlauf svg').getAttribute('aria-label'), vn: document.querySelector('.home-verlauf-n').textContent,
      gZeilen: [...document.querySelectorAll('#home-gstufen .home-lvr')].map(x => x.querySelector('b').textContent + ' ' + x.querySelector('.home-n').textContent + ' ' + x.querySelector('.home-up').textContent),
      gText: document.querySelector('#home-gstufen .home-lv-sum').textContent };
  });
  ok('↑2 bei A1: zwei Wörter heute aufstiegsbereit, Tooltip erklärt', r.up === '↑2' && /2 Wörter können heute mit einer richtigen Antwort eine Stufe aufsteigen/.test(r.upT) && r.upSum === '↑2', JSON.stringify([r.up, r.upT, r.upSum]));
  ok('frühestens sicher: 2 ab Mo. 2.11. · 1 ab Di. 10.11.', /frühestens sicher: 2 ab Mo\.? 2\.11\. · 1 ab Di\.? 10\.11\./.test(r.title) && /2 Wörter heute aufstiegsbereit/.test(r.title), r.title);
  ok('Gesamtzeile nennt aufstiegsbereit und Termine', /2 heute aufstiegsbereit · frühestens sicher: 2 ab/.test(r.text), r.text);
  ok('Verlauf: 12 Wochen, heute 3 sicher, vor 1 und 2 Wochen 2, davor 1 (sicher seit 3, 20 und 100 Tagen)', /29\.10\. 3$/.test(r.verlauf) && /22\.10\. 2,/.test(r.verlauf) && /15\.10\. 2,/.test(r.verlauf) && /8\.10\. 1,/.test(r.verlauf) && r.verlauf.split(',').length === 12 && r.vn === '3', r.verlauf);
  ok('Grammatik-Karte: sechs Bereiche + Σ, Stand aus dem Gesamtstand', r.gZeilen.length === 7 && /^Verben 2 \/ [\d.]+ ↑1$/.test(r.gZeilen[0]) && /^Präpositionen 1 \/ [\d.]+ $/.test(r.gZeilen[4]) && /^Σ 3 \/ [\d.]+ ↑1$/.test(r.gZeilen[6]), r.gZeilen.join(' | '));
  ok('Grammatik-Gesamtzeile', /Grammatikaufgaben · 1 sicher · 2 in Wiederholung · [\d.]+ noch nicht geübt · 1 heute aufstiegsbereit/.test(r.gText), r.gText);
  // PC: Klick öffnet weiterhin die Stufenübersicht
  const pc = await p.evaluate(() => { document.querySelector('#home-stufen .home-lvr').click(); const o = document.getElementById('overlay-levels'); const offen = !!o && o.classList.contains('open'); if (o) o.classList.remove('open'); return { offen, det: [...document.querySelectorAll('.home-lv-det')].filter(x => !x.hidden).length }; });
  ok('PC: Klick auf eine Zeile öffnet die Stufenübersicht, klappt nichts auf', pc.offen && pc.det === 0, JSON.stringify(pc));
  // Handy: Antippen klappt die Zahlen auf und wieder zu
  const m = await b.newPage({ viewport: { width: 390, height: 1400 }, hasTouch: true, isMobile: true, timezoneId: 'Europe/Berlin' }); m.on('pageerror', e => errs.push(e.message));
  await m.clock.install({ time: new Date(JETZT) });
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(300); await m.evaluate(SAAT, [JETZT, D]);
  await m.locator('#home-stufen .home-lvr').first().tap();
  const auf = await m.evaluate(() => { const d = document.getElementById('home-det-lv-0'), r = document.querySelector('#home-stufen .home-lvr'); return { sicht: !d.hidden, text: d.textContent, aria: r.getAttribute('aria-expanded'), link: !!d.querySelector('.home-lv-link'), ov: (document.getElementById('overlay-levels') || { classList: { contains: () => false } }).classList.contains('open') }; });
  ok('Handy: Antippen klappt die Zahlen auf (mit Link zur Stufenübersicht), öffnet nichts', auf.sicht && auf.aria === 'true' && auf.link && !auf.ov && /Wiederholung 5 \(sicher\): 3/.test(auf.text) && /aufstiegsbereit/.test(auf.text), JSON.stringify(auf));
  await m.locator('#home-stufen .home-lvr').first().tap();
  ok('Handy: erneutes Antippen klappt wieder zu', await m.evaluate(() => document.getElementById('home-det-lv-0').hidden));
  await m.locator('#home-gstufen .home-lvr').first().tap();
  ok('Handy: Grammatik-Zeile klappt ebenfalls auf', await m.evaluate(() => !document.getElementById('home-det-gr-0').hidden && /Wiederholung 5 \(sicher\): 1 · Wiederholung 2: 1/.test(document.getElementById('home-det-gr-0').textContent)));
  await m.setViewportSize({ width: 320, height: 1400 }); await m.waitForTimeout(150);
  ok('320 px: kein Überlauf', await m.evaluate(() => document.documentElement.scrollWidth <= 320));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
