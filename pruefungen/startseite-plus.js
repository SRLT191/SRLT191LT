const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Startseite: Plantext unterscheidet Auswahl und Gesamtzahl, Vorschau der fälligen Tage als Balken, Woche je Übungstag
// mit Tooltips, breiter am großen Bildschirm, Raster ohne Lücken, „heute neu gelernt/aufgestiegen“, fällige nach Stufe
// mit „Älteste zuerst“, Tagesziel per Knopf.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const JETZT = new Date('2026-10-29T15:00:00+01:00').getTime(), D = 864e5;
  const SAAT = ([jetzt, D]) => {
    const L = loadLifetime(), ws = allVocabWords(), sport = getAllWordsOfCat('Sport');
    const set = (w, d, vor) => { L.v[getKey(w)] = { c: d, w: 0, mb: d, l: jetzt, d, dd: jetzt - vor * D }; };
    set(sport[0], 1, 3); set(sport[1], 2, 10); set(sport[2], 1, 1.5);      // drei fällig in Sport (Stufe 1, 2, 1)
    set(ws[0], 3, 30); set(ws[1], 1, 5);                                      // zwei fällig außerhalb (Stufe 3, 1)
    set(ws[2], 1, 0); set(ws[3], 2, 0); set(ws[4], 4, 0);                     // heute: 1 neu, 2 aufgestiegen
    set(ws[5], 1, 0.8);                                                       // fällig später heute (ws[2] morgen)
    L.g.conj = { a: { c: 1, w: 0, mb: 1, l: jetzt, d: 2, dd: jetzt } };
    saveLifetime();
    const log = {}; log[dayKey(daysAgo(2))] = [40, 30]; log[dayKey(daysAgo(1))] = [20, 20]; log[dayKey()] = [30, 27];
    localStorage.setItem('vokabeltrainer-daylog', JSON.stringify(log)); daylogMem = null;
    selectWholeCat('Sport'); setAppView('home');
  };
  const p = await b.newPage({ viewport: { width: 1280, height: 1400 }, timezoneId: 'Europe/Berlin' }); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date(JETZT) });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300); await p.evaluate(SAAT, [JETZT, D]);
  const r = await p.evaluate(() => ({
    go: document.querySelector('.home-go').textContent.replace(/\s+/g, ' ').trim(), plan: document.getElementById('home-plan').textContent,
    fc: document.getElementById('home-forecast').getAttribute('aria-label'), fcBars: document.querySelectorAll('#home-forecast .home-fc-bars > div').length,
    morgen: document.querySelectorAll('#home-forecast .home-fc-bars > div')[1].title,
    st: document.querySelector('.home-due-st-t').textContent, stSegs: [...document.querySelectorAll('.home-due-st span')].map(x => x.className).join(),
    week: document.getElementById('home-weeksum').textContent, wTip: [...document.querySelectorAll('.home-week div')].map(x => x.title),
    gew: document.getElementById('home-gewinn').textContent.trim(), pick: [...document.querySelectorAll('.home-goal-pick button')].map(x => x.textContent).join(),
  }));
  ok('Knopf: was als Nächstes kommt (Kategorie und offen); Zeile darunter: fällig und neu in der Auswahl', /^Weiterlernen· Sport · \d+ offen$/.test(r.go.replace(/\s+/g, ' ').replace('Weiterlernen ·', 'Weiterlernen·')) && /^Vokabeln · Sport: 3 fällig, \d+ neu$/.test(r.plan), r.go + ' | ' + r.plan);
  ok('Vorschau als Balkenreihe über 8 Tage, „später heute“, Zahlen im Tooltip', r.fcBars === 8 && /^Fällig in den kommenden Tagen: später heute 1, morgen 1,/.test(r.fc) && r.morgen === 'morgen: 1 fällig', r.fc);
  ok('Fällige nach Stufe: Balken und Text', r.st === 'Wiederholung 1: 3 · Wiederholung 2: 1 · Wiederholung 3: 1' && r.stSegs === 's1,s2,s3', r.st + ' / ' + r.stSegs);
  ok('Woche: Schnitt je Übungstag', r.week === '90 Antworten · Ø 30 je Übungstag (3 von 7) · 86 % richtig', r.week);
  ok('Woche: Tooltip je Balken mit Antworten und Quote', r.wTip[6] === 'Do: 30 Antworten · 90 % richtig' && r.wTip[0] === 'Fr: nicht geübt', r.wTip.join(' | '));
  ok('Heute: neu gelernt, aufgestiegen, Grammatik', r.gew === '1 neu gelernt · 2 aufgestiegen · Grammatik 1', r.gew);
  ok('ohne Tagesziel: Knöpfe 50 · 100 · 200 · 500 · 1000 · 2000 · 5000', r.pick === '50,100,200,500,1000,2000,5000', r.pick);
  // Älteste zuerst
  const alt = await p.evaluate(() => { document.querySelectorAll('.home-due-btns button')[1].click(); const order = []; for (let i = 0; i < 5; i++) { order.push(currentWord.ru); updateScore(currentWord, true); nextWord(); } return { a: activeMain, order }; });
  const erwartet = await p.evaluate(() => { const ws = allVocabWords(), sport = getAllWordsOfCat('Sport'); return [ws[0], sport[1], ws[1], sport[0], sport[2]].map(w => w.ru); });
  ok('„Älteste zuerst“: Reihenfolge nach abgelaufener Wartezeit', alt.a === 'due' && alt.order.join() === erwartet.join(), alt.order.join() + ' / soll ' + erwartet.join());
  // Tagesziel per Knopf, bleibt nach Neuladen, Ring
  await p.evaluate(() => setAppView('home'));
  await p.click('.home-goal-pick button:nth-child(2)');
  const ring = await p.evaluate(() => ({ goal: dayGoal, ring: !!document.querySelector('#home-today .home-ring'), big: document.querySelector('#home-today .home-big').textContent.replace(/\s+/g, ' '), pick: !!document.querySelector('.home-goal-pick'), sett: localStorage.getItem('vokabeltrainer-day-goal'), offen: document.getElementById('overlay-settings').classList.contains('open') }));
  ok('Tagesziel per Knopf: 50, Ring da, Knöpfe weg, kein Einstellungsfenster', ring.goal === 50 && ring.ring && /^35 von 50/.test(ring.big) && !ring.pick && ring.sett === '50' && !ring.offen, JSON.stringify(ring));
  await p.reload(); await p.waitForTimeout(300); await p.evaluate(() => setAppView('home'));
  ok('Tagesziel bleibt nach Neuladen, Einstellung zeigt es', await p.evaluate(() => dayGoal === 50 && document.getElementById('daygoal-select').value === '50'));
  // Layout: breit am großen Bildschirm, Raster dicht
  const p2 = await b.newPage({ viewport: { width: 2000, height: 1200 } }); p2.on('pageerror', e => errs.push(e.message));
  await p2.goto('file://' + APP_PATH); await p2.waitForTimeout(300);
  const lay = await p2.evaluate(() => { const L = loadLifetime(), now = Date.now(); allVocabWords().slice(0, 20).forEach((w, i) => { L.v[getKey(w)] = { c: 1, w: 5, f: 4, mb: 1, l: now, d: 1, dd: now }; }); saveLifetime(); setAppView('home');
    const r = id => document.getElementById(id).getBoundingClientRect(), z = [...document.querySelectorAll('.home-card')].find(x => /Zuletzt geübt/.test(x.textContent)).getBoundingClientRect();
    return { w: Math.round(document.getElementById('home-view').getBoundingClientRect().width), hardNebenStufen: Math.abs(r('home-hard').top - r('home-stufen').top) < 2, zuletztNebenGram: Math.abs(z.top - r('home-gstufen').top) < 2, flow: getComputedStyle(document.querySelector('.home-grid')).gridAutoFlow }; });
  ok('2000 px: Startseite 1320 px breit, Oft falsch neben Stand, Zuletzt geübt neben Grammatik', lay.w === 1320 && lay.hardNebenStufen && lay.zuletztNebenGram, JSON.stringify(lay));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
