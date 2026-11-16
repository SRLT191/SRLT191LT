const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Satzdiktat-Ausbau (15.11.): Stufe, Kategorien, gelernte Wörter, Texte, sofort vorlesen, langsam/2. Hälfte,
// Wörterzahl + Tipp, Runden mit Rundenende, Lösung zeigen + Selbstbewertung, Tasten, Lösungsanzeige
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => { errs.push('DIALOG: ' + d.message().slice(0, 60)); d.dismiss(); });
  await p.addInitScript(() => {
    const voices = [{ lang: 'ru-RU', name: 'RU' }, { lang: 'de-DE', name: 'DE' }];
    window.__spoken = [];
    const fake = { speaking: false, pending: false, paused: false, getVoices: () => voices, cancel() {}, pause() {}, resume() {},
      speak(u) { window.__spoken.push([u.text, u.rate]); setTimeout(() => { u.onend && u.onend(); }, 5); }, addEventListener() {}, onvoiceschanged: null };
    Object.defineProperty(window, 'speechSynthesis', { get: () => fake, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function (t) { this.text = t; }, configurable: true, writable: true });
  });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = f => p.evaluate(f);

  await check('Öffnen: Runde mit 15 Sätzen, „Satz 1 von 15“, Satz wird sofort vorgelesen', () => ev(() => {
    window.__spoken.length = 0; setAppView('listening'); showListeningPanel('dictation');
    const t = document.getElementById('dictation-runde').textContent;
    return { ok: dictState.runde.length === 15 && t === 'Satz 1 von 15' && window.__spoken.some(x => x[0] === dictState.current.ru), info: t };
  }));
  await check('Wörterzahl und Tipp deckt je ein Wort auf', () => ev(() => {
    const n = dictWoerterListe().length; const vor = document.querySelectorAll('#dictation-woerter .dw.offen').length;
    tippDictation(); tippDictation();
    const nach = document.querySelectorAll('#dictation-woerter .dw.offen').length;
    const txt = document.querySelector('#dictation-woerter .dw-n').textContent;
    return { ok: vor === 0 && nach === Math.min(2, n) && new RegExp('^' + n + ' W').test(txt), info: n + ' / ' + nach + ' / ' + txt };
  }));
  await check('Langsam (0,5×) und 2. Hälfte', () => ev(() => {
    window.__spoken.length = 0; playDictation(0.5); playDictationHalf();
    const w = dictState.current.ru.split(/\s+/);
    return { ok: window.__spoken[0][1] === 0.5 && window.__spoken[1][0] === w.slice(Math.floor(w.length / 2)).join(' '), info: JSON.stringify(window.__spoken) };
  }));
  await check('Strg+Leertaste liest vor, mit Umschalt langsam', async () => {
    await ev(() => { window.__spoken.length = 0; document.getElementById('dictation-input').blur(); });
    await p.keyboard.press('Control+Space'); await p.keyboard.press('Control+Shift+Space');
    return ev(() => ({ ok: window.__spoken.length === 2 && window.__spoken[1][1] === 0.5, info: JSON.stringify(window.__spoken) }));
  });
  await check('Prüfen: Lösung groß mit Übersetzung und Anhören, Knopf wird „Weiter“', () => ev(() => {
    document.getElementById('dictation-input').value = dictState.current.ru; checkDictation();
    const l = document.getElementById('dictation-loesung');
    return { ok: l.style.display !== 'none' && l.querySelector('.dl-ru').textContent === dictState.current.ru && l.querySelector('.dl-de').textContent === dictState.current.de && /Weiter/.test(document.getElementById('dictation-check-btn').textContent) && dictState.richtig === 1, info: document.getElementById('dictation-check-btn').textContent };
  }));
  await check('Enter nach dem Prüfen: nächster Satz', async () => {
    const a = await ev(() => dictState.idx);
    await p.focus('#dictation-input').catch(() => {}); await ev(() => checkDictation());
    return ev(() => dictState.idx === 1);
  });
  await check('Lösung zeigen → Selbstbewertung; „Nicht gewusst“ zählt als Fehler und geht weiter', () => ev(() => {
    const vor = dictState.current; revealDictation();
    const sicht = document.getElementById('dictation-selbst').style.display !== 'none';
    dictSelbst(false);
    return { ok: sicht && dictState.fehler.some(f => f.item === vor) && dictState.idx === 2, info: sicht + ' ' + dictState.fehler.length };
  }));
  await check('Rundenende: Ergebnis, Fehlerliste, „Fehler wiederholen“ spielt genau die Fehler', () => ev(() => {
    while (!dictState.ende) { document.getElementById('dictation-input').value = 'qqq'; checkDictation(); checkDictation(); }
    const ende = document.getElementById('dictation-ende');
    const ok1 = /Runde fertig/.test(ende.textContent) && ende.querySelectorAll('.gt-fehler li').length === dictState.fehler.length;
    const fehler = dictState.fehler.map(f => f.item.ru).sort().join('|');
    document.getElementById('dictation-repeat-btn').click();
    const neu = dictState.runde.map(x => x.ru).sort().join('|');
    return { ok: ok1 && neu === fehler && !dictState.ende, info: dictState.fehler.length + ' Fehler' };
  }));
  await check('Stufe A1 im Panel: nur A1-Sätze, gespeichert', () => ev(() => {
    setDictOpt('level', 'A1');
    const bad = dictState.runde.filter(x => x.lvl !== 'A1').length;
    const ok = !bad && JSON.parse(localStorage.getItem(DICT_OPTS_KEY)).level === 'A1' && document.querySelector('#dict-level-switch .mode-btn.active').dataset.l === 'A1';
    setDictOpt('level', ''); return { ok, info: 'zu schwer ' + bad };
  }));
  await check('Kategorien: nur Sätze zu Wörtern daraus', () => ev(() => {
    dictOpts.cats = []; setDictCats('keine'); dictOpts.cats = ['Tiere']; saveDictOpts(); dictNeueRunde();
    const w = new Set(getAllWordsOfCat('Tiere').map(x => x.ru));
    const ok = dictState.runde.length > 0 && dictState.runde.every(x => x.tg.some(t => w.has(t)));
    setDictCats('keine'); return { ok, info: dictState.runde.length + ' Sätze' };
  }));
  await check('Nur gelernte Wörter: nur Sätze, deren Zielwort im Gesamtstand richtig war', () => ev(() => {
    const pool = buildDictationPool(); const x = pool.find(s => s.tg.length === 1 && s.lvl === 'A1');
    const lt = loadLifetime(); lt.v = lt.v || {}; lt.v[x.tg[0]] = Object.assign({}, lt.v[x.tg[0]] || {}, { c: 3, w: 0 }); localStorage.setItem('vokabeltrainer-lifetime', JSON.stringify(lt));
    setDictOpt('gelernt', true); const p2 = dictPoolGefiltert();
    const ok = p2.length > 0 && p2.some(s => s.ru === x.ru) && p2.length < pool.length;
    setDictOpt('gelernt', false); return { ok, info: p2.length + ' Sätze' };
  }));
  await check('Sätze aus den Texten kommen dazu', () => ev(() => {
    const a = dictPoolGefiltert().length; setDictOpt('texte', true); const c = dictPoolGefiltert(); setDictOpt('texte', false);
    return { ok: c.length > a && c.some(x => x.text), info: a + ' → ' + c.length };
  }));
  await check('Tastatur (16.11.): Enter prüft, zweites Enter geht weiter; nach „Lösung zeigen“ 2 = nicht gewusst', async () => {
    await ev(() => { setDictOpt('level', ''); });
    await p.click('#dictation-input'); await p.keyboard.type('qqq'); await p.keyboard.press('Enter');
    const a = await ev(() => [dictState.idx, dictState.bewertet]);
    await p.keyboard.press('Enter');
    const c = await ev(() => dictState.idx);
    await p.click('button[onclick="revealDictation()"]'); const f = await ev(() => dictState.fehler.length);
    await p.keyboard.press('2');
    const d = await ev(() => [dictState.idx, dictState.fehler.length]);
    return { ok: a[1] && c === a[0] + 1 && d[0] === c + 1 && d[1] === f + 1, info: JSON.stringify([a, c, d]) };
  });
  await check('Infotext nennt Runden, Tipp, Selbstbewertung, Tasten und Stufe', () => ev(() => { const t = document.getElementById('dictation-info-panel').textContent; return /Runde/.test(t) && /Tipp/.test(t) && /Gewusst/.test(t) && /Strg\+Leertaste/.test(t) && /Wörter bis Stufe/.test(t); }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
  process.exit(R.every(r => r[0] === 'OK ') ? 0 : 1);
})();
