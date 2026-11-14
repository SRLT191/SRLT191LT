const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Klick-Durchlauf (14.11.): jeden sichtbaren Knopf in jeder Ansicht und jedem Grammatikwerkzeug anklicken,
// dazu Tastenfolgen – es darf keine Fehlermeldung entstehen. Dazu: jedes benutzte Symbol steckt in der Schrift.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = []; let ort = '', klicks = 0;
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  p.on('pageerror', e => errs.push(ort + ' → ' + e.message.slice(0, 140))); p.on('console', m => { if (m.type() === 'error') errs.push(ort + ' → Konsole: ' + m.text().slice(0, 140)); });
  p.on('dialog', d => d.dismiss());
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  await p.evaluate(() => { window.speak = () => {}; if (window.speechSynthesis) speechSynthesis.speak = () => {}; });
  // nicht angeklickt: Zurücksetzen/Löschen, GitHub, Ein-/Ausfuhr, Ansichtswechsel (der wird gezielt gemacht)
  const VERBOTEN = 'reset|l[öo]sch|zur[üu]cksetz|github|gh[A-Z]|import|export|download|sicher|install|clear|token|datei|file|print|drucken|setAppView|location|reload';
  const klickAlle = async name => {
    const labs = await p.evaluate(V => { const re = new RegExp(V, 'i'), out = [];
      const els = [...document.querySelectorAll('button, [role=button], [onclick]')].filter(e => e.getClientRects().length && !e.disabled);
      els.forEach(e => { if (!e.isConnected) return; const s = (e.getAttribute('onclick') || '') + ' ' + e.textContent + ' ' + (e.id || '') + ' ' + (e.title || ''); if (re.test(s)) return;
        const lab = (e.id || e.textContent.trim().slice(0, 25) || e.className).toString(); window.__ort = lab; try { e.click(); out.push(lab); } catch (x) { out.push('FEHLER ' + lab + ': ' + x.message); } });
      return out; }, VERBOTEN);
    klicks += labs.length; labs.filter(l => l.startsWith('FEHLER')).forEach(l => errs.push(name + ' → ' + l));
    await p.waitForTimeout(60); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
    await p.evaluate(() => document.querySelectorAll('.overlay.open').forEach(x => x.classList.remove('open')));
  };
  const views = await p.evaluate(() => [...new Set([...document.querySelectorAll('[onclick*="setAppView"]')].map(x => (x.getAttribute('onclick').match(/setAppView\('(\w+)'/) || [])[1]).filter(Boolean))]);
  for (const v of views) { ort = 'Ansicht ' + v; await p.evaluate(v => setAppView(v), v); await p.waitForTimeout(100); await klickAlle(ort); await p.evaluate(v => setAppView(v), v); await klickAlle(ort + ' (2)'); }
  const tools = await p.evaluate(() => { setAppView('grammar'); return GRAMMAR_PANELS.slice(); });
  for (const t of tools) { ort = 'Werkzeug ' + t;
    for (let r = 0; r < 2; r++) { await p.evaluate(t => { setAppView('grammar'); GRAMMAR_PANEL_OPENERS[t](); const s = document.querySelector('#overlay-' + t + ' .gt-settings-toggle'); if (s && s.getAttribute('aria-expanded') !== 'true') s.click(); }, t); await klickAlle(ort); }
    await p.evaluate(t => { setAppView('grammar'); GRAMMAR_PANEL_OPENERS[t](); }, t); ort = 'Tasten ' + t;
    for (const k of ['Enter', '1', '2', '3', 'Enter', 'Tab', 'Enter', 'Escape', '4', '5', 'Enter', 'Enter']) { await p.keyboard.press(k); await p.waitForTimeout(8); }
  }
  const uniq = [...new Set(errs)];
  ok(views.length + ' Ansichten und ' + tools.length + ' Werkzeuge durchgeklickt (' + klicks + ' Klicks, Tastenfolgen): keine Fehlermeldung', uniq.length === 0, uniq.slice(0, 5).join(' ;; '));
  // Symbole: jede im Quelltext benutzte ti-Klasse hat ein Zeichen in der eingebetteten Schrift
  const sym = await p.evaluate(async () => { const src = document.documentElement.outerHTML + [...document.scripts].map(s => s.textContent).join(' ');
    const namen = [...new Set(src.match(/\bti-[a-z0-9]+(?:-[a-z0-9]+)*/g) || [])];
    await document.fonts.ready; const probe = document.createElement('i'); document.body.appendChild(probe); const fehlt = [];
    namen.forEach(n => { probe.className = 'ti ' + n; const c = getComputedStyle(probe, '::before').content; if (!c || c === 'none' || c === 'normal') { fehlt.push(n + ' (keine Regel)'); return; }
      const z = c.replace(/^["']|["']$/g, ''); if (!document.fonts.check('16px "tabler-icons"', z) ) fehlt.push(n + ' (kein Zeichen)'); });
    probe.remove(); return { n: namen.length, fehlt }; });
  ok(sym.n + ' benutzte Symbole stecken in der eingebetteten Schrift', sym.fehlt.length === 0, sym.fehlt.slice(0, 8).join(', '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
