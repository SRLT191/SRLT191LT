const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
// Lernlogik ohne Zeitabstände: einmal richtig = erledigt bis zum Zurücksetzen.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // Altbestand mit Fälligkeiten in der Zukunft/Vergangenheit, alter Gesamtstand ohne ver
  // Ausgangsdaten setzen, dann neu laden (ohne Init-Skript, damit Neuladen im Test nichts überschreibt)
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.clear();
    const now = Date.now();
    localStorage.setItem('vokabeltrainer-scores', JSON.stringify({ 'мама': { correct: 2, wrong: 0, box: 2, due: now + 9e6, lastSeen: now }, 'папа': { correct: 0, wrong: 3, box: 0, due: now + 9e6, lastSeen: now } }));
    localStorage.setItem('vokabeltrainer-lifetime', JSON.stringify({ v: { 'мама': { c: 2, w: 0, mb: 2, l: 0 } }, g: {} }));
    localStorage.setItem('vokabeltrainer-strict-mode', '0');
  });
  await p.reload(); await p.waitForTimeout(400);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = f => p.evaluate(f);
  await check('Altbestand: richtig beantwortetes Wort ist erledigt, falsches offen', () => ev(() => ({ ok: srsDone(scores['мама']) && !srsDone(scores['папа']), info: 'мама erledigt, папа offen' })));
  await check('Altbestand: Gesamtstand nachgetragen (gelernt seit)', () => ev(() => ({ ok: !!loadLifetime().v['мама'].l && loadLifetime().ver >= 2, info: String(loadLifetime().v['мама'].l) })));
  await check('Einstellung „Strikte Reihenfolge“ entfernt, alte Einstellung wirkungslos', () => ev(() => !document.getElementById('strict-toggle') && typeof strictSubcategoryMode === 'undefined'));
  // kleine Kategorie durchspielen
  await check('Kategorie durchspielen: jedes Wort genau einmal, dann „Alles gelernt!“', () => ev(async () => {
    resetProgress();
    selectedCats = new Set(['Familie']); selectMainCat('multi');
    const n = getPool().length, seen = new Set(); let schritte = 0, doppelt = 0;
    while (currentWord && schritte < n + 5 && getComputedStyle(document.getElementById('caught-up-panel')).display === 'none') {
      if (seen.has(currentWord.ru)) doppelt++; seen.add(currentWord.ru);
      updateScore(currentWord, true); nextWord(); schritte++;
    }
    const fertig = getComputedStyle(document.getElementById('caught-up-panel')).display === 'flex' && document.getElementById('caught-up-title').textContent === 'Alles gelernt!';
    return { ok: fertig && doppelt === 0 && seen.size === n, info: activeMain + ': ' + n + ' Wörter, ' + schritte + ' Schritte, doppelt ' + doppelt };
  }));
  await check('Zeit spielt keine Rolle: auch 1 Woche später „Alles gelernt!“', () => ev(() => { const dn = Date.now; Date.now = () => dn() + 7 * 864e5; nextWord(); const ok = getComputedStyle(document.getElementById('caught-up-panel')).display === 'flex'; Date.now = dn; return ok; }));
  await check('Balken 100 %, 0 offen', () => ev(() => ({ ok: document.getElementById('progress-bar').style.width === '100%' && document.getElementById('info-open').textContent === '0', info: document.getElementById('progress-bar').style.width })));
  await check('Falsch beantwortet bleibt offen und kommt wieder', () => ev(() => {
    resetProgress(); const pool = getPool(); pool.slice(1).forEach(w => updateScore(w, true)); updateScore(pool[0], false); nextWord();
    const a = currentWord && currentWord.ru === pool[0].ru; updateScore(pool[0], false); nextWord(); const b2 = currentWord && currentWord.ru === pool[0].ru;
    return { ok: a && b2, info: pool[0].ru };
  }));
  await check('Echte Antwort über das Eingabefeld macht das Wort erledigt', () => ev(async () => {
    resetProgress(); setMode('free'); setDirection('ru-de'); const w = currentWord;
    document.getElementById('answer-input').value = stripClarification(w.de[0]); await checkAnswer();
    return { ok: srsDone(scores[getKey(w)]) && !scores[getKey(w)].due, info: w.ru };
  }));
  await check('Vokabelliste: keine Spalte „Fällig“, Stand erledigt/offen', () => ev(() => { openVocabList(); document.getElementById('vocab-search').value = currentWord.ru; renderVocabTable(); const th = [...document.querySelectorAll('#overlay-vocab th')].map(x => x.textContent).join('|'); const t = document.getElementById('vocab-table-body').textContent; const opt = !!document.querySelector('#vocab-sort option[value="due-asc"]'); document.getElementById('vocab-search').value = ''; closeOverlay('overlay-vocab'); return { ok: !/Fällig/.test(th) && /erledigt/.test(t) && !opt, info: th }; }));
  await check('Wortdetails: erledigt/offen statt Box und Fälligkeit', () => ev(() => { openWordDetail(currentWord); const t1 = document.getElementById('wd-srs').textContent; closeOverlay('overlay-worddetail'); const w = getPool().find(x => srsDone(scores[getKey(x)])); openWordDetail(w); const t2 = document.getElementById('wd-srs').textContent; closeOverlay('overlay-worddetail'); return { ok: !/Box|fällig/.test(t1 + t2) && /erledigt/.test(t2), info: t1 + ' | ' + t2 }; }));
  // Grammatik
  await check('Grammatik: richtige Aufgabe kommt nicht wieder, solange offene da sind', () => ev(() => { resetProgress(); const ids = ['a', 'b', 'c', 'd']; let hits = 0; progressMark('t', 'a', true); progressMark('t', 'b', false); progressMark('t', 'c', true); progressMark('t', 'd', true); for (let i = 0; i < 50; i++) if (progressNext('t', ids, null) !== 'b') hits++; return { ok: hits === 0, info: hits + ' Fehlgriffe' }; }));
  await check('Grammatik: ungesehene vor offenen, ohne Zeit', () => ev(() => { const dn = Date.now; Date.now = () => dn() + 864e5; let ok = true; for (let i = 0; i < 30; i++) if (progressNext('t', ['a', 'b', 'e'], null) !== 'e') ok = false; Date.now = dn; return ok; }));
  await check('Grammatik: „Weiter“ ohne Prüfen lässt offen', () => ev(() => { progressSeen('t', 'e'); return !srsDone(grammarSrs.t.e); }));
  await check('Grammatik-Kopfzeile zählt einmal richtig als gelernt', () => ev(() => { resetProgress(); progressMark('gender', 'мебель', true); updateGrammarTileProgress(); return { ok: /^1 von/.test(document.getElementById('gtp-gender').textContent), info: document.getElementById('gtp-gender').textContent + ' | ' + document.getElementById('gtp-gender').title }; }));
  await check('Grammatik-Runde (Geschlecht) läuft, auch wenn alles erledigt wäre', () => ev(() => { openGender(); return genderState.queue.length > 0 && genderState.queue.every(Boolean); }));
  await check('Stufen: einmal richtig zählt als gelernt', () => ev(() => { resetProgress(); const w = allVocabWords().find(x => wordLevel(x) === 'A1'); updateScore(w, true); return { ok: levelStats().A1.learned === 1, info: 'A1 gelernt=' + levelStats().A1.learned }; }));
  await check('Kein gespeichertes „due“ mehr', () => ev(() => flushSaves() || !/"due"/.test(localStorage.getItem('vokabeltrainer-scores')) && !/"due"/.test(localStorage.getItem('vokabeltrainer-grammar-srs') || '')));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
