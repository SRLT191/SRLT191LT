const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Hörtrainer-Ausbau (15.11.): Auswahl beim Start, Stufe, Dauer, Gruppen mit Wortzahl, Zahlen in Inhaltswörter,
// Richtung DE→RU, Beispielsatz, Wortanzeige mit Kategorie/Stufe, Zurück/Vor, Tasten
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => { errs.push('DIALOG: ' + d.message().slice(0, 60)); d.dismiss(); });
  await p.addInitScript(() => {
    const voices = [{ lang: 'ru-RU', name: 'RU' }, { lang: 'de-DE', name: 'DE' }];
    window.__spoken = [];
    const fake = {
      speaking: false, pending: false, paused: false,
      getVoices: () => voices, cancel() {}, pause() {}, resume() {},
      speak(u) { window.__spoken.push([u.lang, u.text]); setTimeout(() => { u.onend && u.onend(); }, 5); },
      addEventListener() {}, onvoiceschanged: null,
    };
    Object.defineProperty(window, 'speechSynthesis', { get: () => fake, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function (t) { this.text = t; }, configurable: true, writable: true });
  });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const ev = f => p.evaluate(f);
  const warte = ms => new Promise(r => setTimeout(r, ms));

  await check('ohne gespeicherte Auswahl: Kategorien der Vokabelansicht, Abspielen sofort möglich', () => ev(() => {
    localStorage.removeItem(HOERTRAINER_CATS_KEY); htState.selectedCats = new Set();
    activeMain = 'multi'; selectedCats = new Set(['Familie', 'Essen']);
    setAppView('listening'); showListeningPanel('hoertrainer');
    const sel = [...htState.selectedCats].sort().join();
    return { ok: sel === 'Essen,Familie' && !document.getElementById('ht-play-btn').disabled, info: sel };
  }));
  await check('gespeicherte Auswahl wird wiederhergestellt', () => ev(() => {
    setAllHoertrainerCatCheckboxes(false); document.querySelector('#hoertrainer-cat-body input[data-cat="Tiere"]').click();
    showListeningPanel('dictation'); showListeningPanel('hoertrainer');
    return [...htState.selectedCats].join() === 'Tiere';
  }));
  await check('Zähler: Wörter und Dauer', () => ev(() => /^1 Kategorie · \d+ Wörter · ca\. \d+ Min\.$/.test(document.getElementById('hoertrainer-cat-count').textContent) || document.getElementById('hoertrainer-cat-count').textContent));
  await check('Stufe bis A1: nur A1-Wörter, Zähler nennt die Stufe, gespeichert', () => ev(() => {
    setAllHoertrainerCatCheckboxes(true); const alle = htAuswahlWoerter().length;
    setHoertrainerOpt('level', 'A1'); const a1 = htAuswahlWoerter();
    const txt = document.getElementById('hoertrainer-cat-count').textContent;
    const gesp = JSON.parse(localStorage.getItem(HOERTRAINER_OPTS_KEY)).level;
    const bad = a1.filter(w => levelIdx(wordLevel(w)) > 0).length;
    const aktiv = document.querySelector('#ht-level-switch .mode-btn.active').dataset.l;
    setHoertrainerOpt('level', '');
    return { ok: a1.length > 50 && a1.length < alle && !bad && / bis A1 /.test(txt) && gesp === 'A1' && aktiv === 'A1', info: alle + ' → ' + a1.length + ' · ' + txt };
  }));
  await check('Gruppen zählen Kategorien und Wörter', () => ev(() => {
    const t = document.querySelector('#hoertrainer-cat-body .cat-group-sel').textContent;
    return { ok: /^\d+ von \d+ Kategorien? · \d+ Wörter$/.test(t), info: t };
  }));
  await check('Zahlen steht in „Inhaltswörter“, nicht mehr allein', () => ev(() => {
    const row = document.querySelector('#hoertrainer-cat-body input[data-cat="Zahlen"]').closest('.cat-check-row');
    const grp = document.querySelector('#hoertrainer-cat-body .cat-group-title[data-sub="Inhaltswörter"]');
    return { ok: row.dataset.sub === 'Inhaltswörter' && grp.dataset.cats.split('|').includes('Zahlen'), info: row.dataset.sub };
  }));
  await check('andere Auswahllisten unverändert (Zahlen dort weiter ungruppiert)', () => ev(() => {
    const div = document.createElement('div'); buildCatPickerBody(div, () => false, null);
    const row = div.querySelector('input[data-cat="Zahlen"]').closest('.cat-check-row');
    return !row.dataset.sub && !div.querySelector('.cat-group-sel');
  }));
  await check('Breite am PC: Liste zweispaltig, ohne inneren Scrollkasten', () => ev(() => {
    const cs = getComputedStyle(document.getElementById('hoertrainer-cat-body'));
    const w = document.getElementById('listening-view').getBoundingClientRect().width;
    return { ok: cs.columnCount === '2' && cs.maxHeight === 'none' && w > 700, info: cs.columnCount + ' / ' + cs.maxHeight + ' / ' + Math.round(w) };
  }));
  await check('Abspielen: Wort groß, Kategorie und Stufe, „Wort 1 von N“', async () => {
    await ev(() => { setAllHoertrainerCatCheckboxes(false); document.querySelector('#hoertrainer-cat-body input[data-cat="Familie"]').click(); setHoertrainerOrder('seq'); document.getElementById('hoertrainer-pause-range').value = 1; window.__spoken.length = 0; startHoertrainer(); });
    await warte(60);
    return ev(() => {
      const w = htState.queue[0], meta = document.getElementById('hoertrainer-meta').textContent;
      const r = { ok: document.getElementById('hoertrainer-word').textContent === w.ru && /Familie/.test(meta) && /^Wort 1 von \d+$/.test(document.getElementById('hoertrainer-progress').textContent) && window.__spoken[0][0] === 'ru-RU', info: meta + ' · ' + document.getElementById('hoertrainer-progress').textContent };
      return r;
    });
  });
  await check('Vor/Zurück und Tasten (→, ←, Leertaste)', async () => {
    await ev(() => { toggleHoertrainerPlay(); });
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
    const a = await ev(() => htState.index);
    await p.keyboard.press('ArrowLeft');
    const c = await ev(() => [htState.index, document.getElementById('hoertrainer-progress').textContent === 'Wort 2 von ' + htState.queue.length, htState.playing]);
    await p.keyboard.press('Space');
    const d = await ev(() => htState.playing);
    await ev(() => stopHoertrainer());
    return { ok: a === 2 && c[0] === 1 && c[1] && !c[2] && d, info: [a, c, d].join(' ') };
  });
  await check('Deutsch → Russisch: zuerst Deutsch, dann Russisch', async () => {
    await ev(() => { setHoertrainerOpt('dir', 'de-ru'); window.__spoken.length = 0; startHoertrainer(); });
    await warte(1300);
    const r = await ev(() => { const s = window.__spoken.slice(0, 2).map(x => x[0]); const w = htState.queue[0]; stopHoertrainer(); setHoertrainerOpt('dir', 'ru-de'); return [s, w.ru]; });
    return { ok: r[0][0] === 'de-DE' && r[0][1] === 'ru-RU', info: JSON.stringify(r) };
  });
  await check('Beispielsatz mit vorlesen: Satz wird gesprochen und angezeigt', async () => {
    await ev(() => {
      setHoertrainerOpt('satz', true);
      htState.queue = [];
      const w = getAllWordsOfCat('Familie').find(x => getWordSentence(x));
      window.__w = w; window.__spoken.length = 0;
      startHoertrainer(); htState.queue = [w]; htState.index = 0; htState.step = 0;
    });
    await warte(4500);
    const r = await ev(() => { const s = getWordSentence(window.__w); const gesagt = window.__spoken.map(x => x[1]); stopHoertrainer(); htZeigeWort(window.__w, htSchritte(window.__w).length - 1); const anz = document.getElementById('hoertrainer-sentence').textContent; setHoertrainerOpt('satz', false); return [gesagt.includes(s.ru), anz.includes(s.ru), gesagt.length]; });
    return { ok: r[0] && r[1], info: r.join(' ') };
  });
  await check('Infotext nennt Richtung, Beispielsatz und Tasten', () => ev(() => { const t = document.getElementById('hoertrainer-info-panel').textContent; return /Deutsch → Russisch/.test(t) && /Beispielsatz/.test(t) && /Leertaste/.test(t) && /Wörter bis Stufe/.test(t); }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
  process.exit(R.every(r => r[0] === 'OK ') ? 0 : 1);
})();
