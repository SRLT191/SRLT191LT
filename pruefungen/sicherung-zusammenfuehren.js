const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
// Sicherung einlesen = zusammenführen statt ersetzen
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.clear();
    localStorage.setItem('vokabeltrainer-scores', JSON.stringify({ 'мама': { correct: 1, wrong: 0, box: 1, lastSeen: 5 }, 'дом': { correct: 0, wrong: 2, box: 0, lastSeen: 5 } }));
    localStorage.setItem('vokabeltrainer-grammar-srs', JSON.stringify({ gender: { 'дом': { correct: 1, wrong: 0, box: 1, lastSeen: 5 } } }));
    localStorage.setItem('vokabeltrainer-lifetime', JSON.stringify({ ver: 3, run: 4, v: { 'мама': { c: 3, w: 1, mb: 2, l: 2000, d: 2, dd: 9000, lr: 4 } }, g: { gender: { 'дом': { c: 1, w: 0, mb: 1, l: 5000, d: 1, dd: 5000, lr: 4 } } } }));
    localStorage.setItem('vokabeltrainer-bookmarks', JSON.stringify(['мама']));
    localStorage.setItem('vokabeltrainer-theme', 'dark');
    localStorage.setItem('vokabeltrainer-scores-split', '1');
  });
  await p.reload(); await p.waitForTimeout(400);
  const backup = { app: await p.evaluate(() => APP_ID), version: 1, saved: '2026-10-01T10:00:00Z', data: {
    'vokabeltrainer-scores': JSON.stringify({ 'дом': { correct: 1, wrong: 1, box: 1, lastSeen: 9, due: 123 }, 'папа': { correct: 2, wrong: 0, box: 2, lastSeen: 9 } }),
    'vokabeltrainer-scores-de-ru': JSON.stringify({ 'кот': { correct: 1, wrong: 0, box: 1, lastSeen: 9 } }),
    'vokabeltrainer-grammar-srs': JSON.stringify({ gender: { 'мама': { correct: 0, wrong: 1, box: 0, lastSeen: 9 } }, rektion: { x: { correct: 1, wrong: 0, box: 1, lastSeen: 9 } } }),
    'vokabeltrainer-lifetime': JSON.stringify({ ver: 3, run: 9, v: { 'мама': { c: 5, w: 0, mb: 4, l: 1000, d: 4, dd: 8000, lr: 9 }, 'папа': { c: 2, w: 0, mb: 2, l: 3000, d: 1, dd: 3000, lr: 9 } }, g: { gender: { 'дом': { c: 4, w: 2, mb: 3, l: 7000, d: 3, dd: 7000, lr: 9 } } } }),
    'vokabeltrainer-bookmarks': JSON.stringify(['папа']),
    'vokabeltrainer-theme': 'light',
    'vokabeltrainer-speak-rate': '0.75',
  } };
  const f = require('path').join(TMP, 'merge-backup.json'); fs.writeFileSync(f, JSON.stringify(backup));
  await (await p.$('#backup-file')).setInputFiles(f); await p.waitForTimeout(800);
  const R = []; const check = async (n, fn) => { try { const r = await fn(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = fn => p.evaluate(fn);
  const get = k => p.evaluate(k2 => JSON.parse(localStorage.getItem(k2)), k);
  const sc = await get('vokabeltrainer-scores'), dr = await get('vokabeltrainer-scores-de-ru'), gs = await get('vokabeltrainer-grammar-srs'), lt = await get('vokabeltrainer-lifetime'), bm = await get('vokabeltrainer-bookmarks');
  await check('Vokabeln RU→DE: lokale bleiben, neue kommen dazu', () => ({ ok: !!sc['мама'] && !!sc['папа'] && sc['дом'].correct === 1 && sc['дом'].wrong === 2 && !('due' in sc['дом']), info: JSON.stringify(sc['дом']) }));
  await check('Vokabeln DE→RU übernommen', () => !!dr && !!dr['кот']);
  await check('Grammatik je Werkzeug zusammengeführt', () => ({ ok: gs.gender['дом'].correct === 1 && !!gs.gender['мама'] && !!gs.rektion.x, info: Object.keys(gs).join(',') }));
  await check('Gesamtstand: Höchstwerte, frühestes „gelernt seit“', () => { const m = lt.v['мама']; return { ok: m.c === 5 && m.w === 1 && m.d === 4 && m.l === 1000 && m.dd === 9000 && m.lr === 4, info: JSON.stringify(m) }; });
  await check('Gesamtstand: neues Wort aus der Sicherung übernommen', () => ({ ok: lt.v['папа'].d === 1 && lt.v['папа'].l === 3000 && lt.run === 4, info: JSON.stringify(lt.v['папа']) + ' run=' + lt.run }));
  await check('Gesamtstand Grammatik zusammengeführt', () => ({ ok: lt.g.gender['дом'].c === 4 && lt.g.gender['дом'].l === 5000, info: JSON.stringify(lt.g.gender['дом']) }));
  await check('Merkliste vereinigt', () => ({ ok: bm.includes('мама') && bm.includes('папа'), info: bm.join(',') }));
  await check('Einstellung bleibt lokal, fehlende ergänzt', () => ev(() => ({ ok: localStorage.getItem('vokabeltrainer-theme') === 'dark' && localStorage.getItem('vokabeltrainer-speak-rate') === '0.75', info: localStorage.getItem('vokabeltrainer-theme') })));
  await check('App läuft mit zusammengeführtem Stand', () => ev(() => ({ ok: !!scores['папа'] && !!currentWord, info: Object.keys(scores).length + ' Wörter' })));
  // zweimal einlesen ändert nichts mehr (kein Doppelzählen)
  await (await p.$('#backup-file')).setInputFiles(f); await p.waitForTimeout(800);
  const lt2 = await get('vokabeltrainer-lifetime');
  await check('Zweites Einlesen zählt nicht doppelt', () => ({ ok: JSON.stringify(lt2.v) === JSON.stringify(lt.v), info: lt2.v['мама'].c }));
  // alte Sicherung (vor der Richtungstrennung, mit due)
  const old = { app: backup.app, version: 1, saved: '2026-01-01', data: { 'vokabeltrainer-scores': JSON.stringify({ 'вода': { correct: 1, wrong: 0, box: 3, due: 1, lastSeen: 1 } }) } };
  fs.writeFileSync(f, JSON.stringify(old));
  await (await p.$('#backup-file')).setInputFiles(f); await p.waitForTimeout(800);
  await check('Alte Sicherung: Stand landet bei RU→DE', () => ev(() => { const a = JSON.parse(localStorage.getItem('vokabeltrainer-scores')); return { ok: !!a['вода'] && !!a['мама'], info: Object.keys(a).join(',') }; }));
  // Wortlisten der Muster und Wortgruppen überstehen das Zusammenführen (13.11.)
  await check('„Muster sicher“ und Wortgruppen-Wörter bleiben beim Abgleich erhalten', () => ev(() => {
    const hart = Object.keys(declensionData).filter(a => declensionData[a].typeLabel === 'hart'), mid = 'ca|hart|fem|Gen.';
    for (let i = 0; i < 10; i++) progressMark('caseadj', 'a:' + hart[i] + ':fem:Gen.', true);
    const g = loadGrammarSrs(); (g.wordgroup = g.wordgroup || {})['x:y'] = { correct: 3, wrong: 0, box: 3, lastSeen: Date.now(), w: ['a', 'b', 'c'] }; saveGrammarSrs(); flushSaves();
    const vor = musterSicher(mid), data = {}; BACKUP_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) data[k] = v; });
    mergeAllFromBackup(data);                                                    // erster Abgleich bringt die Einträge in die Normalform
    const data2 = {}; BACKUP_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) data2[k] = v; });
    const geaendert = mergeAllFromBackup(data2);                                 // gleicher Stand: nichts ändert sich
    const fremd = JSON.parse(data['vokabeltrainer-grammar-srs']); fremd.muster[mid].w = ['zzz']; fremd.wordgroup['x:y'].w = ['c', 'd'];
    mergeAllFromBackup(Object.assign({}, data, { 'vokabeltrainer-grammar-srs': JSON.stringify(fremd) }));   // anderes Gerät mit weniger Wörtern
    const n = loadGrammarSrs();
    return { ok: vor && !geaendert && musterSicher(mid) && n.muster[mid].w.length === 10 && n.wordgroup['x:y'].w.join() === 'a,b,c,d', info: JSON.stringify([vor, geaendert, n.muster[mid].w.length, n.wordgroup['x:y'].w]) };
  }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
