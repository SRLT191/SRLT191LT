const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// „Fortschritt nach Stufen“ überarbeitet: Ziel und „fehlen noch“ nach dem Gesamtstand, Balken in den Farben der
// Wiederholungsstufen, Grammatik als Liste, Erklärung hinter ⓘ, am PC zwei Spalten, Klick auf eine Stufe öffnet ihren Stufenplan
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  // Gesamtstand: 90 % der A1-Wörter gelernt (Stufen 1–5 gemischt), 100 A2-Wörter; Übungsstand leer (wie nach dem Zurücksetzen)
  const vor = await p.evaluate(() => {
    const L = loadLifetime(), now = Date.now(), ws = allVocabWords();
    const a1 = ws.filter(w => wordLevel(w) === 'A1'), a2 = ws.filter(w => wordLevel(w) === 'A2');
    const n1 = Math.ceil(a1.length * 0.9);
    a1.slice(0, n1).forEach((w, i) => { L.v[getKey(w)] = { c: 1, w: 0, mb: 1, l: now - 9e8, z: now, d: 1 + (i % 5), dd: now }; });
    a2.slice(0, 100).forEach(w => { L.v[getKey(w)] = { c: 1, w: 0, mb: 1, l: now, z: now, d: 1, dd: now }; });
    saveLifetime(); resetProgress(); flushSaves();
    setMyLevel(''); openLevelOverview();
    return { a1: a1.length, n1, a2: a2.length };
  });
  let s = await p.evaluate(() => {
    const body = document.getElementById('level-overview-body');
    return { ziel: body.querySelector('.lvl-ziel-box').textContent.replace(/\s+/g, ' ').trim(), next: body.querySelector('.lvl-next').textContent.replace(/\s+/g, ' ').trim() };
  });
  ok('1 Ziel nach dem Gesamtstand: A1 zu 90 % gelernt → Ziel A2', /Dein Ziel: A2/.test(s.ziel) && /weniger als 80 %/.test(s.ziel), s.ziel);
  ok('1 „Bis A2 fehlen noch“ zählt den Gesamtstand (nicht den leeren Übungsstand)', s.next.startsWith((vor.a2 - 100) + ' Wörter der Stufe A2 noch nie richtig'), s.next);

  // 2 Wörter-Zeilen in den Farben der Wiederholungsstufen
  const w = await p.evaluate(() => [...document.querySelectorAll('#level-overview-body .lvl-row')].map(r => ({
    l: r.dataset.l, segs: [...r.querySelectorAll('.lvl-t span')].map(x => x.className).join(','), num: r.querySelector('.lvl-num').textContent,
    pct: r.querySelector('.lvl-pct').textContent, title: r.title })));
  const a1 = w.find(x => x.l === 'A1') || {};
  ok('2 Fünf Stufenzeilen mit Balken in Stufenfarben s1–s5', w.length === 5 && a1.segs === 's5,s4,s3,s2,s1', JSON.stringify(a1.segs));
  ok('2 Zahl „gelernt / gesamt“ und Prozent statt „1 · 403 / 838“', a1.num === vor.n1 + ' / ' + vor.a1 && a1.pct === Math.round(vor.n1 / vor.a1 * 100) + ' %', a1.num + ' · ' + a1.pct);
  ok('2 Hinweis nennt Stufen und den aktuellen Übungsstand', /Wiederholung 5 \(sicher\)/.test(a1.title) && /aktuell \(Übungsstand\): 0 von/.test(a1.title), a1.title);
  ok('2 Legende Stufe 1–5 sicher', await p.evaluate(() => document.querySelectorAll('#level-overview-body .lvl-legend2 .home-lg').length === 5));

  // 3 Grammatik als Liste mit Balken und einem Prozentwert
  const g = await p.evaluate(() => {
    const tools = [...document.querySelectorAll('#level-overview-body .lvl-tool')];
    return { n: tools.length, alle: tools.every(t => t.querySelector('.lvl-t') && /^\d+ %$/.test(t.querySelector('.lvl-pct').textContent)),
      doppelt: tools.some(t => /%.*%/.test(t.textContent)), none: (document.querySelector('#level-overview-body .lvl-gr-none') || {}).textContent || '',
      soll: Object.keys(GRAMMAR_TOOL_LEVEL).length };
  });
  ok('3 Jedes Werkzeug eine Zeile mit Balken und einem Prozentwert', g.n === g.soll && g.alle && !g.doppelt, JSON.stringify(g));
  ok('3 Hinweis für Stufen ohne Werkzeuge', /^B1–C1: noch keine eigenen Grammatikwerkzeuge/.test(g.none), g.none);
  const gw = await p.evaluate(() => { const L = loadLifetime(); L.g.gender = L.g.gender || {}; ['мебель', 'ночь', 'время'].forEach(k => L.g.gender[k] = { c: 1, w: 0, mb: 1, l: Date.now(), z: Date.now(), d: 2, dd: Date.now() }); saveLifetime(); openLevelOverview();
    const t = [...document.querySelectorAll('#level-overview-body .lvl-tool')].find(x => /Geschlecht/.test(x.textContent)); return { segs: t.querySelectorAll('.lvl-t span.s2').length, title: t.title }; });
  ok('3 Werkzeugbalken aus dem Gesamtstand', gw.segs === 1 && /Wiederholung 2: 3 · noch nicht geübt/.test(gw.title), JSON.stringify(gw));

  // 4 „fehlen noch“: kurze Zeile, höchstens 6 Knöpfe, Rest als Hinweis; Knopf öffnet das Werkzeug
  const f = await p.evaluate(() => { setMyLevel('A1'); openLevelOverview(); const c = document.querySelectorAll('#level-overview-body .lvl-schwach .lvl-chip'); return { n: c.length, more: (document.querySelector('#level-overview-body .lvl-more') || {}).textContent || '', next: document.querySelector('#level-overview-body .lvl-next').textContent }; });
  ok('4 Höchstens 6 Werkzeug-Knöpfe, Rest als „und N weitere“', f.n === 6 && /^und \d+ weitere/.test(f.more) && /Werkzeuge unter 50 %/.test(f.next), JSON.stringify(f));
  const chip = await p.evaluate(() => { document.querySelector('#level-overview-body .lvl-chip').click(); const r = { view: appView, zu: !document.getElementById('overlay-levels').classList.contains('open') }; setAppView('vocab'); return r; });
  ok('4 Knopf öffnet das Werkzeug', chip.view === 'grammar' && chip.zu, JSON.stringify(chip));

  // 5 Erklärung hinter ⓘ, Zustand gemerkt
  const info = await p.evaluate(() => { openLevelOverview(); const a = document.getElementById('lvl-info').hidden; document.getElementById('lvl-info-btn').click(); const b2 = document.getElementById('lvl-info').hidden;
    openLevelOverview(); const c = document.getElementById('lvl-info').hidden; document.querySelector('#lvl-info .gt-info-close').click(); openLevelOverview(); return { a, b: b2, c, d: document.getElementById('lvl-info').hidden }; });
  ok('5 Erklärung startet zu, ⓘ öffnet, Zustand bleibt, × schließt', info.a && !info.b && !info.c && info.d, JSON.stringify(info));

  // 6 Ziel mit Begründung bei „Mein Niveau“
  const z = await p.evaluate(() => { setMyLevel('B1'); openLevelOverview(); const t = document.querySelector('#level-overview-body .lvl-ziel-box').textContent; setMyLevel(''); return t.replace(/\s+/g, ' ').trim(); });
  ok('6 „Dein Ziel“ mit Begründung (Mein Niveau)', /Dein Ziel: B1 dein eingestelltes Niveau/.test(z), z);

  // 7 zwei Spalten am PC, eine am schmalen Fenster und am Handy
  const spalten = async wd => { await p.setViewportSize({ width: wd, height: 900 }); await p.waitForTimeout(100); return p.evaluate(() => { openLevelOverview(); const c = [...document.querySelectorAll('#level-overview-body .lvl-col')].map(x => x.getBoundingClientRect()); return { nebeneinander: Math.abs(c[0].top - c[1].top) < 2 && c[1].left > c[0].right, ueber: document.documentElement.scrollWidth - innerWidth }; }); };
  const s1280 = await spalten(1280), s900 = await spalten(900), s320 = await spalten(320);
  ok('7 1280 px: zwei Spalten nebeneinander', s1280.nebeneinander, JSON.stringify(s1280));
  ok('7 900 px und 320 px: eine Spalte, kein Überlauf', !s900.nebeneinander && !s320.nebeneinander && s320.ueber <= 0, JSON.stringify([s900, s320]));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(100);
  const touch = await p.evaluate(() => { openLevelOverview(); const h = sel => Math.min(...[...document.querySelectorAll('#level-overview-body ' + sel)].map(x => Math.round(x.getBoundingClientRect().height))); return { zeile: h('.lvl-row'), werkzeug: h('.lvl-tool'), knopf: h('.lvl-chip') }; });
  ok('7 Handy: Tippflächen ≥ 44 px', touch.zeile >= 44 && touch.werkzeug >= 44 && touch.knopf >= 44, JSON.stringify(touch));
  await p.setViewportSize({ width: 1280, height: 900 });

  // 8 Klick auf eine Stufenzeile zeigt ihren Stufenplan, Taste Enter ebenso
  const k = await p.evaluate(() => { openLevelOverview(); document.querySelector('#level-overview-body .lvl-row[data-l="B2"]').click();
    const a = { tab: document.querySelector('#lvl-plan-tabs .mode-btn.active').dataset.l, mark: document.querySelector('.lvl-row.lvl-plan-on').dataset.l, plan: /Wörter B2/.test(document.getElementById('lvl-plan').textContent) };
    document.querySelector('#level-overview-body .lvl-row[data-l="A2"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    a.enter = document.querySelector('#lvl-plan-tabs .mode-btn.active').dataset.l; closeOverlay('overlay-levels'); return a; });
  ok('8 Klick auf B2 öffnet den Stufenplan B2 und markiert die Zeile; Enter auf A2 ebenso', k.tab === 'B2' && k.mark === 'B2' && k.plan && k.enter === 'A2', JSON.stringify(k));

  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
