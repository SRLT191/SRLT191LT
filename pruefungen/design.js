const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Design 25.10.: Kopfzeile (Handy: Leiste unten), Grammatik in der Seitenleiste, Fortschrittszeile,
// Lernkarte mit Aktionen, ruhige Rückmeldung mit markiertem Unterschied, russische Schrift Literata
// mit Schalter, Hörquiz-Knöpfe, GitHub-Punkt an der Kopfzeile.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const p = await b.newPage({ viewport: { width: 1366, height: 820 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400); await p.evaluate(() => setAppView('vocab'));
  const ev = (f, a) => p.evaluate(f, a);
  await check('PC: Kopfzeile oben mit Bereichen und Vokabelliste/Alphabet/Einstellungen', () => ev(() => {
    const h = document.getElementById('app-header').getBoundingClientRect(); const vs = document.getElementById('view-switcher');
    const btns = [...document.querySelectorAll('.hdr-actions .hdr-btn')].filter(x => x.offsetParent).length;
    return { ok: h.top === 0 && h.height >= 50 && vs.closest('#app-header') && btns === 3 && !document.getElementById('sidebar-tools').offsetParent, info: Math.round(h.height) + ' px, ' + btns + ' Knöpfe' };
  }));
  await check('PC: Grammatik-Bereiche und Werkzeuge in der Seitenleiste, Werkzeuge unter ihrem Bereich', () => ev(() => {
    setAppView('grammar'); showGrammarPanel('gender');
    const side = document.getElementById('grammar-side'); const inSide = side.contains(document.getElementById('grammar-cats')) && side.contains(document.getElementById('grammar-nav'));
    const sichtbar = !!document.getElementById('sidebar').offsetParent && !document.getElementById('cat-nav').offsetParent;
    const y = id => document.getElementById(id).getBoundingClientRect().top;
    const reihenfolge = y('gcat-noun') < y('gchip-gender') && y('gchip-gender') < y('gcat-adj');
    setAppView('vocab');
    return { ok: inSide && sichtbar && reihenfolge && !!document.getElementById('cat-nav').offsetParent, info: [inSide, sichtbar, reihenfolge].join(' ') };
  }));
  await check('Fortschrittszeile zeigt erledigt von gesamt (wie die Zähler)', () => ev(() => {
    const w = getPool()[0]; updateScore(w, true); updateProgress();
    const t = document.getElementById('progress-text').textContent, tot = +document.getElementById('info-total').textContent, open = +document.getElementById('info-open').textContent;
    return { ok: t === (tot - open) + ' von ' + tot + ' erledigt' && !document.getElementById('info-panel').offsetParent, info: t };
  }));
  await check('Lernkarte: Anhören, Aussprache, Merken, Details unter dem Wort', () => ev(() => {
    const ids = ['speak-btn', 'transcription-btn', 'bookmark-btn', 'detail-btn']; const row = document.getElementById('card-actions');
    return ids.every(id => row.contains(document.getElementById(id))) && row.getBoundingClientRect().top > document.getElementById('russian-word').getBoundingClientRect().bottom;
  }));
  await check('falsche Antwort: Karte bleibt hell, eigene Antwort durchgestrichen, Unterschied markiert', async () => {
    await ev(() => { setMode('free'); setDirection('ru-de'); nextWord(allVocabWords().find(w => w.ru === 'идея')); document.getElementById('answer-input').value = 'Iris'; checkAnswer(); });
    return ev(() => { const card = getComputedStyle(document.getElementById('word-card')).backgroundColor, surf = getComputedStyle(document.querySelector('#app-header')).backgroundColor;
      const t = document.getElementById('sentence-diff-text').innerHTML; const vis = !!document.getElementById('sentence-diff').offsetParent;
      return { ok: card === surf && vis && /<del>Iris<\/del>/.test(t) && /I<mark>d<\/mark>/.test(t), info: t }; });
  });
  await check('nächstes Wort: Unterschied verschwindet, auch bei Auswahl kein alter Rest', () => ev(() => {
    nextWord(); const a = !document.getElementById('sentence-diff').offsetParent; setMode('mc'); const i = mcOptions.findIndex(o => !currentWord.de.some(d => d.toLowerCase() === o.toLowerCase())); checkMC(i);
    const c = !document.getElementById('sentence-diff').offsetParent; nextWord(); setMode('free'); return { ok: a && c, info: a + ' ' + c };
  }));
  await check('Unterschied ist sicher gegen eingeschleusten Code', () => ev(() => { nextWord(); document.getElementById('answer-input').value = '<img src=x onerror=window.__x=1>'; checkAnswer(); const ok = !document.querySelector('#sentence-diff-text img') && !window.__x; nextWord(); return ok; }));
  await check('russische Schrift: Literata eingebettet und an der Karte, Bedienung bleibt Noto Sans', () => ev(async () => {
    await document.fonts.load('600 40px Literata', 'жизнь'); const lit = document.fonts.check('600 40px Literata', 'жизнь');
    const ru = getComputedStyle(document.getElementById('russian-word')).fontFamily, ui = getComputedStyle(document.getElementById('check-btn')).fontFamily;
    return { ok: lit && /^"?Literata/.test(ru) && /^"?Noto Sans/.test(ui), info: ru + ' | ' + ui };
  }));
  await check('Schalter „Russische Schrift ohne Serifen“: wirkt sofort, bleibt nach Neuladen, steht in der Sicherung', async () => {
    await ev(() => { openSettings(); showSettingsTab('darstellung'); }); await p.click('#rufont-seg [data-mode="sans"]');
    const a = await ev(() => getComputedStyle(document.getElementById('russian-word')).fontFamily);
    await p.reload(); await p.waitForTimeout(300);
    const c = await ev(() => [document.documentElement.getAttribute('data-rufont'), getComputedStyle(document.getElementById('russian-word')).fontFamily, BACKUP_KEYS.includes('vokabeltrainer-ru-font')]);
    await ev(() => setRuFont('serif'));
    const d = await ev(() => getComputedStyle(document.getElementById('russian-word')).fontFamily);
    return { ok: /^"?Noto Sans/.test(a) && c[0] === 'sans' && /^"?Noto Sans/.test(c[1]) && c[2] && /^"?Literata/.test(d), info: a + ' / ' + d };
  });
  await check('Hörquiz: runder Anhören-Knopf, Prüfen als Hauptknopf', () => ev(() => {
    setAppView('listening'); showListeningPanel('hearquiz'); setHearquizMode('type');
    const play = document.getElementById('hq-play-btn').getBoundingClientRect(), chk = document.getElementById('hq-check-btn');
    const ok = Math.abs(play.width - play.height) < 2 && play.width >= 80 && chk.classList.contains('gt-primary'); setAppView('vocab'); return { ok, info: Math.round(play.width) + ' px' };
  }));
  await check('GitHub-Punkt auch an „Einstellungen“ in der Kopfzeile', () => ev(() => {
    localStorage.setItem('vokabeltrainer-gh-settings', JSON.stringify({ repo: 'ich/lernstand' })); localStorage.setItem('vokabeltrainer-gh-token', 'github_pat_' + 'A'.repeat(40));
    ghUpdateIndicator(); const ok = document.getElementById('hdr-settings-btn').classList.contains('gh-dirty');
    localStorage.removeItem('vokabeltrainer-gh-token'); localStorage.removeItem('vokabeltrainer-gh-settings'); ghUpdateIndicator();
    return ok && !document.getElementById('hdr-settings-btn').classList.contains('gh-dirty');
  }));
  await p.close();
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  await check('Handy: Heute, Bereiche und Einstellungen als Leiste unten, mind. 44 px hoch, ohne Vokabelliste/Alphabet', () => m.evaluate(() => {
    const h = document.getElementById('app-header').getBoundingClientRect(); const vis = [...document.querySelectorAll('#app-header button')].filter(x => x.offsetParent);
    const pad = parseFloat(getComputedStyle(document.body).paddingBottom);
    return { ok: Math.round(h.bottom) === innerHeight && h.height >= 56 && vis.length === 6 && vis.every(x => x.getBoundingClientRect().height >= 44) && pad >= h.height - 1, info: vis.map(x => x.textContent.trim()).join(' | ') };
  }));
  await check('Handy: Grammatik-Navigation über dem Werkzeug, Seitenleiste aus', () => m.evaluate(() => {
    setAppView('grammar'); const ok = document.getElementById('grammar-view').contains(document.getElementById('grammar-cats')) && !document.getElementById('sidebar').offsetParent && !!document.getElementById('gcat-verb').offsetParent;
    setAppView('vocab'); return ok;
  }));
  for (const w of [320, 360, 390]) await check('Handy ' + w + ' px: kein Überlauf in Vokabeln, Grammatik, Hören', async () => {
    await m.setViewportSize({ width: w, height: 760 }); await m.waitForTimeout(150);
    return m.evaluate(() => { const bad = []; for (const v of ['vocab', 'grammar', 'listening', 'reading']) { setAppView(v); if (document.documentElement.scrollWidth > document.documentElement.clientWidth) bad.push(v); } setAppView('vocab'); return { ok: !bad.length, info: bad.join(',') }; });
  });
  await check('PC ↔ Handy: Navigation wandert beim Ändern der Fensterbreite mit', async () => {
    await m.setViewportSize({ width: 1200, height: 800 }); await m.waitForTimeout(150);
    const a = await m.evaluate(() => { setAppView('grammar'); return document.getElementById('grammar-side').contains(document.getElementById('grammar-cats')); });
    await m.setViewportSize({ width: 390, height: 800 }); await m.waitForTimeout(150);
    const c = await m.evaluate(() => document.getElementById('grammar-view').contains(document.getElementById('grammar-cats')));
    return { ok: a && c, info: a + ' ' + c };
  });
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  if (R.some(r => r[0] !== 'OK ')) process.exitCode = 1;
  await b.close();
})();
