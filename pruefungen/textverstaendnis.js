const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Textverständnis (14.11.): fünfte Ansicht mit Texten nach Sprachniveau, Satz für Satz übersetzen, selbst bewerten.
// Die App enthält (noch) keine oder nur bestätigte Texte – geprüft wird mit zwei eingesetzten Probetexten.
const { chromium } = require('playwright');
const PROBE = `TEXTE.length = 0; TEXTE.push(
  { id: 'probe-b', lvl: 'B1', titel: 'Вторая проба', de: 'Zweite Probe', saetze: [{ ru: 'Один.', de: 'Eins.' }] },
  { id: 'probe-a', lvl: 'A1', titel: 'Проба <b>', de: 'Probe <img src=x onerror=window.__xss=1>', saetze: [
    { ru: 'Это первое предложение.', de: 'Das ist der erste Satz.' }, { ru: 'Это второе предложение.', de: 'Das ist der zweite Satz.' },
    { ru: 'А это новый абзац.', de: 'Und das ist ein neuer Absatz.', p: true }] });`;
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const a = await p.evaluate(() => {
    const out = {};
    out.knopf = [...document.querySelectorAll('#view-switcher .mode-btn')].map(x => x.id.replace('view-btn-', '')).join();
    out.daten = TEXTE.every(t => t.id && LEVELS.includes(t.lvl) && t.titel && t.de && Array.isArray(t.saetze) && t.saetze.length && t.saetze.every(s => s.ru && s.de && LEVELS.indexOf(sentenceLevel(s.ru)) <= LEVELS.indexOf(t.lvl))) && new Set(TEXTE.map(t => t.id)).size === TEXTE.length;
    document.getElementById('view-btn-reading').click();
    out.ansicht = [appView, document.getElementById('reading-view').style.display !== 'none', document.getElementById('inner').style.display, document.getElementById('view-btn-reading').classList.contains('active'), document.body.dataset.view];
    out.leer = TEXTE.length ? 'x' : (document.querySelector('.rd-leer') || {}).textContent;
    return out;
  });
  ok('Fünf Bereiche: Heute, Vokabeln, Grammatik, Hören, Textverständnis', a.knopf === 'home,vocab,grammar,listening,reading', a.knopf);
  ok('Ansicht öffnet, andere Bereiche sind aus, Knopf markiert', a.ansicht.join() === 'reading,true,none,true,reading', a.ansicht.join());
  ok('Eingetragene Texte vollständig (Kennung, Stufe, Titel, Sätze mit Übersetzung), kein Satz über der Stufe des Texts, Kennungen eindeutig', a.daten);
  ok('Ohne Texte steht ein Hinweis statt einer leeren Fläche', a.leer === 'x' || /Noch keine Texte/.test(a.leer), a.leer);
  const r = await p.evaluate(probe => {
    const out = {}; eval(probe); const gesprochen = []; window.speak = t => gesprochen.push(t);
    const body = document.getElementById('reading-body'), taste = (key, ziel, extra) => (ziel || document.body).dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, extra || {})));
    renderReading();
    out.liste = [...body.querySelectorAll('.rd-stufe .lvl-badge, .rd-card-t')].map(x => x.textContent).join('|');
    out.xss = [!window.__xss, body.querySelectorAll('img, b').length, /Probe <img/.test(body.querySelector('.rd-card-de').textContent)];
    out.neu = body.querySelector('.rd-card-st').textContent;
    body.querySelector('.rd-card').click();
    out.offen = [readState.id, body.querySelectorAll('.rd-text p').length, body.querySelectorAll('.rd-s').length, body.querySelector('.rd-s.cur').textContent, body.querySelector('.rd-cur').textContent.trim(), !!document.getElementById('rd-muster'), body.querySelector('.rd-nr').textContent];
    const feld = document.getElementById('rd-input'); feld.value = 'Mein <i>Versuch</i>'; feld.dispatchEvent(new Event('input', { bubbles: true }));
    taste('1', feld); out.zifferImFeld = readState.offen === false && !('0' in ((loadReading()['probe-a'] || {}).s || {}));
    taste('Enter', feld, { shiftKey: true }); out.umschalt = readState.offen;
    taste('Enter', feld);
    out.gezeigt = [readState.offen, document.getElementById('rd-muster').textContent, /Mein <i>Versuch<\/i>/.test(body.querySelector('.rd-loesung').textContent), body.querySelectorAll('.rd-loesung i').length, !!document.getElementById('rd-input')];
    taste('1'); const m1 = loadReading()['probe-a'];
    out.gewusst = [m1.s[0], readState.i, readState.offen, body.querySelector('.rd-s[data-i="0"]').classList.contains('ok'), document.getElementById('rd-prog').textContent, m1.d];
    taste('3'); taste('2'); out.nicht = [loadReading()['probe-a'].s[1], readState.i, body.querySelector('.rd-s[data-i="1"]').classList.contains('no')];
    taste('4'); out.vorlesen = gesprochen.join();
    body.querySelector('.rd-s[data-i="0"]').click(); out.sprung = [readState.i, readState.offen]; readWeiter(); out.weiter = readState.i;
    document.getElementById('rd-ganz-btn').click(); out.ganz = [body.querySelectorAll('#rd-ganz p').length, /Das ist der erste Satz\. Das ist der zweite Satz\./.test(document.getElementById('rd-ganz').textContent), document.getElementById('rd-ganz-btn').getAttribute('aria-pressed')];
    gesprochen.length = 0; readSpeakAll(); out.alles = gesprochen[0];
    readZeigen(); readRate(true); const m2 = loadReading()['probe-a'];
    out.ende = [readState.ende, m2.d, /Text gelesen/.test(body.textContent), /2 von 3 Sätzen gewusst/.test(body.textContent), body.querySelectorAll('.rd-fehler li').length, !!body.querySelector('.rd-s.cur')];
    taste('1'); taste('Enter'); out.endeTasten = readState.ende;
    readWiederholen(); out.wdh = [readState.i, Object.keys(loadReading()['probe-a'].s).join(), readState.ende];
    readZeigen(); readRate(true); out.wdhEnde = [readState.ende, loadReading()['probe-a'].d, body.querySelectorAll('.rd-fehler li').length];
    closeText(); out.zurueck = [readState.id, body.querySelector('.rd-card[data-id="probe-a"] .rd-card-st').textContent, body.querySelector('.rd-card-st.fertig') !== null, body.querySelector('#reading-list .rd-prog').textContent];
    openText('probe-a'); readNeu(); out.neuStart = [Object.keys(loadReading()['probe-a'].s).length, loadReading()['probe-a'].d, readState.i];
    readZeigen(); readRate(true); closeText(); out.teil = body.querySelector('.rd-card[data-id="probe-a"] .rd-card-st').textContent;
    openText('probe-a'); out.fortsetzen = readState.i;
    setMyLevel('A2'); closeText(); out.ausblick = [...body.querySelectorAll('.rd-stufe')].map(h => !!h.querySelector('.rd-ausblick')).join(); setMyLevel('');
    // Startseite und Zusammenführen
    out.zuletzt = [viewTimes().last, homeGoLabel(), /Textverständnis/.test(homePlanText({}))];
    setAppView('home'); out.home = /Textverständnis/.test(document.getElementById('home-view').textContent);
    homeContinue(); out.weiterlernen = appView;
    const alt = JSON.stringify({ 'probe-a': { s: { 0: 0 }, z: 5, d: 4 }, 'probe-x': { s: { 0: 1 }, z: 9, d: 1 } }), lokal = localStorage.getItem(READING_KEY);
    const z = JSON.parse(mergeBackupValue(READING_KEY, lokal, alt));
    out.merge = [z['probe-a'].d, Object.keys(z['probe-a'].s).length, !!z['probe-x'], mergeBackupValue(READING_KEY, lokal, '"kaputt"'), mergeBackupValue(READING_KEY, mergeBackupValue(READING_KEY, lokal, alt), alt) === mergeBackupValue(READING_KEY, lokal, alt)];
    out.schluessel = [BACKUP_KEYS.includes(READING_KEY), GH_SYNC_KEYS.includes(READING_KEY), BACKUP_KEYS.includes('vokabeltrainer-width-reading')];
    localStorage.setItem(READING_KEY, '{"probe-a":"<img src=x onerror=window.__xss=1>","__proto__":5,"probe-b":{"s":["x"],"z":"y","d":-3}}');
    setAppView('reading'); openText('probe-b'); out.kaputt = [!window.__xss, readState.id, JSON.stringify(loadReading()['probe-b'].s)];
    return out;
  }, PROBE);
  ok('Liste nach Stufe geordnet (A1 vor B1), Titel und Stand „neu“', r.liste === 'A1|Проба <b>|B1|Вторая проба' && /^neu/.test(r.neu), r.liste + ' ' + r.neu);
  ok('Texte werden als Text eingesetzt (kein HTML aus Titel oder Übersetzung)', r.xss[0] && r.xss[1] === 0 && r.xss[2], JSON.stringify(r.xss));
  ok('Text öffnet: Absätze, Sätze, erster Satz markiert, Übersetzung noch verdeckt', r.offen.join('|') === 'probe-a|2|3|Это первое предложение.|Это первое предложение.|false|Satz 1 von 3', r.offen.join('|'));
  ok('Im Feld: Ziffern bewerten nicht, Umschalt+⏎ zeigt nichts, ⏎ zeigt die Musterübersetzung neben der eigenen (als Text)', r.zifferImFeld && !r.umschalt && r.gezeigt[0] && r.gezeigt[1] === 'Das ist der erste Satz.' && r.gezeigt[2] && r.gezeigt[3] === 0 && !r.gezeigt[4], JSON.stringify([r.zifferImFeld, r.umschalt, r.gezeigt]));
  ok('Taste 1 = gewusst: gespeichert, Satz markiert, weiter zum nächsten', r.gewusst.join('|') === '1|1|false|true|1 von 3 Sätzen|0', r.gewusst.join('|'));
  ok('Taste 3 zeigt, Taste 2 = nicht gewusst; Taste 4 liest den Satz', r.nicht.join() === '0,2,true' && r.vorlesen === 'А это новый абзац.', JSON.stringify([r.nicht, r.vorlesen]));
  ok('Satz antippen springt dorthin; „Überspringen“ geht zum nächsten offenen Satz', r.sprung.join() === '0,false' && r.weiter === 2, JSON.stringify([r.sprung, r.weiter]));
  ok('Ganze Übersetzung ein-/ausblendbar (absatzweise); ganzer Text wird vorgelesen', r.ganz[0] === 2 && r.ganz[1] && r.ganz[2] === 'true' && /первое.*второе.*абзац/.test(r.alles), JSON.stringify([r.ganz, r.alles]));
  ok('Abschluss: Ergebnis, nicht gewusste Sätze mit Übersetzung, „gelesen“ gezählt; Tasten bewerten dort nichts', r.ende.join() === 'true,1,true,true,1,false' && r.endeTasten, r.ende.join());
  ok('„Nicht gewusste wiederholen“ fragt nur diese; der Text zählt nicht doppelt als gelesen', r.wdh.join('|') === '1|0,2|false' && r.wdhEnde.join() === 'true,1,0', JSON.stringify([r.wdh, r.wdhEnde]));
  ok('Zurück zur Liste: Stand „gelesen“, Zähler oben', r.zurueck[0] === null && /gelesen/.test(r.zurueck[1]) && r.zurueck[2] && r.zurueck[3] === '1 von 2 gelesen', JSON.stringify(r.zurueck));
  ok('„Nochmal von vorn“ leert die Bewertungen (gelesen bleibt); angefangener Text zeigt „x von y Sätzen“ und setzt beim offenen Satz fort', r.neuStart.join() === '0,1,0' && /gelesen/.test(r.teil) && r.fortsetzen === 1, JSON.stringify([r.neuStart, r.teil, r.fortsetzen]));
  ok('Stufen über „Mein Niveau“ sind als „über deinem Niveau“ markiert', r.ausblick === 'false,true', r.ausblick);
  ok('Startseite: zuletzt geübt und „Weiterlernen“ führen ins Textverständnis', r.zuletzt[0] === 'reading' && r.zuletzt[1] === 'Проба <b>' && r.zuletzt[2] && r.home && r.weiterlernen === 'reading', JSON.stringify([r.zuletzt, r.home, r.weiterlernen]));
  ok('Zusammenführen: jüngerer Stand je Text, „gelesen“ das Höhere, fremde Texte bleiben, kaputte Datei abgewiesen, zweimal = einmal', r.merge.join() === '4,1,true,,true', r.merge.join());
  ok('Lesestand in Sicherung und GitHub-Abgleich, Breite gesichert', r.schluessel.every(Boolean), r.schluessel.join());
  ok('Beschädigter Lesestand: kein Fehler, nichts wird ausgeführt', r.kaputt[0] && r.kaputt[1] === 'probe-b' && r.kaputt[2] === '{}', JSON.stringify(r.kaputt));
  // Neuladen: Ansicht kommt nicht von selbst zurück (Start auf „Heute“), Lesestand bleibt
  await p.evaluate(() => { localStorage.setItem(READING_KEY, JSON.stringify({ 'probe-a': { s: { 0: 1 }, z: 7, d: 2 } })); });
  await p.reload(); await p.waitForTimeout(400);
  const n = await p.evaluate(probe => { eval(probe); const s = readingStand(readingText('probe-a')); return [appView, s.bew, s.d]; }, PROBE);
  ok('Nach dem Neuladen: Start auf „Heute“, Lesestand erhalten', n.join() === 'home,1,2', n.join());
  for (const w of [320, 360]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 700 }, isMobile: true, hasTouch: true }); const m = await ctx.newPage(); m.on('pageerror', e => errs.push(e.message));
    await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
    const h = await m.evaluate(probe => { eval(probe); setAppView('reading'); const o = []; o.push(document.documentElement.scrollWidth - innerWidth);
      openText('probe-a'); o.push(document.documentElement.scrollWidth - innerWidth); readZeigen(); o.push(document.documentElement.scrollWidth - innerWidth);
      const kn = [...document.querySelectorAll('#view-switcher .mode-btn')], R = x => x.getBoundingClientRect();
      o.push(kn.length, kn.every(k => { const sp = [...k.querySelectorAll('span')].find(s => getComputedStyle(s).display !== 'none'); return sp.scrollWidth <= k.clientWidth + 1; }), kn[4].textContent.trim().replace(/\s+/g, ' '), getComputedStyle(kn[4].querySelector('.vs-lang')).display,
        Math.round(R(document.querySelector('.gt-rate-yes')).height) >= 36, document.activeElement.tagName);
      return o; }, PROBE);
    ok('Handy ' + w + ' px: kein Überlauf, fünf Knöpfe unten passen („Texte“), Bewertungsknöpfe groß genug, Tastatur springt nicht auf', h[0] <= 0 && h[1] <= 0 && h[2] <= 0 && h[3] === 5 && h[4] && h[6] === 'none' && h[7] && h[8] !== 'TEXTAREA', JSON.stringify(h));
    await ctx.close();
  }
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
