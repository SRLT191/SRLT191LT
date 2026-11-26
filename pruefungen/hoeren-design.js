// Hörwerkzeuge, Design (26.11.): Kategorien im eigenen Fenster, große Bewertungsknöpfe (grün / rot, Tasten 1 / 2),
// Lösung mit großem russischem Wort, Fortschrittsbalken statt Zahlenkasten, „Langsam“ neben dem Anhören-Knopf,
// Tempo in den Einstellungen, Beispielsatz direkt in der Lösung, beschriftete Modus-Zeile – für Hörquiz, Satzdiktat, Hörtrainer.
const { chromium } = require('playwright');
const path = require('path');
let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 600) : '')); } };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 950 } });
  const fehlerJs = []; page.on('pageerror', e => fehlerJs.push(e.message));
  await page.addInitScript(() => { window.__spoken = []; try { window.speechSynthesis.speak = u => window.__spoken.push([u.text, u.rate]); } catch (e) {} });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(400);

  const a = await page.evaluate(() => {
    setAppView('listening'); showListeningPanel('hearquiz');
    const panel = document.getElementById('listening-hearquiz'), dlg = document.getElementById('overlay-hoercats');
    const box = dlg.querySelector('.overlay-box');
    return {
      dialog: box.getAttribute('role') === 'dialog' && !!box.getAttribute('aria-labelledby') && ['ht', 'hq', 'dict'].every(t => !!dlg.querySelector('[data-hc="' + t + '"]')),
      listenImDialog: ['hoertrainer-cat-body', 'hearquiz-cat-body', 'dict-cat-body'].every(id => dlg.contains(document.getElementById(id))),
      zeilen: ['ht', 'hq', 'dict'].every(t => !!document.getElementById(t + '-hc-btn') && !!document.getElementById(t + '-hc-sum')),
      kopf: !!panel.querySelector('.grammar-panel-header #hq-info-total') && !panel.querySelector('.hq-info'),
      score: getComputedStyle(document.getElementById('hearquiz-score')).display === 'none',
      tempoHq: document.getElementById('hq-optionen').contains(document.getElementById('hearquiz-speed-range')),
      tempoDict: document.getElementById('dict-optionen').contains(document.getElementById('dictation-speed-range')),
      langsam: !!document.getElementById('hq-slow-btn'),
      gruppen: [...panel.querySelectorAll('.hq-toolbar .hq-lang-lbl')].map(x => x.textContent),
      reihenfolge: !!(document.getElementById('hq-loesung').compareDocumentPosition(document.getElementById('hq-flip-actions')) & Node.DOCUMENT_POSITION_FOLLOWING)
        && !!(document.getElementById('hq-loesung').compareDocumentPosition(document.getElementById('hq-actions')) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  ok('Kategorien in einem eigenen Dialog (role, Titel), je Werkzeug ein Block, Listen nicht mehr in den Einstellungen', a.dialog && a.listenImDialog && a.zeilen, a);
  ok('Kennzahlen klein in der Kopfzeile, kein Zahlenkasten, keine doppelte „x von y richtig“-Zeile', a.kopf && a.score, a);
  ok('Tempo in den Einstellungen (Hörquiz, Satzdiktat), „Langsam“ neben „Anhören“', a.tempoHq && a.tempoDict && a.langsam, a);
  ok('Modus-Zeile beschriftet: „Art“ und „Antwort“', a.gruppen.join() === 'Art,Antwort', a.gruppen);
  ok('Lösung steht vor den Knöpfen', a.reihenfolge);

  // Dialog öffnen: nur der Block des Werkzeugs, Zeile nennt die Auswahl
  const d = await page.evaluate(() => {
    openHoerCats('hq');
    const dlg = document.getElementById('overlay-hoercats');
    const r = { offen: dlg.classList.contains('open'), titel: document.getElementById('hoercats-tool').textContent,
      sichtbar: [...dlg.querySelectorAll('[data-hc]')].filter(b => !b.hidden).map(b => b.dataset.hc) };
    setHearquizCats('keine'); dlg.querySelector('#hearquiz-cat-body input[data-cat="Zeit"]').click(); dlg.querySelector('#hearquiz-cat-body input[data-cat="Familie"]').click();
    r.sum = document.getElementById('hq-hc-sum').textContent;
    closeOverlay('overlay-hoercats'); r.zu = !dlg.classList.contains('open');
    openHoerCats('dict'); r.dict = [...dlg.querySelectorAll('[data-hc]')].filter(b => !b.hidden).map(b => b.dataset.hc).join(); r.dictTitel = document.getElementById('hoercats-tool').textContent;
    closeOverlay('overlay-hoercats');
    return r;
  });
  ok('Dialog zeigt nur die Liste des Werkzeugs, Auswahl gilt sofort, Zeile nennt sie', d.offen && d.titel === 'Hörquiz' && d.sichtbar.join() === 'hq' && /Zeit/.test(d.sum) && /Familie/.test(d.sum)
    && d.zu && d.dict === 'dict' && d.dictTitel === 'Satzdiktat', d);

  // Aufdecken: großes russisches Wort, Übersetzung darunter, Bewertungsknöpfe grün / rot mit Taste, Fortschrittsbalken
  const f = await page.evaluate(() => {
    setHearquizMode('flip'); setHearquizLang('de'); restartHearquiz(true);
    revealHearquizFlip(); rateHearquiz(true); revealHearquizFlip(); rateHearquiz(false); revealHearquizFlip();
    const ru = document.querySelector('#hq-flip-answer .hq-flip-ru'), de = document.querySelector('#hq-flip-answer .hq-flip-de');
    const knoepfe = [...document.querySelectorAll('#hq-flip-actions .rate-btn')];
    const bar = document.querySelectorAll('#hq-fort .hoer-fort-bar i');
    return { ru: ru && ru.textContent.includes(hqState.current.ru) && !!ru.querySelector('[lang="ru"]'), groesser: ru && de && parseFloat(getComputedStyle(ru).fontSize) > parseFloat(getComputedStyle(de).fontSize) + 6,
      schrift: ru && /Literata/.test(getComputedStyle(ru).fontFamily),
      knoepfe: knoepfe.map(b => [b.textContent.replace(/\s+/g, ' ').trim(), Math.round(b.getBoundingClientRect().height), getComputedStyle(b).backgroundColor]),
      bar: [...bar].map(i => i.style.width), zahl: document.querySelector('#hq-fort .hoer-fort-n').textContent, text: document.getElementById('hq-runde').textContent,
      kopf: document.getElementById('hq-info-right').textContent };
  });
  ok('Aufdecken: russisches Wort groß in Literata, Übersetzung darunter kleiner', f.ru && f.groesser && f.schrift, f);
  ok('Bewertungsknöpfe „Gewusst 1“ / „Nicht gewusst 2“, mindestens 44 px hoch, verschiedene Farben', f.knoepfe.length === 2 && /Gewusst 1/.test(f.knoepfe[0][0]) && /Nicht gewusst 2/.test(f.knoepfe[1][0])
    && f.knoepfe.every(k => k[1] >= 44) && f.knoepfe[0][2] !== f.knoepfe[1][2], f.knoepfe);
  ok('Fortschritt: „Wort 3 von 15“, Balken mit 1 richtig und 1 falsch, Kopfzeile 1/2', f.text === 'Wort 3 von 15' && f.zahl === '1 richtig · 1 falsch'
    && parseFloat(f.bar[0]) > 6 && parseFloat(f.bar[1]) > 6 && f.kopf === '1/2', f);

  // Tippen: Lösung mit Satz, nur ein Knopf „Satz anhören“; Selbstbewertung mit großen Knöpfen
  const t = await page.evaluate(() => {
    setHearquizMode('type'); restartHearquiz(true);
    let w = hqState.current, i = 0;
    while (!getWordSentence(w) && i++ < 14) { nextHearquiz(); w = hqState.current; }
    revealHearquiz();
    const l = document.getElementById('hq-loesung');
    return { knoepfe: [...l.querySelectorAll('button')].map(b => b.textContent.trim()), selbst: [...document.querySelectorAll('#hq-selbst .rate-btn')].length,
      sichtbar: document.getElementById('hq-selbst').style.display !== 'none' };
  });
  ok('Lösung mit nur einem Knopf „Satz anhören“, Selbstbewertung mit großen Knöpfen', t.knoepfe.join() === 'Satz anhören' && t.selbst === 2 && t.sichtbar, t);

  const l = await page.evaluate(() => { window.__spoken.length = 0; document.getElementById('hq-slow-btn').click(); return window.__spoken.slice(-1)[0]; });
  ok('„Langsam“ liest das Wort mit halbem Tempo', l && l[1] === 0.5, l);

  // Satzdiktat und Hörtrainer: Balken, große Bewertungsknöpfe
  const s = await page.evaluate(() => {
    showListeningPanel('dictation'); revealDictation();
    const r = { knoepfe: document.querySelectorAll('#dictation-selbst .rate-btn').length, text: document.getElementById('dictation-runde').textContent };
    dictSelbst(true);
    r.zahl = document.querySelector('#dictation-fort .hoer-fort-n').textContent;
    showListeningPanel('hoertrainer'); setAllHoertrainerCatCheckboxes(false); document.querySelector('#hoertrainer-cat-body input[data-cat="Familie"]').click(); startHoertrainer();
    r.ht = [document.getElementById('hoertrainer-progress').textContent, document.querySelector('#hoertrainer-fort .hoer-fort-bar i.ok').style.width];
    stopHoertrainer();
    return r;
  });
  ok('Satzdiktat: große Bewertungsknöpfe, Balken zählt mit', s.knoepfe === 2 && /^Satz \d+ von \d+$/.test(s.text) && s.zahl === '1 richtig', s);
  ok('Hörtrainer: Balken zeigt die Stelle in der Liste', /^Wort 1 von \d+$/.test(s.ht[0]) && parseFloat(s.ht[1]) > 0, s.ht);

  // Handy: Bewertungsknöpfe nebeneinander, nichts läuft über
  await page.setViewportSize({ width: 360, height: 760 });
  const h = await page.evaluate(() => {
    showListeningPanel('hearquiz'); setHearquizMode('flip'); restartHearquiz(true); revealHearquizFlip();
    const k = [...document.querySelectorAll('#hq-flip-actions .rate-btn')].map(b => b.getBoundingClientRect());
    return { nebeneinander: k.length === 2 && Math.abs(k[0].top - k[1].top) < 2, ueber: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  ok('Handy (360 px): Bewertungsknöpfe nebeneinander, kein waagerechter Überlauf', h.nebeneinander && !h.ueber, h);

  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
