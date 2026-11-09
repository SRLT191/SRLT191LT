const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Startseite (9.11.): „Weiterlernen“ geht bei erledigter Kategorie in die nächste, Vorschau „heute“ statt „später“,
// kein doppelter „frühestens sicher“-Hinweis, Tausenderpunkt, Handy-Zeilen mit vollem Balken, Stufenzeile mit Farben,
// „Grammatik wiederholen“, Stand Grammatik als Durchschnitt der Werkzeuge, „Oft falsch“ mit Grammatik, Heute-Verteilung
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const seed = () => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); const now = Date.now(), D = 864e5; const v = {};
    ['дом', 'кот', 'вода', 'хлеб', 'мама'].forEach((w, i) => v[w] = { c: 3, w: 0, mb: 2, l: now - 20 * D, z: now - 1000, d: 1 + (i % 3), dd: now - 5 * D });
    const g = { rektion: { 'c:пользоваться': { c: 1, w: 4, mb: 1, l: now - 9 * D, z: now - 500, d: 1, dd: now - 3 * D } }, gender: { 'стол': { c: 1, w: 0, mb: 1, l: now - 9 * D, z: now, d: 1, dd: now - 3 * D }, 'окно': { c: 1, w: 0, mb: 1, l: now - 9 * D, z: now, d: 1, dd: now - 3 * D } } };
    localStorage.setItem('vokabeltrainer-lifetime', JSON.stringify({ ver: 3, run: 1, v, g }));
    const log = {}; for (let i = 0; i < 14; i++) { const d = new Date(now - i * D); log[d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')] = [1200 + i * 950, 1000 + i * 800]; }
    localStorage.setItem('vokabeltrainer-daylog', JSON.stringify(log)); };
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } }); await ctx.addInitScript(seed);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {};
    // nächste Kategorie: Farben komplett richtig → Weiterlernen nennt die nächste Kategorie mit offenen Wörtern
    setAppView('vocab'); selectWholeCat('Farben'); getAllWordsOfCat('Farben').forEach(w => { scores[getKey(w)] = { correct: 1, wrong: 0, box: 1, lastSeen: Date.now() }; }); saveScores && saveScores();
    const order = homeCatOrder(), next = order[(order.indexOf('Farben') + 1) % order.length];
    setAppView('home');
    out.go = document.querySelector('.home-go span').textContent; out.plan = document.getElementById('home-plan').textContent; out.next = next;
    homeContinue(); out.nachher = [appView, activeSub || activeMain];
    setAppView('home');
    const fc = [...document.querySelectorAll('#home-forecast .home-wl span')].map(x => x.textContent);
    out.fc = fc[0];
    out.ersteSicher = !!document.getElementById('home-erste-sicher') && /frühestens sicher/.test(document.querySelector('#home-stufen .home-lv-sum').textContent);
    out.zahl = document.getElementById('home-weeksum').textContent;
    out.stufenZeile = [...document.querySelectorAll('.home-due-st-t .home-due-st-i')].map(x => x.textContent.trim());
    out.gramBtn = !!document.getElementById('home-gram-due');
    // Stand Grammatik: Durchschnitt der Werkzeuge
    const rows = homeGrammarRows(Date.now()), sub = rows.find(x => x.L === 'Substantive');
    const g = loadLifetime().g, src = grammarToolSources();
    const erwartet = GRAMMAR_CATS.noun.map(t => homeToolAnteile(t, g, src, Date.now())).filter(Boolean);
    const mittel = erwartet.reduce((a, l) => a + l.reduce((x, y) => x + y, 0), 0) / erwartet.length;
    out.anteil = [sub.anteil.reduce((a, b) => a + b, 0), mittel, (2 / src.gender[1])];
    out.pText = [...document.querySelectorAll('#home-gstufen .home-lvr')].find(x => x.querySelector('b').textContent === 'Substantive').querySelector('.home-p').textContent;
    // Oft falsch Grammatik
    const row = document.querySelector('#home-hard-g .home-hard-g-row');
    out.hard = row ? [row.querySelector('b').textContent, row.querySelector('small').textContent] : null;
    // Heute-Verteilung
    out.split = (document.querySelector('#home-split .home-s') || {}).textContent;
    return out;
  });
  ok('„Weiterlernen“: Kategorie erledigt → nächste Kategorie mit offenen Wörtern; Klick öffnet sie', r.go.replace(/^· /, '').startsWith(r.next + ' · ') && /offen$/.test(r.go) && r.plan.includes('weiter mit ' + r.next) && r.nachher[0] === 'vocab' && r.nachher[1] === r.next, JSON.stringify(r));
  ok('Vorschau beginnt mit „heute“ statt „später“', r.fc === 'heute', r.fc);
  ok('„frühestens sicher“ nur einmal', !r.ersteSicher);
  ok('Zahlen mit Tausenderpunkt (Wochensumme)', /^\d{1,3}(\.\d{3})+ Antworten/.test(r.zahl), r.zahl);
  ok('Stufenzeile der Fälligen mit Farbe und Zahl je Stufe', r.stufenZeile.length >= 1 && /^\d \d+$/.test(r.stufenZeile[0].replace(/\s+/g, ' ')), JSON.stringify(r.stufenZeile));
  ok('Knopf „Grammatik wiederholen“ bei fälligen Grammatikaufgaben', r.gramBtn);
  ok('Stand Grammatik: Prozent = Durchschnitt der Werkzeuge', Math.abs(r.anteil[0] - r.anteil[1]) < 1e-9 && Math.abs(r.anteil[1] - r.anteil[2] / 4) < 1e-9 && /%$/.test(r.pText), JSON.stringify(r.anteil) + ' ' + r.pText);
  ok('„Oft falsch“ zeigt auch Grammatik (пользоваться, 3× falsch)', r.hard && r.hard[0] === 'пользоваться' && r.hard[1] === '3× falsch', JSON.stringify(r.hard));
  ok('Heute: Verteilung Wörter / Grammatikaufgaben', /5 Wörter · .*3 Grammatikaufgaben/.test(r.split || ''), r.split);
  const tool = await p.evaluate(() => { document.getElementById('home-gram-due').click(); return [appView, document.querySelector('.grammar-panel.open') && document.querySelector('.grammar-panel.open').id]; });
  ok('„Grammatik wiederholen“ öffnet das Werkzeug mit den meisten Fälligen (Geschlecht)', tool[0] === 'grammar' && tool[1] === 'overlay-gender', JSON.stringify(tool));
  const tool2 = await p.evaluate(() => { setAppView('home'); document.querySelector('#home-hard-g .home-hard-g-row').click(); return document.querySelector('.grammar-panel.open').id; });
  ok('Klick auf eine Grammatik-Zeile öffnet das Werkzeug (Rektion)', tool2 === 'overlay-rektion', tool2);
  // Handy
  const m = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); await m.addInitScript(seed);
  const q = await m.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.goto('file://' + APP_PATH); await q.waitForTimeout(400);
  const h = await q.evaluate(() => { setAppView('home'); const t = document.querySelector('#home-stufen .home-lvr .home-t').getBoundingClientRect(), c = document.querySelector('#home-stufen').getBoundingClientRect(); return { breit: Math.round(t.width), karte: Math.round(c.width), ueber: document.documentElement.scrollWidth - innerWidth }; });
  ok('Handy: Balken über die ganze Kartenbreite, kein Überlauf', h.breit > h.karte * 0.8 && h.ueber <= 0, JSON.stringify(h));
  await m.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
