// Wird von alle.sh mit `node -r ./zufall.js` vor jede Prüfung geladen.
// Ersetzt Math.random in jeder Browserseite durch einen Zufallsgenerator mit festem Startwert,
// damit jeder Lauf dieselben Wörter und Aufgaben zieht und Fehler nachstellbar sind.
// Startwert aus der Umgebungsvariable SEED (Standard 1). SEED=aus → echter Zufall.
const SEED = process.env.SEED || '1';
if (SEED !== 'aus') {
  const zahl = (parseInt(SEED, 10) >>> 0) || 1;
  // mulberry32: klein, schnell, gleichmäßig genug für Wort- und Aufgabenauswahl
  const skript = `(() => {
    let a = ${zahl} >>> 0;
    Math.random = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();`;
  const { chromium } = require('playwright');
  const launch = chromium.launch.bind(chromium);
  chromium.launch = async (...args) => {
    const browser = await launch(...args);
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...a) => {
      const ctx = await newContext(...a);
      await ctx.addInitScript(skript);
      return ctx;
    };
    browser.newPage = async (...a) => {
      // wie Playwright: eigene Umgebung, die mit der Seite geschlossen wird
      const ctx = await browser.newContext(...a);
      const page = await ctx.newPage();
      const close = page.close.bind(page);
      page.close = async (...c) => { await close(...c); await ctx.close().catch(() => {}); };
      return page;
    };
    return browser;
  };
}
