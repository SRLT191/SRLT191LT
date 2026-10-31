const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Startseite „Heute“ (31.10.): Weiterlernen nennt, was kommt; Tagesziel als Vielfaches und höheres Ziel;
// „erste sichere Wörter frühestens am …“ statt flacher Linie; Woche mit Zahlen je Tag, Vorwoche und Bestwerten;
// Knopf „Wörter bis … üben“ in der Stufenkarte
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const dk = await p.evaluate(() => {
    const log = {}; const add = (i, n, r) => { log[dayKey(daysAgo(i))] = [n, r]; };
    add(0, 1200, 1100); add(1, 300, 280); add(2, 400, 380); add(9, 100, 90); add(10, 200, 150); add(11, 50, 40);
    localStorage.setItem(DAYLOG_KEY, JSON.stringify(log)); daylogMem = null;
    const L = loadLifetime(), now = Date.now(), ws = allVocabWords().filter(w => w.c !== 'Zahlen');
    // Reisen: 10 Wörter heute auf Wiederholung 1 gelernt
    getAllWordsOfCat('Reisen').slice(0, 10).forEach(w => { L.v[getKey(w)] = { c: 1, w: 0, mb: 1, l: now, z: now, d: 1, dd: now }; });
    saveLifetime(); flushSaves();
    setDayGoal(500); setAppView('vocab'); selectWholeCat('Reisen'); setAppView('home');
    return dayKey();
  });
  await p.reload(); await p.waitForTimeout(400);
  let r = await p.evaluate(() => { setAppView('home'); const q = s => (document.querySelector(s) || {}).textContent || ''; return {
    go: q('.home-go').replace(/\s+/g, ' ').trim(), plan: q('#home-plan'), heute: q('#home-today .home-big').replace(/\s+/g, ' ').trim(), up: [...document.querySelectorAll('#home-goal-up button')].map(x => x.textContent).join(','),
    erste: q('#home-erste-sicher'), verlauf: !!document.querySelector('#home-stufen .home-verlauf'), nums: [...document.querySelectorAll('#home-weeknums span')].map(x => x.textContent).join(','),
    vorwoche: q('#home-vorwoche'), best: q('#home-best'), ueben: q('#home-lv-ueben').trim() }; });
  ok('Weiterlernen nennt Kategorie und offene Wörter, nicht die Gesamtzahl der Fälligen', /^Weiterlernen ?· Reisen · \d+ offen$/.test(r.go) && !/insgesamt/.test(r.plan), r.go + ' | ' + r.plan);
  ok('Tagesziel überschritten: „2,4 × Tagesziel ✓“', /^1200 2,4 × Tagesziel ✓$/.test(r.heute), r.heute);
  ok('ab doppeltem Ziel: höheres Ziel 1000 · 2000 · 5000 wählbar', r.up === '1000,2000,5000', r.up);
  ok('noch kein Wort sicher: „Erste sichere Wörter frühestens am …“ statt flacher Linie', /^Erste sichere Wörter frühestens am \S+ \d+\.\d+\.$/.test(r.erste.trim()) && !r.verlauf, r.erste);
  ok('Woche: Zahl je Tag unter den Balken', r.nums.split(',').length === 7 && r.nums.endsWith('400,300,1200'), r.nums);
  ok('Woche: Vergleich zur Vorwoche', /^\+443 % zur Vorwoche \(350\)$/.test(r.vorwoche.trim()), r.vorwoche);
  ok('Bestwerte: bester Tag und längste Serie', /Bester Tag: heute \(1200\) · längste Serie: 3 Tage/.test(r.best), r.best);
  ok('Stufenkarte: Knopf „Wörter bis A1 üben“', r.ueben === 'Wörter bis A1 üben', r.ueben);
  const k = await p.evaluate(() => { document.querySelector('#home-goal-up button').click(); const z = dayGoal; setDayGoal(500); return z; });
  ok('Klick auf höheres Ziel setzt es', k === 1000, String(k));
  const u = await p.evaluate(() => { document.getElementById('home-lv-ueben').click(); return { view: appView, max: maxLevel, main: activeMain }; });
  ok('„Wörter bis A1 üben“ öffnet Vokabeln, alle Kategorien bis A1', u.view === 'vocab' && u.max === 'A1' && u.main === 'all', JSON.stringify(u));
  // sobald Wörter sicher sind, kommt die Linie zurück
  const v = await p.evaluate(() => { const L = loadLifetime(), now = Date.now(); getAllWordsOfCat('Reisen').slice(0, 2).forEach(w => { L.v[getKey(w)].d = 5; L.v[getKey(w)].dd = now; }); saveLifetime(); setAppView('home');
    return { verlauf: !!document.querySelector('#home-stufen .home-verlauf'), erste: !!document.getElementById('home-erste-sicher') }; });
  ok('mit sicheren Wörtern wieder die Verlaufslinie', v.verlauf && !v.erste, JSON.stringify(v));
  for (const w of [390, 320]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(100);
    const o = await p.evaluate(() => { setAppView('home'); return document.documentElement.scrollWidth - innerWidth; });
    ok(w + ' px: kein Überlauf', o <= 0, String(o));
  }
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
