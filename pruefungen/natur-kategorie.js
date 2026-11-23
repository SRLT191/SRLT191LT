// Kategorie Natur (23.11.): Die Oberkategorie hieß wie die Kategorie „Natur“; ein Klick auf die
// Kategorie wählte deshalb alle Wörter der Gruppe (420 statt 70). Die Gruppe heißt jetzt „Natur & Umwelt“.
const { chromium } = require('playwright');
const path = require('path');
let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); } };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const fehlerJs = []; page.on('pageerror', e => fehlerJs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { try { setAppView('vocab'); } catch (e) {} });

  const k = await page.evaluate(() => ({
    gleich: Object.keys(CAT_GROUP_POOLS).filter(g => vocab[g]),
    gruppe: SUBSTANTIVE_GROUPS['Natur & Umwelt'] || null, alt: 'Natur' in SUBSTANTIVE_GROUPS,
    symbol: SUBSTANTIVE_GROUP_ICONS['Natur & Umwelt'], natur: getAllWordsOfCat('Natur').length,
  }));
  ok('keine Oberkategorie heißt wie eine Kategorie', k.gleich.length === 0, k.gleich);
  ok('Gruppe „Natur & Umwelt“ mit denselben sechs Kategorien, Symbol bleibt', !k.alt && k.symbol === 'ti-leaf'
    && JSON.stringify(k.gruppe) === JSON.stringify(['Natur', 'Tiere', 'Pflanzen', 'Wetter', 'Landwirtschaft', 'Geologie']), k);

  // Klick in der Seitenleiste: Substantive → Natur & Umwelt → Natur
  await page.evaluate(() => { expandedMain = 'Substantive'; expandedTheme = 'Natur & Umwelt'; buildNav(); });
  const knopf = page.locator('.sub-inline-nested .sub-btn[data-cat="Natur"]:visible').first();
  const da = await knopf.count();
  ok('Kategorie Natur steht in der aufgeklappten Gruppe', da === 1, da);
  if (da) await knopf.click();
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => ({ active: activeMain, pool: getPoolRaw().length, kat: getAllWordsOfCat('Natur').length,
    fremd: getPoolRaw().filter(w => !getAllWordsOfCat('Natur').includes(w)).length }));
  ok('Klick auf Natur wählt nur die 70 Wörter der Kategorie', r.active === 'Natur' && r.pool === r.kat && r.kat === 70 && r.fremd === 0, r);

  // Die Gruppe selbst wählt weiter alle sechs Kategorien
  const g = await page.evaluate(() => { activateCatGroup('Natur & Umwelt'); return { active: activeMain, pool: getPoolRaw().length,
    soll: SUBSTANTIVE_GROUPS['Natur & Umwelt'].reduce((a, c) => a + getAllWordsOfCat(c).length, 0) }; });
  ok('Gruppe „Natur & Umwelt“ wählt alle Wörter ihrer sechs Kategorien', g.active === 'Natur & Umwelt' && g.pool === g.soll && g.soll > 70, g);

  // Gespeicherte Auswahl „Natur“ aus der Zeit vor dem Fix gilt nach dem Neuladen als Kategorie
  await page.evaluate(() => selectWholeCat('Natur'));
  await page.reload(); await page.waitForTimeout(300);
  const nach = await page.evaluate(() => ({ active: activeMain, pool: getPoolRaw().length }));
  ok('nach dem Neuladen bleibt Natur mit 70 Wörtern gewählt', nach.active === 'Natur' && nach.pool === 70, nach);

  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
