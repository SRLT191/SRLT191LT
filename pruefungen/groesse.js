const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Größe per Ziehen (PC): Lernbereich, Grammatik, Hören (Breite je Ansicht) und Dialoge (Ecke unten rechts)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message.slice(0, 140)]); } };
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const breite = id => p.evaluate(id => Math.round(document.getElementById(id).getBoundingClientRect().width), id);
  const ziehe = async (id, dx) => {
    const g = await p.locator('#' + id + ' > .area-grip').boundingBox();
    const x = g.x + g.width / 2, y = g.y + Math.min(60, g.height / 2);
    await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx, y, { steps: 6 }); await p.mouse.up();
  };
  await p.evaluate(() => setAppView('vocab'));
  const v0 = await breite('inner');
  await check('Lernbereich: Ziehen nach links macht schmaler (mittig, doppelte Strecke) und wird gespeichert', async () => {
    await ziehe('inner', -100); const w = await breite('inner'); const s = await p.evaluate(() => localStorage.getItem('vokabeltrainer-width-vocab'));
    return { ok: Math.abs(w - (v0 - 200)) <= 4 && s === String(w), info: v0 + ' → ' + w + ' px, gespeichert ' + s };
  });
  await check('Lernbereich: Breite bleibt nach Neuladen', async () => { await p.reload(); await p.waitForTimeout(300); await p.evaluate(() => setAppView('vocab')); const w = await breite('inner'); return { ok: Math.abs(w - (v0 - 200)) <= 4, info: w + ' px' }; });
  await check('Lernbereich: nicht schmaler als 420 px, nicht breiter als der Platz', async () => {
    await ziehe('inner', -600); const a = await breite('inner');
    await ziehe('inner', 900); const c = await breite('inner'); const max = await p.evaluate(() => areaMaxWidth());
    return { ok: a === 420 && c === max && !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), info: a + ' / ' + c + ' (Platz ' + max + ')' };
  });
  await check('Lernbereich: Doppelklick = automatische Breite, Eintrag gelöscht', async () => {
    await p.locator('#inner > .area-grip').dblclick(); const w = await breite('inner'); const s = await p.evaluate(() => localStorage.getItem('vokabeltrainer-width-vocab'));
    return { ok: w === v0 && s === null, info: w + ' px, Eintrag ' + s };
  });
  await check('Lernbereich: per Tastatur (Pfeil links −32 px, Pos1 = automatisch)', async () => {
    await p.focus('#inner > .area-grip'); await p.keyboard.press('ArrowLeft'); const a = await breite('inner');
    await p.keyboard.press('Home'); const c = await breite('inner');
    return { ok: a === v0 - 32 && c === v0, info: a + ' / ' + c };
  });
  await check('Grammatik: eigene Breite, Lernbereich bleibt unberührt', async () => {
    await p.evaluate(() => setAppView('grammar')); const g0 = await breite('grammar-view');
    await ziehe('grammar-view', 80); const g1 = await breite('grammar-view');
    await p.evaluate(() => setAppView('vocab')); const v = await breite('inner');
    const s = await p.evaluate(() => [localStorage.getItem('vokabeltrainer-width-grammar'), localStorage.getItem('vokabeltrainer-width-vocab')]);
    return { ok: Math.abs(g1 - (g0 + 160)) <= 4 && v === v0 && s[0] === String(g1) && s[1] === null, info: g0 + ' → ' + g1 + ' · Vokabeln ' + v };
  });
  await check('Hören: eigene Breite', async () => {
    await p.evaluate(() => setAppView('listening')); const h0 = await breite('listening-view');
    await ziehe('listening-view', 60); const h1 = await breite('listening-view');
    // mit offenem Hörtrainer ist die Grundbreite 920 px (15.11.), sonst 600 px; Ziehen um 60 px verbreitert beidseitig um 120 px
    const ht = await p.evaluate(() => document.getElementById('listening-hoertrainer').classList.contains('open'));
    const g = ht ? 920 : 600;
    return { ok: h0 === g && Math.abs(h1 - (g + 120)) <= 4, info: h0 + ' → ' + h1 };
  });
  // Dialoge
  const box = id => p.evaluate(id => { const r = document.querySelector('#' + id + ' .overlay-box').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: r.right, y: r.bottom }; }, id);
  await check('Dialog: Ecke unten rechts zieht die Größe, wird je Dialog gemerkt', async () => {
    await p.evaluate(() => openSettings()); await p.waitForTimeout(150);
    const a = await box('overlay-settings');
    await p.mouse.move(a.x - 4, a.y - 4); await p.mouse.down(); await p.mouse.move(a.x + 96, a.y + 46, { steps: 6 }); await p.mouse.up();
    const c = await box('overlay-settings'); const s = await p.evaluate(() => JSON.parse(localStorage.getItem('vokabeltrainer-dialog-sizes') || '{}'));
    const offen = await p.evaluate(() => document.getElementById('overlay-settings').classList.contains('open'));
    return { ok: offen && c.w >= a.w + 80 && c.h >= a.h + 30 && s['overlay-settings'] && s['overlay-settings'].w === c.w && !s['overlay-levels'], info: a.w + '×' + a.h + ' → ' + c.w + '×' + c.h + ' · offen ' + offen };
  });
  await check('Dialog: Größe bleibt nach Schließen und Neuladen', async () => {
    const a = await box('overlay-settings'); await p.evaluate(() => closeOverlay('overlay-settings'));
    await p.reload(); await p.waitForTimeout(300); await p.evaluate(() => openSettings()); await p.waitForTimeout(150);
    const c = await box('overlay-settings'); return { ok: Math.abs(a.w - c.w) <= 2 && Math.abs(a.h - c.h) <= 2, info: c.w + '×' + c.h };
  });
  await check('Dialog: andere Dialoge behalten ihre Standardgröße', async () => {
    await p.evaluate(() => { closeOverlay('overlay-settings'); openLevelOverview(); }); await p.waitForTimeout(150);
    const st = await p.evaluate(() => document.querySelector('#overlay-levels .overlay-box').style.width); await p.evaluate(() => closeOverlay('overlay-levels'));
    return { ok: st === '', info: 'Breite inline: „' + st + '“' };
  });
  await check('Dialog: Doppelklick auf die Ecke = Standardgröße', async () => {
    await p.evaluate(() => openSettings()); await p.waitForTimeout(150); const a = await box('overlay-settings');
    await p.mouse.dblclick(a.x - 6, a.y - 6); const c = await box('overlay-settings');
    const s = await p.evaluate(() => localStorage.getItem('vokabeltrainer-dialog-sizes'));
    await p.evaluate(() => closeOverlay('overlay-settings'));
    return { ok: c.w === 780 && s === null, info: c.w + '×' + c.h + ' · Eintrag ' + s };
  });
  await check('Dialog: Klick innen löst kein Speichern aus', async () => {
    await p.evaluate(() => openLevelOverview()); await p.waitForTimeout(150); const a = await box('overlay-levels');
    await p.mouse.click(a.x - 200, a.y - 100); const s = await p.evaluate(() => localStorage.getItem('vokabeltrainer-dialog-sizes'));
    await p.evaluate(() => closeOverlay('overlay-levels'));
    return { ok: s === null, info: 'Eintrag ' + s };
  });
  await check('Unsinnige gespeicherte Werte schaden nicht, Schlüssel stehen in der Sicherung', async () => {
    await p.evaluate(() => { localStorage.setItem('vokabeltrainer-width-vocab', '99999<img src=x>'); localStorage.setItem('vokabeltrainer-dialog-sizes', '[1,2'); });
    await p.reload(); await p.waitForTimeout(300); await p.evaluate(() => setAppView('vocab'));
    const w = await breite('inner'), max = await p.evaluate(() => areaMaxWidth());
    await p.evaluate(() => openSettings()); const d = await box('overlay-settings'); await p.evaluate(() => closeOverlay('overlay-settings'));
    const keys = await p.evaluate(() => ['vokabeltrainer-width-vocab', 'vokabeltrainer-width-grammar', 'vokabeltrainer-width-listening', 'vokabeltrainer-dialog-sizes'].every(k => BACKUP_KEYS.includes(k)));
    await p.evaluate(() => { localStorage.removeItem('vokabeltrainer-width-vocab'); localStorage.removeItem('vokabeltrainer-dialog-sizes'); });
    return { ok: w === max && d.w === 780 && keys && !errs.length, info: w + ' / Dialog ' + d.w + ' · Sicherung ' + keys };
  });
  // Handy: nichts davon
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const q = await m.newPage();
  await q.goto('file://' + APP_PATH); await q.evaluate(() => { localStorage.setItem('vokabeltrainer-width-vocab', '500'); localStorage.setItem('vokabeltrainer-dialog-sizes', JSON.stringify({ 'overlay-settings': { w: 900, h: 700 } })); });
  await q.reload(); await q.waitForTimeout(300);
  await check('Handy: keine Griffe, gespeicherte PC-Größen greifen nicht', () => q.evaluate(() => {
    setAppView('vocab'); const grip = getComputedStyle(document.querySelector('#inner > .area-grip')).display;
    openSettings(); const bx = document.querySelector('#overlay-settings .overlay-box'); const rs = getComputedStyle(bx).resize; const w = bx.getBoundingClientRect().width; closeOverlay('overlay-settings');
    return { ok: grip === 'none' && rs === 'none' && !document.getElementById('inner').style.maxWidth && w <= innerWidth, info: grip + ' · ' + rs + ' · Dialog ' + Math.round(w) };
  }));
  await check('Keine JS-Fehler', () => ({ ok: !errs.length, info: errs.slice(0, 2).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
