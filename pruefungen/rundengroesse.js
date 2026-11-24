// Rundengröße (24.11.): eine Einstellung unter Einstellungen → Üben für alle Werkzeuge mit Runden
// (Hörquiz, Satzdiktat, Grammatik): 10 · 15 · 25 · 50 · alle, Standard 15, gilt ab der nächsten Runde, in der Sicherung.
// „alle“ = alle offenen Aufgaben (sind keine offen: alle); frei erzeugte Aufgaben laufen bis „Runde beenden“ im ⋯-Menü.
const { chromium } = require('playwright');
const path = require('path');
let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 500) : '')); } };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const fehlerJs = []; page.on('pageerror', e => fehlerJs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(400);

  const e = await page.evaluate(() => {
    const sel = document.getElementById('roundsize-select');
    return { opts: sel ? [...sel.options].map(o => o.value + ':' + o.textContent.trim()) : null, wert: sel && sel.value, size: roundSize,
      bereich: sel && sel.closest('[data-sec], .settings-section, section') ? (sel.closest('[data-sec]') || {}).dataset?.sec || null : null,
      sicherung: BACKUP_KEYS.includes('vokabeltrainer-round-size') };
  });
  ok('Einstellung Rundengröße mit 10 · 15 · 25 · 50 · alle, Standard 15', e.opts && e.opts.join('|') === '10:10 Aufgaben|15:15 Aufgaben|25:25 Aufgaben|50:50 Aufgaben|0:alle' && e.wert === '15' && e.size === 15, e);
  ok('Rundengröße steht in der Sicherung', e.sicherung);

  // misst alle Rundenwerkzeuge bei einer Rundengröße (Lernstand leer)
  const messen = v => page.evaluate(v => {
    setRoundSize(v);
    const r = {};
    restartGender(); r.gender = [genderState.queue.length, genderScopePool().length];
    restartRektion(); r.rektion = [rektionState.queue.length, rektionPool(rektionState.mode).length];
    caseState.mode = 'choose'; restartCaseDrill(); r.kasus = [caseState.queue.length, caseScopePool().length];
    restartTransform(); r.umformen = [transformState.queue.length];
    restartAspectSatz(); r.aspektSatz = [aspectState.sQueue.length, ASPECT_SATZ.length];
    restartMotionQuiz(); r.bewegungWahl = [motionState.queue.length, MOTION_QUIZ.length];
    restartMotionPrefix(); r.bewegungVorsilben = [motionState.pQueue.length, MOTION_PREFIX.length];
    restartHearquiz(true); r.hoerquiz = [hqState.runde.length, hqState.pool.length];
    if (!dictState.pool) dictState.pool = buildDictationPool(); dictNeueRunde(); r.diktat = [dictState.runde.length];
    gtRundeNeu('pronform'); r.pronform = [GT_RUNDEN.pronform.rs.len];
    gtRundeNeu('cf'); r.kasusBilden = [GT_RUNDEN.cf.rs.len];
    return r;
  }, v);

  for (const v of [10, 25]) {
    const r = await messen(v);
    const falsch = Object.entries(r).filter(([k, x]) => x[0] !== Math.min(v, x[1] === undefined ? v : x[1]));
    ok('Rundengröße ' + v + ' in allen Rundenwerkzeugen', !falsch.length, falsch);
  }

  const a = await messen(0);
  ok('„alle“: Geschlecht, Rektion, Kasus-Drill, Aspekt im Satz, Bewegungsverben, Hörquiz nehmen alle (Lernstand leer = alle offen)',
    ['gender', 'rektion', 'kasus', 'aspektSatz', 'bewegungWahl', 'bewegungVorsilben', 'hoerquiz'].every(k => a[k][0] === a[k][1]) && a.hoerquiz[0] > 25, a);
  ok('„alle“: Kasus bilden (feste Liste) endet nach allen offenen Wörtern', isFinite(a.kasusBilden[0]) && a.kasusBilden[0] > 25, a.kasusBilden);
  ok('„alle“: Pronomen umformen (frei gebildet) läuft offen', a.pronform[0] === null || !isFinite(a.pronform[0]), a.pronform);

  // „Runde beenden“ nur bei „alle“ sichtbar und schließt mit Ergebnis ab
  const b = await page.evaluate(() => {
    gtMenueErgaenzen();
    const knopf = [...document.querySelectorAll('.gt-runde-beenden')].find(x => /'pronform'/.test(x.getAttribute('onclick')));
    const sichtbarAlle = knopf && getComputedStyle(knopf).display !== 'none';
    const R = GT_RUNDEN.pronform; gtRundeNeu('pronform');
    gtRundeWeiter('pronform', pronFormState.current, false); restartPronForm();
    gtRundeWeiter('pronform', pronFormState.current, true); restartPronForm();
    const zaehler = document.getElementById(R.score).textContent;
    gtRundeBeenden('pronform');
    const ende = { ende: R.rs.ende, n: R.rs.n, richtig: R.rs.richtig, html: /Fehler wiederholen/.test(document.getElementById(R.q).innerHTML) };
    setRoundSize(15);
    const sichtbar15 = knopf && getComputedStyle(knopf).display !== 'none';
    return { da: !!knopf, sichtbarAlle, sichtbar15, zaehler, ende };
  });
  ok('„Runde beenden“ im ⋯-Menü nur bei „alle“ sichtbar', b.da && b.sichtbarAlle && !b.sichtbar15, b);
  ok('Zähler bei „alle“ ohne Gesamtzahl („3 · 1 richtig“)', /^3 · 1 richtig$/.test(b.zaehler), b.zaehler);
  ok('„Runde beenden“ zeigt das Rundenende mit den bisherigen Aufgaben', b.ende.ende && b.ende.n === 2 && b.ende.richtig === 1 && b.ende.html, b.ende);

  // gemerkt nach Neuladen, Kurzfassung nennt die Rundengröße
  await page.evaluate(() => setRoundSize(25));
  await page.reload(); await page.waitForTimeout(400);
  const nach = await page.evaluate(() => { updateSettingsSummaries(); return { size: roundSize, wert: document.getElementById('roundsize-select').value,
    kurz: (document.getElementById('set-sum-ueben') || {}).textContent }; });
  ok('Rundengröße bleibt nach dem Neuladen, Kurzfassung nennt sie', nach.size === 25 && nach.wert === '25' && /Runde 25 Aufgaben/.test(nach.kurz || ''), nach);

  // ungültiger gespeicherter Wert → Standard
  await page.evaluate(() => localStorage.setItem('vokabeltrainer-round-size', '7'));
  await page.reload(); await page.waitForTimeout(400);
  ok('ungültiger gespeicherter Wert ergibt 15', await page.evaluate(() => roundSize) === 15);

  ok('keine JS-Fehler', !fehlerJs.length, fehlerJs);
  console.log(n - fehler + ' von ' + n + ' bestanden');
  await browser.close();
  process.exit(fehler ? 1 : 0);
})();
