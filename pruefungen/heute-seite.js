const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Startseite „Heute“: Vorschau Fällige, klickbare Karten, Weiterlernen-Zeile, Oft falsch, Wochenzahlen, GitHub-Hinweis, Handy kompakt
const { chromium } = require('playwright');
const SAAT = () => {
  const L = loadLifetime(), ws = allVocabWords(), now = Date.now(), D = 864e5;
  ws.slice(0, 40).forEach((w, i) => { L.v[getKey(w)] = { c: i % 7 === 0 ? 1 : (i % 5 === 0 ? 0 : 3), w: i % 7 === 0 ? 4 : (i % 5 === 0 ? 2 : 0), mb: 2, l: now - 20 * D, z: now - D, d: 1 + (i % 3), dd: now - (i % 4) * D }; });
  ws.slice(40, 60).forEach(w => { L.v[getKey(w)] = { c: 9, w: 0, mb: 5, l: now - 60 * D, z: now - D, d: 5, dd: now - D }; });
  saveLifetime();
  const log = {}; for (let i = 1; i < 6; i++) log[dayKey(daysAgo(i))] = [10 + i * 7, 8 + i * 5]; log[dayKey()] = [12, 9];
  localStorage.setItem('vokabeltrainer-daylog', JSON.stringify(log)); daylogMem = null;
};
(async () => {
  const b = await chromium.launch();
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message.slice(0, 120)]); } };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/^https?:/, r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ev = f => p.evaluate(f);
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  await ev(() => setAppView('home'));
  await check('Leer: kein falsches „erreichbar“, Hinweis statt Balken', () => ev(() => {
    const due = document.getElementById('home-due'), wk = document.getElementById('home-weeksum');
    return { ok: !/erreichbar/.test(due.textContent) && /Noch nichts in Wiederholung/.test(due.textContent) && due.getAttribute('role') !== 'button' && /noch nichts geübt/.test(wk.textContent) && !document.querySelector('.home-week'), info: due.textContent.replace(/\s+/g, ' ').trim() };
  }));
  await check('Leer: keine Karte „Oft falsch“', () => ev(() => !document.getElementById('home-hard')));
  await ev(SAAT); await ev(() => setAppView('home'));
  await check('Fällig: Zahl und Vorschau der nächsten Tage', () => ev(() => {
    const s = homeStats(), t = document.getElementById('home-due').textContent, f = document.getElementById('home-forecast');
    return { ok: s.dueWords > 0 && t.includes(String(s.dueWords)) && !!f && /morgen \d+/.test(f.getAttribute('aria-label')) && s.forecast.reduce((a, d) => a + d.n, 0) > 0, info: (f && f.getAttribute('aria-label')) || '' };
  }));
  await check('Weiterlernen: Zeile sagt, was kommt', () => ev(() => { const e = document.getElementById('home-plan'); return { ok: !!e && /^Vokabeln · .+: \d+ fällig/.test(e.textContent), info: e && e.textContent }; }));
  await check('Woche: Summe, Schnitt, Quote und heutiger Tag hervorgehoben', () => ev(() => {
    const e = document.getElementById('home-weeksum'); const bars = document.querySelectorAll('.home-week div');
    return { ok: /^167 Antworten · Ø 28 je Übungstag \(6 von 7\) · 74 % richtig$/.test(e.textContent.trim()) && bars[6].classList.contains('heute') && !bars[5].classList.contains('heute'), info: e.textContent };
  }));
  await check('Stufen: Prozent je Stufe', () => ev(() => { const p = [...document.querySelectorAll('#home-stufen .home-lvr:not(.home-lvr-sum) .home-p')].map(x => x.textContent); // seit 15.11. Fortschritt: Wiederholung k zählt k/5
    const soll = [...document.querySelectorAll('#home-stufen .home-lvr:not(.home-lvr-sum)')].map(r => { const st = r.dataset.stufen.split(',').map(Number), tot = +r.dataset.total; return homeProz(st.reduce((a, n, i) => a + n * (i + 1), 0) / (5 * tot), 1); });
    return { ok: p.length === 5 && p.every(x => /^(<1|\d+) %$/.test(x)) && p.join() === soll.join() && p[0] !== '0 %', info: p.join(' ') }; }));
  await check('Klick auf Fällig übt genau die fälligen Wörter', () => ev(() => {
    // auch mit Stufengrenze A1: fällig ist fällig, egal welche Stufe
    // ein fälliges Wort über A1 dazunehmen (die Saat nimmt die ersten Wörter – seit der Sortierung nach Stufe alle A1)
    { const L = loadLifetime(), w = allVocabWords().find(x => wordLevel(x) === 'B2'), t = Date.now(); L.v[getKey(w)] = { c: 1, w: 0, mb: 1, l: t, d: 1, dd: t - 3 * 864e5 }; saveLifetime(); }
    const n = homeStats().dueWords; maxLevel = 'A1'; document.getElementById('home-due').click();
    const pool = getPool(), hoeher = pool.filter(w => wordLevel(w) !== 'A1').length; maxLevel = '';
    return { ok: appView === 'vocab' && activeMain === 'due' && pool.length === n && hoeher > 0 && pool.includes(currentWord), info: activeMain + ' ' + pool.length + '/' + n + ' · über A1: ' + hoeher };
  }));
  await check('Fällige Runde wird nach Neuladen nicht wiederhergestellt', async () => { await p.reload(); await p.waitForTimeout(300); return ev(() => ({ ok: activeMain !== 'due', info: activeMain })); });
  await ev(() => setAppView('home'));
  await check('Oft falsch: 5 Wörter, häufigste zuerst', () => ev(() => {
    const h = homeStats().hard; const rows = document.querySelectorAll('#home-hard .home-hard > div');
    return { ok: rows.length === 5 && h.length === 5 && h.every((x, i) => !i || h[i - 1].falsch >= x.falsch) && rows[0].textContent.includes(h[0].w.ru), info: h.map(x => x.w.ru + ' ' + x.falsch).join(', ') };
  }));
  await check('Oft falsch: Knopf übt alle ab der gewählten Fehlerzahl', () => ev(() => {
    const h = homeHardList(homeStats().hardAll).map(x => x.w.ru); document.querySelector('#home-hard .home-btn').click();
    const pool = getPool().map(w => w.ru);
    return { ok: activeMain === 'hard' && pool.length === h.length && h.every(r => pool.includes(r)), info: pool.join(', ') };
  }));
  await ev(() => setAppView('home'));
  await check('Klick auf Heute öffnet das Tagesziel', () => ev(() => {
    document.getElementById('home-today').click();
    const o = document.getElementById('overlay-settings').classList.contains('open');
    const ok = o && settingsUi.tab === 'ueben' && document.activeElement && document.activeElement.id === 'daygoal-select';
    closeOverlay('overlay-settings'); return { ok, info: settingsUi.tab + ' ' + (document.activeElement && document.activeElement.id) };
  }));
  await check('Stufenzeile öffnet die Stufenübersicht (auch per Tastatur)', async () => {
    await ev(() => document.querySelector('.home-lvr').click());
    const a = await ev(() => document.getElementById('overlay-levels').classList.contains('open'));
    await ev(() => closeOverlay('overlay-levels'));
    await p.focus('.home-lvr'); await p.keyboard.press('Enter');
    const k = await ev(() => document.getElementById('overlay-levels').classList.contains('open'));
    await ev(() => closeOverlay('overlay-levels'));
    return { ok: a && k, info: 'Klick ' + a + ' · Enter ' + k };
  });
  await check('GitHub-Hinweis nur, wenn verbunden und nicht gespeichert', () => ev(() => {
    const vorher = document.getElementById('home-sync').hidden;
    localStorage.setItem('vokabeltrainer-gh-token', 'ghp_TEST'); localStorage.setItem('vokabeltrainer-gh-settings', JSON.stringify({ repo: 'a/b', device: 't', hash: 'alt' }));
    setAppView('home'); const e = document.getElementById('home-sync');
    const nachher = !e.hidden && !!e.querySelector('button[onclick="ghSync()"]');
    localStorage.removeItem('vokabeltrainer-gh-token'); localStorage.removeItem('vokabeltrainer-gh-settings'); ghUpdateIndicator();
    return { ok: vorher && nachher && document.getElementById('home-sync').hidden, info: 'vorher versteckt ' + vorher + ' · verbunden sichtbar ' + nachher };
  }));
  await check('Keine JS-Fehler (PC)', () => ({ ok: !errs.length, info: errs.slice(0, 2).join(' | ') }));
  // Handy
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await m.route(/^https?:/, r => r.abort());
  const q = await m.newPage(); const merr = []; q.on('pageerror', e => merr.push(e.message));
  await q.goto('file://' + APP_PATH); await q.waitForTimeout(300); await q.evaluate(SAAT); await q.evaluate(() => setAppView('home')); await q.waitForTimeout(200);
  await check('Handy: Fällig und Heute untereinander in voller Breite, kein Überlauf', () => q.evaluate(() => {
    const a = document.getElementById('home-due').getBoundingClientRect(), c = document.getElementById('home-today').getBoundingClientRect();
    const over = document.documentElement.scrollWidth > innerWidth;
    return { ok: c.top >= a.bottom && Math.abs(a.width - c.width) < 2 && !over && a.width > 300, info: Math.round(a.width) + '+' + Math.round(c.width) + ' · Überlauf ' + over };
  }));
  await check('Handy: Woche ohne Scrollen sichtbar', () => q.evaluate(() => { const w = document.querySelector('.home-week').getBoundingClientRect(); return { ok: w.bottom < innerHeight - 62, info: Math.round(w.bottom) + ' < ' + (innerHeight - 62) }; }));
  await check('Keine JS-Fehler (Handy)', () => ({ ok: !merr.length, info: merr.slice(0, 2).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
