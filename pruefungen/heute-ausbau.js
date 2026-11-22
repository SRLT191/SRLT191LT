const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Startseite-Ausbau (15.11.): Fortschritt je Stufe, Grammatik je Werkzeug, Wiederholen zuerst, Top 5 / Grammatikfehler üben,
// Bereiche und Lernzeit, Zuletzt geübt mit Uhrzeit und Menge, kleiner GitHub-Hinweis, Woche: Lernzeit und Tag antippen
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = f => p.evaluate(f);
  await ev(() => {
    const L = loadLifetime(), now = Date.now();
    allVocabWords().slice(0, 400).forEach((w, i) => { const d = 1 + (i % 4); L.v[w.ru] = { c: d, w: 3, f: i < 8 ? 6 : 2, mb: d, l: now - 9e8, d, dd: now - 9e8, lr: 1, z: now - 9e8 }; });
    L.g.gender = { 'дом': { c: 1, w: 4, f: 4, mb: 1, l: now, d: 1, dd: now, lr: 1, z: now } };
    saveLifetime();
    setAppView('listening'); showListeningPanel('hearquiz'); for (let i = 0; i < 3; i++) dayNote(i < 2);
    setAppView('vocab'); for (let i = 0; i < 5; i++) dayNote(true);
    setAppView('home');
  });
  await check('Prozent = Fortschritt über die Wiederholungsstufen (nicht mehr nur „geübt“)', () => ev(() => {
    const r = document.querySelector('#home-stufen .home-lvr'); const st = r.dataset.stufen.split(',').map(Number), tot = +r.dataset.total;
    const soll = homeProz(st.reduce((a, n, i) => a + n * (i + 1), 0) / (5 * tot), 1), geuebt = homeProz(st.reduce((a, n) => a + n, 0), tot);
    return { ok: r.querySelector('.home-p').textContent === soll && soll !== geuebt && /Fortschritt/.test(r.querySelector('.home-p').title), info: soll + ' statt ' + geuebt };
  }));
  await check('Grammatik: Bereich aufklappen zeigt die Werkzeuge einzeln, Klick öffnet das Werkzeug', () => ev(() => {
    const row = [...document.querySelectorAll('#home-gstufen .home-lvr.home-lvr-auf')].find(x => x.querySelector('b').textContent === 'Substantive');
    row.click(); const det = document.getElementById(row.getAttribute('aria-controls'));
    const tools = [...det.querySelectorAll('.home-lv-tools .home-lvr')];
    const namen = tools.map(t => t.querySelector('b').textContent);
    const ok1 = !det.hidden && tools.length === GRAMMAR_CATS.noun.length && namen.some(n => /Geschlecht/.test(n));
    tools.find(t => /Geschlecht/.test(t.querySelector('b').textContent)).click();
    const ok2 = appView === 'grammar' && document.getElementById('overlay-gender').classList.contains('open');
    setAppView('home'); return { ok: ok1 && ok2, info: namen.join(', ') };
  }));
  await check('Fällige Wörter: Hauptknopf „Wiederholen“, daneben „Weiterlernen“', () => ev(() => {
    const due = document.getElementById('home-go-due'), go = document.querySelector('.home-go');
    const ok = due && /Wiederholen/.test(due.textContent) && /fällig| von /.test(due.textContent) && /Weiterlernen/.test(go.textContent) && go.classList.contains('home-go-2');
    due.click(); const ok2 = appView === 'vocab' && activeMain === 'due'; setAppView('home');
    return { ok: ok && ok2, info: due && due.textContent.trim() };
  }));
  await check('Oft falsch: „Top 5 üben“ nimmt die fünf mit den meisten Fehlern, „Grammatikfehler üben“ öffnet das Werkzeug', () => ev(() => {
    document.getElementById('home-hard-top5').click(); const n = homePool.length, top = homePool.map(w => lifeFehler(lifeVocabEntry(w)));
    setAppView('home'); document.getElementById('home-hard-g-btn').click(); const g = appView === 'grammar' && document.getElementById('overlay-gender').classList.contains('open');
    setAppView('home'); return { ok: n === 5 && top.every(f => f === 6) && g, info: n + ' · ' + top.join(',') };
  }));
  await check('Heute: Antworten je Bereich und Lernzeit', () => ev(() => {
    const t = document.getElementById('home-bereiche').textContent;
    return { ok: /Vokabeln 5\/5/.test(t) && /Hören 2\/3/.test(t) && /min/.test(t), info: t };
  }));
  await check('Zuletzt geübt: Uhrzeit und Menge', () => ev(() => {
    const b = [...document.querySelectorAll('.home-res button')].find(x => /Hören/.test(x.textContent));
    return { ok: !!b && /^\d\d:\d\d$/.test(b.querySelector('small').textContent) && /3 Antworten · 2 richtig/.test(b.textContent), info: b && b.textContent.replace(/\s+/g, ' ') };
  }));
  await check('Diese Woche: Lernzeit, Tag antippen zeigt Bereiche des Tags', () => ev(() => {
    const zeit = document.getElementById('home-weektime');
    homeWeekTag(dayKey()); const t = document.getElementById('home-weektag');
    return { ok: !!zeit && /Lernzeit/.test(zeit.textContent) && !t.hidden && /8 Antworten/.test(t.textContent) && /Vokabeln 5/.test(t.textContent) && /Hören 3/.test(t.textContent), info: t.textContent };
  }));
  await check('GitHub-Hinweis schmal (höchstens 40 px)', () => ev(() => {
    const e = document.getElementById('home-sync'); e.hidden = false; const h = e.getBoundingClientRect().height; e.hidden = true;
    return { ok: h > 0 && h <= 40, info: Math.round(h) + ' px' };
  }));
  await check('Tagesstatistik übersteht kaputte Daten', () => ev(() => {
    localStorage.setItem(DAYSTATS_KEY, JSON.stringify({ last: 'x', '2026-01-01': { ms: '<b>', vocab: ['a', 9], grammar: 'x' }, '<img>': 1 }));
    const d = loadDaystats(); dayNote(true); renderHome();
    return { ok: !d['<img>'] && d['2026-01-01'].ms === 0 && !d['2026-01-01'].vocab, info: JSON.stringify(d) };
  }));
  await check('Tagesstatistik in der Sicherung, Zusammenführen nimmt je Tag und Bereich das Höhere', () => ev(() => {
    const a = JSON.stringify({ '2026-01-01': { ms: 100, vocab: [5, 4] } }), b2 = JSON.stringify({ '2026-01-01': { ms: 300, vocab: [3, 3], reading: [2, 1] }, '2026-01-02': { ms: 50, grammar: [1, 1] } });
    const m = JSON.parse(mergeBackupValue(DAYSTATS_KEY, a, b2));
    return { ok: BACKUP_KEYS.includes(DAYSTATS_KEY) && BACKUP_KEYS.includes('vokabeltrainer-dictation-opts') && BACKUP_KEYS.includes('vokabeltrainer-hoertrainer-opts')
      && m['2026-01-01'].ms === 300 && m['2026-01-01'].vocab.join() === '5,4' && m['2026-01-01'].reading.join() === '2,1' && m['2026-01-02'].grammar.join() === '1,1', info: JSON.stringify(m) };
  }));
  await check('320 px: kein Überlauf mit fälligen Wörtern', async () => {
    await p.setViewportSize({ width: 320, height: 800 }); await p.waitForTimeout(150);
    return ev(() => { renderHome(); return { ok: document.documentElement.scrollWidth <= 320, info: document.documentElement.scrollWidth + '' }; });
  });
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
  process.exit(R.every(r => r[0] === 'OK ') ? 0 : 1);
})();
