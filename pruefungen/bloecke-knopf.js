const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Handy (5.11.): Blöcke der gewählten Kategorie direkt über einen Knopf neben Vokabelliste und Alphabet wählen;
// der Knopf zeigt den Stand („alle“, „6–10“, „3/13“) und fehlt bei Kategorien mit nur einem Block
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  await p.evaluate(() => { setAppView('vocab'); selectWholeCat('Wahrnehmung & Gefühle'); });
  const a = await p.evaluate(() => { const btn = document.getElementById('blocks-tool-btn'); const r = btn.getBoundingClientRect();
    return { sichtbar: !btn.hidden && r.width > 0, text: btn.textContent.trim(), hoehe: Math.round(r.height), zeile: (t => Math.abs((r.top + r.bottom) / 2 - (t.top + t.bottom) / 2) < 6)(document.getElementById('sidebar-mobile-toggle').getBoundingClientRect()) }; });
  ok('Knopf neben Vokabelliste/Alphabet, zeigt „alle“, ≥ 44 px hoch, in derselben Zeile', a.sichtbar && a.text === 'alle' && a.hoehe >= 44 && a.zeile, JSON.stringify(a));
  await p.tap('#blocks-tool-btn'); await p.waitForTimeout(150);
  const o = await p.evaluate(() => ({ offen: document.getElementById('block-picker-title').closest('.overlay').classList.contains('open'), titel: document.getElementById('block-picker-title').textContent }));
  ok('Antippen öffnet die Blockwahl der gewählten Kategorie', o.offen && /^Wahrnehmung & Gefühle/.test(o.titel), JSON.stringify(o));
  const c = await p.evaluate(() => { const boxes = [...document.querySelectorAll('#block-picker-body input[type=checkbox]')]; boxes.forEach(x => { x.checked = false; }); boxes[1].checked = true;
    [...document.querySelectorAll('.overlay.open button')].find(x => /Übernehmen/.test(x.textContent)).click();
    const eins = document.getElementById('blocks-tool-n').textContent;
    selectedBlocksByCat[activeMain] = new Set([0, 2]); updateProgress(); const drei = document.getElementById('blocks-tool-n').textContent;
    return { eins, drei, label: getBlockLabel(1, activeMain), n: getBlockCount(activeMain) }; });
  ok('nach der Wahl: ein Block zeigt seinen Bereich, mehrere „x/n“', c.eins === c.label && c.drei === '2/' + c.n, JSON.stringify(c));
  const d = await p.evaluate(() => { const klein = Object.keys(vocab).find(k => vocab[k].blocks && getBlockCount(k) < 2 && !(vocab[k].newBlock || []).length); if (klein) selectWholeCat(klein);
    const h1 = document.getElementById('blocks-tool-btn').hidden; activateCatGroup && Object.keys(CAT_GROUP_POOLS || {}).length && activateCatGroup(Object.keys(CAT_GROUP_POOLS)[0]); const h2 = document.getElementById('blocks-tool-btn').hidden; return { klein, h1, h2 }; });
  ok('ohne mehrere Blöcke (kleine Kategorie, Oberkategorie) kein Knopf', (!d.klein || d.h1) && d.h2, JSON.stringify(d));
  for (const w of [360, 320]) { await p.setViewportSize({ width: w, height: 760 }); await p.evaluate(() => selectWholeCat('Wahrnehmung & Gefühle')); await p.waitForTimeout(80);
    const u = await p.evaluate(() => ({ ueber: document.documentElement.scrollWidth - innerWidth, rechts: Math.round(document.getElementById('blocks-tool-btn').getBoundingClientRect().right), w: innerWidth }));
    ok(w + ' px: passt in die Zeile, kein Überlauf', u.ueber <= 0 && u.rechts <= u.w, JSON.stringify(u)); }
  await ctx.close();
  const q = await b.newPage({ viewport: { width: 1400, height: 900 } }); await q.goto('file://' + APP_PATH); await q.waitForTimeout(300);
  const pc = await q.evaluate(() => { setAppView('vocab'); selectWholeCat('Wahrnehmung & Gefühle'); return document.getElementById('blocks-tool-btn').getClientRects().length; });
  ok('am PC nicht sichtbar (dort Blockwahl in der Seitenleiste)', pc === 0, String(pc));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
