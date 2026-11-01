const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
// Zusammengelegte Karten (паллета / поддон …)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.clear();
    localStorage.setItem('vokabeltrainer-scores', JSON.stringify({ 'паллета': { correct: 1, wrong: 0, box: 1, lastSeen: 5 }, 'поддон': { correct: 0, wrong: 2, box: 0, lastSeen: 9 }, 'лист': { correct: 1, wrong: 0, box: 1, lastSeen: 1 } }));
    localStorage.setItem('vokabeltrainer-scores-de-ru', JSON.stringify({ 'фанат': { correct: 2, wrong: 0, box: 2, lastSeen: 3 } }));
    localStorage.setItem('vokabeltrainer-lifetime', JSON.stringify({ ver: 3, run: 2, v: { 'отель': { c: 3, w: 1, mb: 2, l: 5000, d: 2, dd: 6000, lr: 2 }, 'гостиница': { c: 1, w: 0, mb: 1, l: 2000, d: 1, dd: 2000, lr: 1 } }, g: { 'hearquiz:type': { 'надо': { c: 1, w: 0, mb: 1, l: 1, d: 1, dd: 1, lr: 2 } } } }));
    localStorage.setItem('vokabeltrainer-grammar-srs', JSON.stringify({ 'hearquiz:type': { 'нужно': { correct: 1, wrong: 0, box: 1, lastSeen: 1 } }, gender: { 'поддон': { correct: 1, wrong: 0, box: 1, lastSeen: 1 } } }));
    localStorage.setItem('vokabeltrainer-bookmarks', JSON.stringify(['стать', 'становиться', 'кот']));
    localStorage.setItem('vokabeltrainer-scores-split', '1');
  });
  await p.reload(); await p.waitForTimeout(400);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = f => p.evaluate(f);
  const get = k => p.evaluate(k2 => JSON.parse(localStorage.getItem(k2)), k);
  await check('44 Karten (17 + 27 Aspektpaare), keine Einzelkarte mehr', () => ev(() => { const all = allVocabWords().map(w => w.ru); const alt = Object.values(MERGED_CARDS).flat().filter(x => all.includes(x)); return { ok: Object.keys(MERGED_CARDS).length === 44 && Object.keys(MERGED_CARDS).every(k => all.includes(k)) && !alt.length, info: all.length + ' Karten, übrig: ' + alt.join(',') }; }));
  await check('Übungsstand übernommen (addiert)', async () => { const s = await get('vokabeltrainer-scores'); const m = s['паллета / поддон']; return { ok: m && m.correct === 1 && m.wrong === 2 && !s['паллета'] && !s['поддон'] && !!s['лист / листья'], info: JSON.stringify(m) }; });
  await check('Andere Richtung übernommen', async () => { const s = await get('vokabeltrainer-scores-de-ru'); return !!s['болельщик / фанат'] && !s['фанат']; });
  await check('Gesamtstand übernommen, „gelernt seit“ das Frühere', () => ev(() => { const e = loadLifetime().v['отель / гостиница']; return { ok: e && e.c === 4 && e.w === 1 && e.l === 2000 && e.d === 2 && !loadLifetime().v['отель'], info: JSON.stringify(e) }; }));
  await check('Hörquiz-Stand übernommen, Geschlecht-Stand bleibt beim Einzelwort', async () => { const g = await get('vokabeltrainer-grammar-srs'); const L = await ev(() => loadLifetime().g['hearquiz:type']); return { ok: !!g['hearquiz:type']['надо / нужно'] && !g['hearquiz:type']['нужно'] && !!g.gender['поддон'] && !!L['надо / нужно'], info: Object.keys(g['hearquiz:type']).join(',') }; });
  await check('Merkliste übernommen, ohne Doppel', async () => { const bm = await get('vokabeltrainer-bookmarks'); return { ok: bm.length === 2 && bm.includes('становиться / стать') && bm.includes('кот'), info: bm.join(',') }; });
  await check('Zweites Laden ändert nichts mehr', async () => { const a = await get('vokabeltrainer-scores'); await p.reload(); await p.waitForTimeout(300); const b2 = await get('vokabeltrainer-scores'); return JSON.stringify(a) === JSON.stringify(b2); });
  await check('DE→RU: jedes Wort allein und beide zusammen richtig', () => ev(async () => {
    setDirection('de-ru'); setMode('free'); const w = allVocabWords().find(x => x.ru === 'паллета / поддон'); const out = [];
    for (const inp of ['паллета', 'поддон', 'паллета / поддон', 'паллета/поддон', 'склад']) { nextWord(w); document.getElementById('answer-input').value = inp; await checkAnswer(); out.push(inp + ':' + (scores[getKey(w)].correct > (window.__c || 0))); window.__c = scores[getKey(w)].correct; }
    setDirection('ru-de'); return { ok: out.slice(0, 4).every(x => x.endsWith('true')) && out[4].endsWith('false'), info: out.join(' ') }; }));
  await check('RU→DE nimmt jede Übersetzung', () => ev(async () => { const w = allVocabWords().find(x => x.ru === 'торнадо / смерч'); nextWord(w); document.getElementById('answer-input').value = 'Windhose'; const c0 = (scores[getKey(w)] || {}).correct || 0; await checkAnswer(); return scores[getKey(w)].correct === c0 + 1; }));
  await check('Auswahl zeigt keine doppelten Klammern', () => ev(() => ruMcDisplay(allVocabWords().find(x => x.ru === 'паллета / поддон')) === 'паллета / поддон'));
  await check('Stufe = leichtere der beiden', () => ev(() => { const r = Object.keys(MERGED_CARDS).map(k => k + ':' + wordLevel({ ru: k })); return { ok: Object.keys(MERGED_CARDS).every(k => wordLevel({ ru: k })), info: r.join(' ') }; }));
  await check('Geschlecht: beide Wörter einzeln', () => ev(() => { const ids = new Set(genderPool().map(x => x.id)); const want = ['паллета', 'поддон', 'смерч', 'святыня', 'святилище', 'отель', 'гостиница', 'лист', 'земляк', 'тропинка']; const miss = want.filter(x => !ids.has(x)); return { ok: !miss.length && !ids.has('листья') && !ids.has('торнадо'), info: 'fehlt: ' + miss.join(',') }; }));
  await check('Beispielsatz und Wortdetails', () => ev(() => { const w = allVocabWords().find(x => x.ru === 'отель / гостиница'); openWordDetail(w); const t = document.getElementById('overlay-worddetail').textContent; closeOverlay('overlay-worddetail'); return { ok: /отель \/ гостиница/.test(t), info: document.getElementById('wd-sentence-ru').textContent }; }));
  await check('Konjugation kennt становиться und стать', () => ev(() => { const v = getAllVocabVerbs(); return v.includes('стать') && v.includes('становиться'); }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
