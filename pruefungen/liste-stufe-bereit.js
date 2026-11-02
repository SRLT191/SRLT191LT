const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Vokabelliste (2.11.): auf einen Blick, ob ein Wort jetzt eine Wiederholungsstufe aufsteigen kann
// („↑ jetzt“) oder ab wann („ab 5.11.“, heute „ab 18 Uhr“); Sortierung „Nächste Stufe: jetzt möglich zuerst“
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const L = loadLifetime(), now = Date.now(), D = 864e5, ws = getAllWordsOfCat('Wohnen');
    const set = (w, d, dd) => { L.v[getKey(w)] = { c: 2, w: 0, mb: 1, l: now - 30 * D, z: now - D, d, dd }; };
    set(ws[0], 1, now - 2 * D);        // Stufe 1, 1 Tag Abstand abgelaufen → jetzt
    set(ws[1], 2, now - D);            // Stufe 2 braucht 3 Tage → in 2 Tagen
    set(ws[2], 5, now - 30 * D);       // sicher → kein Hinweis
    set(ws[3], 4, now - 15 * D);       // Stufe 4, 14 Tage abgelaufen → jetzt
    saveLifetime();
    setAppView('vocab'); selectWholeCat('Wohnen'); openVocabList();
    const zeile = w => [...document.querySelectorAll('#vocab-table-body tr')].find(tr => tr.querySelector('.td-ru').textContent.trim().startsWith(w.ru));
    const info = w => { const z = zeile(w); const up = z.querySelector('.runs-up'), wait = z.querySelector('.runs-wait'); return { up: up && up.textContent, upTitle: up && up.title, wait: wait && wait.textContent, waitTitle: wait && wait.title }; };
    const out = { a: info(ws[0]), b: info(ws[1]), c: info(ws[2]), d: info(ws[3]), e: info(ws[5]) };
    const erwartet = new Date(now - D + 3 * D); out.datum = 'ab ' + erwartet.getDate() + '.' + (erwartet.getMonth() + 1) + '.';
    document.getElementById('vocab-sort').value = 'runs-ready'; renderVocabTable();
    out.sort = [...document.querySelectorAll('#vocab-table-body tr')].slice(0, 3).map(tr => tr.querySelector('.td-ru').firstChild.textContent.trim());
    out.erste = [ws[0].ru, ws[3].ru].sort((x, y) => x.localeCompare(y, 'ru')); out.dritte = ws[1].ru;
    out.th = document.querySelector('#overlay-vocab thead th:nth-child(4)').title;
    out.kontrast = (() => { const parse = c => c.match(/\d+(\.\d+)?/g).map(Number); const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const up = document.querySelector('.runs-up'), s = getComputedStyle(up); const a = lum(parse(s.color)), b2 = lum(parse(s.backgroundColor)); return +((Math.max(a, b2) + .05) / (Math.min(a, b2) + .05)).toFixed(2); })();
    return out;
  });
  ok('Stufe abgelaufen: „↑ jetzt“ mit Hinweis auf die nächste Stufe', r.a.up === '↑ jetzt' && /auf 2 von 5/.test(r.a.upTitle) && r.d.up === '↑ jetzt' && /auf 5 von 5/.test(r.d.upTitle), JSON.stringify([r.a, r.d]));
  ok('Wartezeit läuft: „ab <Datum>“ mit genauer Zeit im Hinweis, kein ↑', !r.b.up && r.b.wait === r.datum && /ab \d\d\.\d\d\.\d{4}/.test(r.b.waitTitle), JSON.stringify([r.b, r.datum]));
  ok('Sicher (5/5) und ungeübt: kein Hinweis', !r.c.up && !r.c.wait && !r.e.up && !r.e.wait, JSON.stringify([r.c, r.e]));
  ok('Sortierung „Nächste Stufe: jetzt möglich zuerst“', r.sort.slice(0, 2).join() === r.erste.join() && r.sort[2] === r.dritte, JSON.stringify([r.sort, r.erste, r.dritte]));
  ok('Spaltenkopf „Stand“ erklärt die Zeichen; Markierung lesbar (≥ 4,5 : 1)', /↑ jetzt/.test(r.th) && r.kontrast >= 4.5, r.kontrast + ' · ' + r.th);
  // Handy: nur der Pfeil
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { const L = loadLifetime(), now = Date.now(); const w = getAllWordsOfCat('Wohnen')[0]; L.v[getKey(w)] = { c: 1, w: 0, mb: 1, l: now - 9e8, z: now, d: 1, dd: now - 2 * 864e5 }; saveLifetime();
    setAppView('vocab'); selectWholeCat('Wohnen'); openVocabList(); const up = document.querySelector('#vocab-table-body .runs-up');
    return { sichtbar: !!up && up.getClientRects().length > 0, text: up && up.innerText.trim(), ueber: document.documentElement.scrollWidth - innerWidth }; });
  ok('Handy: Pfeil sichtbar, ohne Text, kein Überlauf', h.sichtbar && h.text === '↑' && h.ueber <= 0, JSON.stringify(h));
  await ctx.close();
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
