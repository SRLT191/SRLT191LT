const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Lernkarte und Seitenleiste (31.10.): Kategorie auf der Karte, Einstellung „Größe der Lernkarte“,
// Seitenleiste auf großen Bildschirmen größer, Fortschrittsstrich der Kategorie als Balken mit Spur
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 2000, height: 1100 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);

  const k = await p.evaluate(() => { setAppView('vocab'); selectWholeCat('Ökonomie'); setDirection('de-ru'); const a = document.getElementById('card-cat').textContent;
    selectMainCat('all'); const w = currentWord; return { oekonomie: a, alle: document.getElementById('card-cat').textContent, soll: getWordCategory(w) }; });
  ok('1 Kategorie des Worts steht auf der Karte (auch bei „Alle“)', k.oekonomie === 'Ökonomie' && k.alle === k.soll && !!k.alle, JSON.stringify(k));

  const g = await p.evaluate(() => {
    const fs = () => parseFloat(getComputedStyle(document.getElementById('russian-word')).fontSize), iw = () => Math.round(document.getElementById('inner').getBoundingClientRect().width);
    document.getElementById('russian-word').dataset.len = ''; const out = {}; ['auto', 'gross', 'sehrgross'].forEach(m => { setCardSize(m); out[m] = [fs(), iw()]; });
    const el = document.getElementById('russian-word'); el.textContent = 'Wirtschaft / Ökonomie'; el.dataset.len = 'lang'; out.lang = fs(); el.dataset.len = 'sehrlang'; out.sehrlang = fs();
    out.gemerkt = localStorage.getItem('vokabeltrainer-card-size'); out.backup = BACKUP_KEYS.includes('vokabeltrainer-card-size');
    out.seg = [...document.querySelectorAll('#cardsize-seg button')].map(x => x.textContent).join(',');
    return out; });
  ok('5 Größe der Lernkarte: automatisch < groß < sehr groß (Schrift und Breite)', g.auto[0] < g.gross[0] && g.gross[0] < g.sehrgross[0] && g.auto[1] < g.gross[1] && g.gross[1] < g.sehrgross[1], JSON.stringify(g));
  ok('5 lange Wörter bei „sehr groß“ kleiner gesetzt', g.lang < g.sehrgross[0] && g.sehrlang < g.lang, g.lang + ' / ' + g.sehrlang);
  ok('5 Einstellung in Darstellung, gemerkt und in der Sicherung', g.seg === 'Automatisch,Groß,Sehr groß' && g.gemerkt === 'sehrgross' && g.backup, JSON.stringify(g));
  await p.reload(); await p.waitForTimeout(300);
  const nach = await p.evaluate(() => document.documentElement.getAttribute('data-cardsize'));
  ok('5 Größe bleibt nach Neuladen', nach === 'sehrgross', String(nach));

  await p.evaluate(() => setAppView('vocab')); await p.click('text=Substantive'); await p.waitForTimeout(200); await p.click('text=Gesellschaft & Staat'); await p.waitForTimeout(300);
  const s = await p.evaluate(() => { const b = document.querySelector('.sub-btn[data-cat]'); return parseFloat(getComputedStyle(b).fontSize); });
  await p.setViewportSize({ width: 1280, height: 900 }); await p.waitForTimeout(100);
  const s2 = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.sub-btn[data-cat]')).fontSize));
  ok('6 Seitenleiste ab 1600 px eine Stufe größer (13,5 statt 12 px)', s === 13.5 && s2 === 12, s + ' / ' + s2);

  const f = await p.evaluate(() => {
    const ws = getAllWordsOfCat('Politik'); ws.slice(0, 13).forEach(w => scores[getKey(w)] = { correct: 1, wrong: 0, box: 1, lastSeen: Date.now() }); refreshNavCounts();
    const btn = document.querySelector('.sub-btn[data-cat="Politik"]'); const bg = getComputedStyle(btn, '::after').backgroundImage;
    const gruppe = [...document.querySelectorAll('.sub-btn')].find(x => !x.dataset.cat); const gbg = gruppe ? getComputedStyle(gruppe, '::after').backgroundImage : 'none';
    return { title: btn.title, spur: (bg.match(/rgb/g) || []).length >= 2, hoehe: getComputedStyle(btn, '::after').height, gruppe: gbg };
  });
  ok('8 Fortschrittsstrich mit sichtbarer Spur, 3 px, Hinweis „13 von 65 erledigt“', f.spur && f.hoehe === '3px' && /13 von 65 erledigt/.test(f.title), JSON.stringify(f));
  ok('8 Gruppenzeilen ohne Fortschritt zeigen keine Spur', f.gruppe === 'none' || /rgba\(0, 0, 0, 0\) 0%\)$/.test(f.gruppe), f.gruppe);

  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
  const h = await m.evaluate(() => { setCardSize('sehrgross'); setAppView('vocab'); return { fs: parseFloat(getComputedStyle(document.getElementById('russian-word')).fontSize), ueber: document.documentElement.scrollWidth - innerWidth, cat: document.getElementById('card-cat').textContent }; });
  ok('Handy: Kartengröße unverändert, Kategorie sichtbar, kein Überlauf', h.fs <= 36 && h.ueber <= 0 && !!h.cat, JSON.stringify(h));
  await ctx.close();

  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
