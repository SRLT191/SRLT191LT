const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Hörquiz-Ausbau (15.11.): Runden, Stufe, Kategorien, Antwortsprache, Lösung zeigen + Selbstbewertung, Lösungsanzeige, Tasten
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

  await check('Öffnen: Runde mit 15 Wörtern, „Wort 1 von 15“, Wort wird vorgelesen', async () => {
    await ev(() => { localStorage.removeItem(HEARQUIZ_SETTINGS_KEY); hqState.level = ''; hqState.selectedCats = new Set(); hqState.mode = 'type'; hqState.lang = 'ru';
      window.__spoken.length = 0; setAppView('listening'); showListeningPanel('hearquiz'); });
    await p.waitForTimeout(400);
    return ev(() => { const t = document.getElementById('hq-runde').textContent;
    return { ok: hqState.runde.length === 15 && t === 'Wort 1 von 15' && window.__spoken.some(x => x[0] === hqState.current.ru.replace(/ \/ /g, ', ')), info: t + ' ' + JSON.stringify(window.__spoken) }; });
  });
  await check('Werkzeugleiste in einer Zeile, „Antwort: Russisch / Deutsch“, kein Runde-Knopf', () => ev(() => {
    const tb = document.querySelector('#listening-hearquiz .hq-toolbar'); const kinder = [...tb.children].map(c => c.getBoundingClientRect().top);
    const ok = Math.max(...kinder) - Math.min(...kinder) < 4 && document.getElementById('hq-lang-ru').textContent === 'Russisch' && /Antwort/.test(tb.textContent) && !/Runde/.test(tb.textContent) && !document.getElementById('overlay-hq-session');
    return { ok, info: kinder.join(',') };
  }));
  await check('Einstellungen: Kategorienauswahl mit Gruppen, Suche, Zurücksetzen; gilt ohne „Übernehmen“', () => ev(() => {
    const d = document.getElementById('hq-optionen'); d.open = true;
    const grp = d.querySelectorAll('#hearquiz-cat-body .cat-group-title').length;
    const cb = d.querySelector('#hearquiz-cat-body input[data-cat="Tiere"]'); cb.click();
    const ok = grp > 2 && !!document.getElementById('hq-cat-search') && !!d.querySelector('#hq-reset-btn') && !/Übernehmen/.test(document.getElementById('listening-hearquiz').textContent)
      && hqState.selectedCats.has('Tiere') && hqState.runde.every(w => getAllWordsOfCat('Tiere').some(x => x.ru === w.ru)) && document.querySelectorAll('#hq-chips .ht-chip').length === 1;
    setHearquizCats('keine'); d.open = false;
    return { ok, info: grp + ' Gruppen, ' + hqState.pool.length + ' Wörter' };
  }));
  await check('Stufe A1 im Panel: nur A1-Wörter, gemerkt, Kennzahl „Wörter bis A1“', () => ev(() => {
    setHearquizLevel('A1');
    const bad = hqState.pool.filter(w => wordLevel(w) !== 'A1').length;
    const ok = !bad && JSON.parse(localStorage.getItem(HEARQUIZ_SETTINGS_KEY)).level === 'A1' && document.getElementById('hq-info-total-lbl').textContent === 'Wörter bis A1'
      && document.querySelector('#hq-level-switch .mode-btn.active').dataset.l === 'A1';
    const n = hqState.pool.length; setHearquizLevel('');
    return { ok: ok && hqState.pool.length > n, info: n + ' Wörter, zu schwer ' + bad };
  }));
  await check('Tippen richtig: Lösung groß mit Übersetzung, Stufe, Beispielsatz und Anhören', () => ev(() => {
    restartHearquiz(true); const w = hqState.current;
    document.getElementById('hq-input').value = w.ru; checkHearquiz();
    const l = document.getElementById('hq-loesung');
    const s = getWordSentence(w);
    return { ok: l.style.display !== 'none' && l.querySelector('.dl-ru').textContent.includes(w.ru) && !!l.querySelector('.lvl-badge') && (!s || l.textContent.includes(s.ru)) && /Anhören/.test(l.textContent)
      && hqState.richtig === 1 && document.getElementById('hq-info-right').textContent === hqState.correct + '/' + hqState.done, info: l.textContent.slice(0, 80) };
  }));
  await check('Lösung zeigen → Selbstbewertung; „Gewusst“ zählt und geht weiter', () => ev(() => {
    checkHearquiz(); const i0 = hqState.idx, c0 = hqState.correct;
    revealHearquiz();
    const sicht = document.getElementById('hq-selbst').style.display !== 'none' && document.getElementById('hq-loesung').style.display !== 'none';
    const vorher = hqState.done; rateHearquizType(true);
    return { ok: sicht && hqState.done === vorher + 1 && hqState.correct === c0 + 1 && hqState.idx === i0 + 1, info: sicht + ' ' + hqState.idx };
  }));
  await check('Auswahl: Taste 2 wählt die zweite Antwort, Enter geht weiter', async () => {
    await ev(() => { setHearquizMode('choice'); document.activeElement && document.activeElement.blur(); });
    const v = await ev(() => document.querySelectorAll('#hq-choice-row .case-opt')[1].dataset.v);
    await p.keyboard.press('2');
    const a = await ev(() => [hqState.answered, document.querySelectorAll('#hq-choice-row .case-opt.correct').length, hqState.idx]);
    await p.keyboard.press('Enter');
    const b = await ev(() => hqState.idx);
    return { ok: a[0] && a[1] === 1 && b === a[2] + 1, info: v + ' ' + a.join(',') + ' → ' + b };
  });
  await check('Strg+Leertaste spielt ab, mit Umschalt langsam', async () => {
    await ev(() => { window.__spoken.length = 0; });
    await p.keyboard.press('Control+Space'); await p.keyboard.press('Control+Shift+Space');
    return ev(() => ({ ok: window.__spoken.length === 2 && window.__spoken[1][1] === 0.5 && window.__spoken[0][0] === hqState.current.ru.replace(/ \/ /g, ', '), info: JSON.stringify(window.__spoken) }));
  });
  await check('Rundenende: Bilanz, Fehlerliste, „Fehler wiederholen“ spielt genau die Fehler', () => ev(() => {
    setHearquizMode('type');
    while (!hqState.ende) { document.getElementById('hq-input').value = 'qqq'; checkHearquiz(); checkHearquiz(); }
    const ende = document.getElementById('hq-ende');
    const ok1 = ende.style.display !== 'none' && /Runde fertig/.test(ende.textContent) && ende.querySelectorAll('.gt-fehler li').length === hqState.fehler.length && hqState.fehler.length === 15;
    const f = hqState.fehler.map(w => w.ru).sort().join('|');
    document.getElementById('hearquiz-repeat-btn').click();
    return { ok: ok1 && hqState.runde.map(w => w.ru).sort().join('|') === f && !hqState.ende, info: hqState.fehler.length + ' / ' + hqState.runde.length };
  }));
  await check('Aufdecken: Bewertung am Rundenende zurücknehmen', () => ev(() => {
    setHearquizMode('flip');
    while (hqState.idx < hqState.runde.length - 1) { revealHearquizFlip(); rateHearquiz(true); }
    revealHearquizFlip(); rateHearquiz(false);
    const amEnde = hqState.ende && document.getElementById('hq-undo-btn').offsetParent !== null;
    undoHearquizRate();
    return { ok: amEnde && !hqState.ende && hqState.revealed && hqState.idx === hqState.runde.length - 1 && document.getElementById('hq-spiel').style.display !== 'none', info: amEnde + ' ' + hqState.idx };
  }));
  await check('Tippen (16.11.): leeres Feld + Enter überspringt; nach „Lösung zeigen“ 1 = gewusst', async () => {
    await ev(() => { setHearquizMode('type'); });
    await p.click('#hq-input'); const i0 = await ev(() => [hqState.idx, hqState.done]);
    await p.keyboard.press('Enter'); const i1 = await ev(() => [hqState.idx, hqState.done]);
    await p.click('#hq-reveal-btn'); await p.keyboard.press('1'); const i2 = await ev(() => [hqState.idx, hqState.done]);
    return { ok: i1[0] === i0[0] + 1 && i1[1] === i0[1] && i2[0] === i1[0] + 1 && i2[1] === i1[1] + 1, info: JSON.stringify([i0, i1, i2]) };
  });
  await check('Infotext nennt Runden, Lösung zeigen, Tasten und Stufe', () => ev(() => { const t = document.getElementById('hearquiz-info-panel').textContent; return /Runde/.test(t) && /Lösung zeigen/.test(t) && /Strg\+Leertaste/.test(t) && /Wörter bis Stufe/.test(t) && /1–4/.test(t); }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
  process.exit(R.every(r => r[0] === 'OK ') ? 0 : 1);
})();
