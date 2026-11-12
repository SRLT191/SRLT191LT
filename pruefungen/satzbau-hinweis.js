const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Satzbau: Kasus-Hinweis („Hinweis: Objekt im Akk“) – seit 12.11. dreistufig: Immer / Nach Fehler / Nie (vorher Schalter an/aus, 10.11.),
// bleibt gemerkt; alte Einstellung „aus“ wird zu „Nie“
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const zeige = () => p.evaluate(() => { setAppView('grammar'); openSentenceBuild(); setWgAnswerMode('type'); setSbHelp('free');
    for (let i = 0; i < 40 && !wgState.current.hint; i++) restartWordgroup(); updateGtSettingsSummary();
    return { hint: wgState.current.hint, text: document.getElementById('sb-q').textContent, modus: (document.querySelector('#sb-hint-modes .mode-btn.active') || {}).dataset.v, sum: document.querySelector('.grammar-panel.open .gt-settings-sum').textContent }; });
  const a = await zeige();
  ok('Standard: „Immer“, Hinweis sichtbar', !!a.hint && a.text.includes('Hinweis: ' + a.hint) && a.modus === 'immer' && !/Hinweis/.test(a.sum), JSON.stringify(a));
  const c = await p.evaluate(() => { setSbHintMode('fehler'); const vor = document.getElementById('sb-q').textContent;
    wgEl('input').value = 'ххх'; checkWordgroup(); return { vor, nach: document.getElementById('sb-result').textContent, sum: document.querySelector('.grammar-panel.open .gt-settings-sum').textContent }; });
  ok('„Nach Fehler“: erst nach falscher Antwort im Ergebnis', !/Hinweis:/.test(c.vor) && /Hinweis:/.test(c.nach) && /Hinweis nach Fehler/.test(c.sum), JSON.stringify(c));
  const d = await p.evaluate(() => { setSbHintMode('nie'); restartWordgroup(); const vor = document.getElementById('sb-q').textContent; wgEl('input').value = 'ххх'; checkWordgroup();
    return { vor, nach: document.getElementById('sb-result').textContent, sum: document.querySelector('.grammar-panel.open .gt-settings-sum').textContent }; });
  ok('„Nie“: kein Hinweis, auch nicht nach Fehler', !/Hinweis:/.test(d.vor) && !/Hinweis:/.test(d.nach) && /ohne Hinweis/.test(d.sum), JSON.stringify(d));
  await p.reload(); await p.waitForTimeout(400);
  const e = await zeige();
  ok('bleibt nach dem Neuladen', e.modus === 'nie' && !/Hinweis:/.test(e.text), JSON.stringify(e));
  // alte Einstellung (Schalter aus, kein Modus) → „Nie“
  const f = await p.evaluate(() => { wgState.sbHintMode = null; wgState.sbHintVisible = false; return [sbHintModus(), (wgState.sbHintVisible = true, sbHintModus())]; });
  ok('alte Einstellung an/aus wird übernommen', f.join() === 'nie,immer', f.join());
  const w = await p.evaluate(() => { openWordgroup(); for (let i = 0; i < 40 && !wgState.current.hint; i++) restartWordgroup(); return !wgState.current.hint || /gesuchte Form/.test(document.querySelector('.grammar-panel.open .conj-q, .grammar-panel.open [id$="-q"]').textContent); });
  ok('Wortgruppen unverändert („gesuchte Form“ bleibt)', w);
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openSentenceBuild(); document.querySelector('.grammar-panel.open .gt-settings-toggle').click(); const r = document.getElementById('sb-hint-modes').getBoundingClientRect(); return { sichtbar: r.width > 100 && r.height >= 30, ueber: document.documentElement.scrollWidth - innerWidth }; });
  ok('Handy: Auswahl in den Einstellungen erreichbar, kein Überlauf', h.sichtbar && h.ueber <= 0, JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
