const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
const TMP = require('os').tmpdir();
// Prüft alle Zurücksetzen-Funktionen: Ein-Klick-Zurücksetzen (Werkzeugleiste, „Alles gelernt“)
// und „Gesamtstand löschen“ (Einstellungen).
const { chromium } = require('playwright');
// Die App startet auf „Heute“ – nach jedem Laden geht es hier in die Vokabeln.
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let dialogs = 0; p.on('dialog', d => { dialogs++; d.accept(); });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400); await p.evaluate(() => setAppView('vocab'));
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = f => p.evaluate(f);
  // Lernstand aufbauen: 3 Wörter gelernt (Kasten 5), 1 Wort angefangen, Grammatik in 3 Bereichen
  const setup = () => ev(() => {
    const pool = getPool(); window.__w = pool.slice(0, 4).map(getKey);
    pool.slice(0, 3).forEach(w => { for (let i = 0; i < 6; i++) updateScore(w, true); });
    updateScore(pool[3], true);
    ['дом', 'мама', 'книга'].forEach(id => { for (let i = 0; i < 6; i++) progressMark('gender', id, true); });
    // drei Wörter, die im Werkzeug Geschlecht zählen (Regelfälle wie дом zählen seit 12.11. nicht mehr)
    genderPool().filter(g => g.typ !== 'easy').slice(0, 3).forEach(g => { for (let i = 0; i < 6; i++) progressMark('gender', g.id, true); });
    progressMark('sb:dative', 'x1', true); progressMark('hearquiz:type', pool[0].ru, true);
    updateProgress(); updateGrammarTileProgress();
    return { box: scores[window.__w[0]].box, open: +document.getElementById('info-open').textContent };
  });
  const s0 = await setup();
  await check('Ausgangslage: Wort in Kasten 5', () => ({ ok: s0.box >= 5, info: JSON.stringify(s0) }));
  await check('Gesamtstand hat die gelernten Einträge', () => ev(() => { const L = loadLifetime(); const n = window.__w.slice(0, 3).filter(k => L.v[k] && L.v[k].l).length; return { ok: n === 3 && !!L.g.gender['дом'].l, info: n + ' Wörter, дом=' + !!L.g.gender['дом'].l }; }));

  // 1) Werkzeugleiste: ein Klick, keine Rückfrage, kein Fenster
  await ev(() => { window.__runde = JSON.stringify(sessionWrong); });
  const d0 = dialogs;
  await p.click('.tool-btn-reset');
  await p.waitForTimeout(200);
  await check('Werkzeugleiste: keine Rückfrage, kein Fenster', () => ev(() => ({ ok: !document.querySelector('.overlay.open'), info: 'offene Fenster=' + document.querySelectorAll('.overlay.open').length })).then(r => ({ ok: r.ok && dialogs === d0, info: r.info + ', Rückfragen=' + (dialogs - d0) })));
  await check('Vokabel-Übungsstand leer (auch gespeichert)', () => ev(() => { const st = JSON.parse(localStorage.getItem('vokabeltrainer-scores')); return { ok: Object.keys(scores).length === 0 && Object.keys(st).length === 0, info: Object.keys(scores).length + '/' + Object.keys(st).length }; }));
  await check('Grammatik-Übungsstand leer (Werkzeuge, Satzbau, Hörquiz)', () => ev(() => { const st = JSON.parse(localStorage.getItem('vokabeltrainer-grammar-srs') || '{}'); return { ok: Object.keys(grammarSrs).length === 0 && Object.keys(st).length === 0, info: Object.keys(st).join(',') || 'leer' }; }));
  await check('Alle Wörter wieder offen, Balken bei 0', () => ev(() => { const t = +document.getElementById('info-total').textContent, o = +document.getElementById('info-open').textContent; const bar = document.getElementById('progress-bar').style.width; return { ok: t === o && t > 0 && bar === '0%', info: o + ' von ' + t + ' offen, Balken ' + bar }; }));
  await check('Gelernte Wörter wieder Kasten 0 und nicht gesperrt', () => ev(() => { const w = getPool().find(x => getKey(x) === window.__w[0]); return { ok: !scores[window.__w[0]] && !hasCorrectAnswer(w), info: window.__w[0] }; }));
  await check('Gesamtstand bleibt (Vokabeln + Grammatik)', () => ev(() => { const L = JSON.parse(localStorage.getItem('vokabeltrainer-lifetime')); const n = window.__w.slice(0, 3).filter(k => L.v[k] && L.v[k].l).length; return { ok: n === 3 && !!L.g.gender['дом'].l && !!L.g['sb:dative'] && !!L.g['hearquiz:type'], info: n + ' Wörter, Grammatik ' + Object.keys(L.g).join(',') }; }));
  await check('Karte wird gezeigt', () => ev(() => ({ ok: !!currentWord && getComputedStyle(document.getElementById('word-card')).display !== 'none', info: currentWord && currentWord.ru })));
  await check('Runde bleibt stehen', () => ev(() => ({ ok: JSON.stringify(sessionWrong) === window.__runde, info: 'unverändert' }))).catch(() => {});
  await check('Grammatik-Kopfzeile: aktuell 0, Gesamtstand im Hinweis', () => ev(() => { updateGrammarTileProgress(); const e = document.getElementById('gtp-gender'); return { ok: /^0 /.test(e.textContent.trim()) && /Gesamtstand: 3 von /.test(e.title), info: e.textContent.trim() + ' | ' + e.title }; }));
  await check('Vokabelliste: ✓ bleibt, Kasten 0', () => ev(() => { openVocabList(); const n = document.querySelectorAll('#overlay-vocab .ever-ok').length; closeOverlay('overlay-vocab'); return { ok: n >= 3, info: n + ' ✓' }; }));
  await check('Stufen: aktuell 0, schon einmal gelernt > 0', () => ev(() => { openLevelOverview(); const t = document.getElementById('overlay-levels').textContent; closeOverlay('overlay-levels'); return { ok: /schon einmal/.test(t), info: t.replace(/\s+/g, ' ').slice(0, 140) }; }));
  await check('Wortdetails: Gesamt-Angabe bleibt', () => ev(() => { const w = getPool().find(x => getKey(x) === window.__w[0]); openWordDetail(w); const t = document.getElementById('overlay-worddetail').textContent; closeOverlay('overlay-worddetail'); return { ok: /Gesamt: \d+× richtig/.test(t) && /gelernt seit/.test(t), info: (t.match(/Gesamt:[^\n]{0,60}/) || [''])[0] }; }));
  await check('Zurücksetzen bei offener Vokabelliste aktualisiert sie', () => ev(() => { updateScore(getPool()[0], true); openVocabList(); resetProgress(); const ok = document.getElementById('overlay-vocab').classList.contains('open') && Object.keys(scores).length === 0; closeOverlay('overlay-vocab'); return ok; }));
  await check('Zurücksetzen in der Grammatik-Ansicht ohne Fehler', () => ev(() => { setAppView('grammar'); showGrammarPanel('gender'); progressMark('gender', 'дом', true); resetProgress(); const ok = Object.keys(grammarSrs).length === 0; setAppView('vocab'); return ok; }));

  // 2) „Alles für jetzt gelernt!“
  await check('„Alles gelernt“: Knopf sichtbar, ein Klick, Karten kommen wieder', () => ev(() => {
    getPool().forEach(w => { scores[getKey(w)] = { correct: 1, wrong: 0, box: 5, due: Date.now() + 864e5, lastSeen: Date.now() }; }); saveScores(); updateProgress();
    nextWord(); const panel = document.getElementById('caught-up-panel'); const vorher = getComputedStyle(panel).display === 'flex';
    const btn = document.getElementById('caught-up-reset'); const sicht = getComputedStyle(btn).display !== 'none';
    btn.click();
    const nachher = getComputedStyle(panel).display === 'none' && getComputedStyle(document.getElementById('word-card')).display !== 'none';
    return { ok: vorher && sicht && nachher && Object.keys(scores).length === 0, info: 'Meldung=' + vorher + ' Knopf=' + sicht + ' Karte danach=' + nachher };
  }));
  await check('„Alles gelernt“: auch Grammatik zurückgesetzt', () => ev(() => { progressMark('gender', 'дом', true); getPool().forEach(w => { scores[getKey(w)] = { correct: 1, wrong: 0, box: 5, due: Date.now() + 864e5, lastSeen: Date.now() }; }); nextWord(); document.getElementById('caught-up-reset').click(); return Object.keys(grammarSrs).length === 0; }));
  await check('„Alles gelernt“: nur Titel + Zurücksetzen (kein Countdown, kein Weiterüben)', () => ev(() => { getPool().forEach(w => { scores[getKey(w)] = { correct: 1, wrong: 0, box: 5, due: Date.now() + 864e5, lastSeen: Date.now() }; }); nextWord();
    const vis = id => getComputedStyle(document.getElementById(id)).display !== 'none';
    const r = { sub: vis('caught-up-sub'), weiter: vis('caught-up-btn'), reset: vis('caught-up-reset'), text: document.getElementById('caught-up-panel').innerText.replace(/\s+/g, ' ').trim() };
    resetProgress(); return { ok: !r.sub && !r.weiter && r.reset && !/Wiederholung|Trotzdem/.test(r.text), info: r.text }; }));
  await check('Leere Gruppenauswahl zeigt weiter Hinweis + „Gruppen wählen“', () => ev(() => { const m = activeMain; activeMain = Object.keys(vocab).find(c => vocab[c].blocks) || m; showEmptyPool(); const t = document.getElementById('caught-up-panel').innerText.replace(/\s+/g, ' '); activeMain = m; hideCaughtUp(); nextWord(); return { ok: /Gruppe/.test(t), info: t.trim() }; }));
  await check('Leere Merkliste: kein Zurücksetzen-Knopf', () => ev(() => { const m = activeMain; activeMain = 'bookmarks'; showEmptyPool(); const v = getComputedStyle(document.getElementById('caught-up-reset')).display; activeMain = m; hideCaughtUp(); nextWord(); return { ok: v === 'none', info: v }; }));
  await check('Kein Rückgängig-Hinweis mehr', () => ev(() => !document.getElementById('reset-toast') && typeof undoResetProgress === 'undefined'));

  // 3) Neuladen
  await p.reload(); await p.waitForTimeout(400); await p.evaluate(() => setAppView('vocab'));
  await check('Nach Neuladen: Übungsstand leer, Gesamtstand da', () => ev(() => { const L = loadLifetime(); return { ok: Object.keys(scores).length === 0 && Object.keys(loadGrammarSrs()).length === 0 && Object.keys(L.v).length >= 3, info: Object.keys(L.v).length + ' Wörter im Gesamtstand' }; }));

  // 4) Einstellungen → Gesamtstand löschen
  await check('Gesamtstand löschen: Abbrechen ändert nichts', () => ev(() => { const oc = window.confirm; window.confirm = () => false; const n = Object.keys(loadLifetime().v).length; resetLifetime(); window.confirm = oc; return { ok: Object.keys(loadLifetime().v).length === n, info: n }; }));
  await ev(() => { const pool = getPool(); for (let i = 0; i < 6; i++) updateScore(pool[0], true); progressMark('gender', 'дом', true); });
  const d1 = dialogs;
  await check('Gesamtstand löschen: fragt nach und leert alles', async () => { await ev(() => { openSettings(); showSettingsTab('zuruecksetzen'); }); await p.click('#lifetime-reset-btn'); await p.waitForTimeout(150); return ev(() => { const L = JSON.parse(localStorage.getItem('vokabeltrainer-lifetime')); return { ok: Object.keys(L.v).length === 0 && Object.keys(L.g).length === 0, info: 'v=' + Object.keys(L.v).length + ' g=' + Object.keys(L.g).length }; }).then(r => ({ ok: r.ok && dialogs === d1 + 1, info: r.info + ', Rückfragen=' + (dialogs - d1) })); });
  await check('Gesamtstand löschen: Übungsstand bleibt', () => ev(() => ({ ok: Object.keys(scores).length === 1 && !!grammarSrs.gender, info: Object.keys(scores).length + ' Wort' })));
  await check('Gesamtstand löschen: Anzeigen leer (✓, Kopfzeile)', () => ev(() => { closeOverlay('overlay-settings'); openVocabList(); const n = document.querySelectorAll('#overlay-vocab .ever-ok').length; closeOverlay('overlay-vocab'); updateGrammarTileProgress(); return { ok: n === 0, info: n + ' ✓ | ' + document.getElementById('gtp-gender').title }; }));
  await check('Gesamtstand füllt sich danach neu', () => ev(() => { progressMark('gender', 'мама', true); updateScore(getPool()[1], true); const L = loadLifetime(); return { ok: !!L.g.gender['мама'] && Object.keys(L.v).length === 1, info: JSON.stringify(L).slice(0, 80) }; }));
  await p.reload(); await p.waitForTimeout(400); await p.evaluate(() => setAppView('vocab'));
  await check('Nach Neuladen: gelöschter Gesamtstand wird nicht neu aufgebaut', () => ev(() => ({ ok: Object.keys(loadLifetime().v).length === 1, info: Object.keys(loadLifetime().v).length + ' (Übungsstand ' + Object.keys(scores).length + ')' })));
  await check('Sicherung enthält Gesamtstand', () => ev(() => BACKUP_KEYS.includes('vokabeltrainer-lifetime')));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
