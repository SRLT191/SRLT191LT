const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// B1-Paket 2 (15.11.): Aspektpaare „Im Satz“, Satzbau Nebensatz/Indirekte Rede, Bewegungsverben übertragen,
// Ordnungszahlen in der Adjektiv-Deklination, Partizip-Kurzform in Kurzform & Steigerung.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, taste = k => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    setAppView('grammar'); GRAMMAR_PANEL_OPENERS.aspect(); setAspectMode('satz');
    const it = ASPECT_SATZ_CHOICE.item();
    out.asp = [ASPECT_SATZ.length, ASPECT_SATZ.filter(x => x.lvl === 'C1').length, aspectState.sQueue.length, document.querySelectorAll('#aspect-s-opts .case-opt').length, document.getElementById('aspect-satz').style.display === ''];
    taste(it.correct === it.a ? '1' : '2');
    out.aspAntw = [ASPECT_SATZ_CHOICE.answered, aspectState.sCorrect, /Richtig/.test(document.getElementById('aspect-s-result').textContent)];
    setAspectMode('practice'); out.aspZurueck = document.getElementById('aspect-satz').style.display === 'none' && document.getElementById('aspect-practice').style.display === '';
    // Satzbau
    GRAMMAR_PANEL_OPENERS.sentencebuild(); setWgType('nebensatz');
    out.sb = [SB_ITEMS.filter(i => i.type === 'nebensatz').length, SB_ITEMS.filter(i => i.type === 'rede').length, wgState.type, (wgState.current || {}).answer || ''];
    const neb = SB_ITEMS.find(i => i.type === 'nebensatz' && /придёт ли/.test(i.ru));
    const t = WG_BUILDERS.fixed(neb); out.fest = [t.answer, (t.alternatives || t.alts || []).length || 0];
    setWgType('rede'); out.rede = (wgState.current || {}).answer || '';
    // Bewegungsverben
    out.motion = [MOTION_PREFIX.length, MOTION_PREFIX.filter(x => x.bed).length, MOTION_PREFIX.filter(x => x.bed).every(x => x.opts.includes(x.correct) && new Set(x.opts).size === 4)];
    // Ordnungszahlen
    out.ord = ['первый', 'второй', 'третий', 'восьмой', 'десятый'].map(w => !!declensionData[w]).every(Boolean) && declensionData['третий'].fem['Akk.'] === 'третью' && declensionData['второй'].masc['Gen.'] === 'второго';
    out.ordWg = !!WG_ADJ_FIT['пятый'];
    // Partizip-Kurzform
    GRAMMAR_PANEL_OPENERS.adjform(); setAdjFormScope('ppp');
    const c = adjFormState.current;
    out.ppp = [c.typ, /Partizip-Kurzform/.test(c.task), /Partizip von/.test(c.de), adjFormItems().filter(x => x.typ === 'ppp').length];
    setAdjFormScope('all'); const typen = new Set(); for (let i = 0; i < 300; i++) typen.add(buildAdjFormTask().typ); out.alleOhne = !typen.has('ppp');
    out.stufen = ['#aspect-mode-satz', '#sb-type-nebensatz', '#sb-type-rede', '#adjform-scope-ppp'].map(x => document.querySelector(x).dataset.lvl).join();
    return out;
  });
  ok('Aspektpaare „Im Satz“: 14 Sätze (2 C1), Runde, zwei Antworten', r.asp[0] === 14 && r.asp[1] === 2 && r.asp[2] === 14 && r.asp[3] === 2 && r.asp[4], JSON.stringify(r.asp));
  ok('Aspektpaare „Im Satz“: Taste 1/2 wählt, richtig gezählt, Regel angezeigt', r.aspAntw[0] && r.aspAntw[1] === 1 && r.aspAntw[2], JSON.stringify(r.aspAntw));
  ok('Zurück zu „Üben“ blendet den Satzmodus aus', r.aspZurueck);
  ok('Satzbau: 12 Nebensätze, 4 Sätze indirekte Rede, Aufgabe kommt', r.sb[0] === 12 && r.sb[1] === 4 && r.sb[2] === 'nebensatz' && r.sb[3].length > 5, JSON.stringify(r.sb));
  ok('Nebensatz mit ли: feste Wortstellung', r.fest[0] === 'Я не знаю, придёт ли он' || /придёт ли он/.test(r.fest[0]), JSON.stringify(r.fest));
  ok('Indirekte Rede: Aufgabe kommt', r.rede.length > 5, r.rede);
  ok('Bewegungsverben „Vorsilben“: 4 Sätze mit übertragener Bedeutung, 4 verschiedene Formen', r.motion.join() === '14,4,true', JSON.stringify(r.motion));
  ok('Ordnungszahlen первый–десятый in der Adjektiv-Deklination, третий mit Sonderformen, Wortgruppen-Klasse', r.ord && r.ordWg);
  ok('Kurzform & Steigerung „Partizip-Kurzform“: 32 Aufgaben, nicht unter „Alle“', r.ppp.join() === 'ppp,true,true,32' && r.alleOhne, JSON.stringify(r.ppp));
  ok('Stufen: Im Satz B1, Nebensatz B1, Indirekte Rede B2, Partizip-Kurzform B2', r.stufen === 'B1,B1,B2,B2', r.stufen);
  ok('Keine JS-Fehler', !errs.length, errs.join(' | '));
  await b.close();
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  const n = R.filter(x => x[0] === 'OK ').length; console.log('\n' + n + ' von ' + R.length + ' bestanden');
  process.exit(n === R.length ? 0 : 1);
})();
