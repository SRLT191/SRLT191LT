const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Zahl + Substantiv (12.11.): Zahl vor dem Feld, Regel als Hilfe, drei Formen danach, Runden nach Lernstand,
// 4 Regelfälle (Gesamtzahl), Punkte, Rundenende nach Regelfall, Zahlbereich, Regelfälle wählbar,
// Zahl ausschreiben (один/одна/одно, два/две), Zählform + nur regelmäßige
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, st = numNounState;
    setAppView('grammar'); openNumNoun();
    const q = () => document.getElementById('numnoun-q');
    out.pre = document.getElementById('numnoun-pre').textContent === String(st.current.n);
    out.altText = !/Welche Form/.test(q().textContent) && !/\+/.test(q().querySelector('.case-prep').textContent);
    out.chip = q().querySelector('#numnoun-rule').style.display !== 'none';
    toggleNumNounHint(); out.chipAus = q().querySelector('#numnoun-rule').style.display === 'none'; toggleNumNounHint();
    // Regelfälle
    out.regel = [1, 21, 101, 2, 24, 1022, 5, 20, 100, 1000, 11, 14, 112, 1013].map(nnRule).join(',');
    // Runde: 15 Wörter, jedes einmal
    const runde = nnRunde(); out.runde = [runde.length, new Set(runde.map(x => x[0])).size];
    // nach dem Prüfen: drei Formen + Tabelle
    st.queue = [['стол', 'r24']]; restartNumNoun();
    document.getElementById('numnoun-input').value = 'стола'; checkNumNoun();
    out.nachher = document.getElementById('numnoun-result').textContent;
    out.knopf = !!document.querySelector('#numnoun-result button[onclick*="cfZurTabelle"]');
    out.dots = [document.querySelectorAll('#numnoun-dots .conj-dot').length, document.querySelectorAll('#numnoun-dots .conj-dot.fertig').length];
    // Gesamtzahl 4 je Wort
    updateGrammarTileProgress(); out.hdr = document.getElementById('gtp-numnoun').textContent; out.erw = numNounNouns().length * 4;
    // Zahlbereich
    setNumNounRange('gross'); out.gross = nnZahlen().every(n => n > 100); restartNumNoun(); out.grossTask = st.current.n > 100;
    setNumNounRange('20'); out.bis20 = nnZahlen().every(n => n <= 20);
    // Regelfälle wählen
    setNumNounRule('r11'); setNumNounRule('r24');
    out.faelle = st.faelle; out.faellePool = nnRunde().every(x => x[1] === 'r11' || x[1] === 'r24');
    for (let i = 0; i < 10; i++) { gtRundeNeu('numnoun'); if (!['r11', 'r24'].includes(st.current.rule)) out.falschRegel = st.current.n; }
    setNumNounRule('all');
    // Zahl ausschreiben
    toggleNumNounWrite();
    out.write = [nnTask('мать', 1).answer, nnTask('окно', 1).answer, nnTask('стол', 21).answer, nnTask('мать', 2).answer, nnTask('окно', 2).answer, nnTask('стол', 100).answer, nnTask('мать', 33).answer];
    out.writeZahlen = nnZahlen().every(n => n <= 24 || (n >= 30 && n <= 34) || n === 100);
    st.queue = [['мать', 'r24']]; restartNumNoun();
    const a = st.current.answer; document.getElementById('numnoun-input').value = a; checkNumNoun(); out.writeOk = [a, st.lastCorrect];
    out.grossAus = document.querySelector('#nn-range-switcher [data-v="gross"]').disabled;
    toggleNumNounWrite();
    // Zählform
    out.zaehl = nnTask('человек', 5).answer + '|' + nnNachher(nnTask('человек', 5));
    toggleNumNounReg(); out.reg = nnRunde().every(x => x[0] !== 'человек' && !isIrregularNoun(x[0])); toggleNumNounReg();
    // Rundenende gruppiert
    gtRundeNeu('numnoun');
    for (let i = 0; i < 15; i++) { document.getElementById('numnoun-input').value = 'xx'; checkNumNoun(); nextNumNoun(); }
    out.ende = (q().querySelector('.gt-fehler-gruppen') || {}).textContent || '';
    gtRundeNeu('numnoun');
    return out;
  });
  ok('Zahl vor dem Feld, kein „20 + мать“ und kein Standardsatz', r.pre && r.altText);
  ok('Regel als Hilfe-Abzeichen, abschaltbar', r.chip && r.chipAus);
  ok('Regelfälle: 1/21/101 · 2/24/1022 · 5/20/100/1000 · 11/14/112/1013', r.regel === 'r1,r1,r1,r24,r24,r24,r5,r5,r5,r5,r11,r11,r11,r11', r.regel);
  ok('Runde nach Lernstand: 15 verschiedene Wörter', r.runde[0] === 15 && r.runde[1] === 15, JSON.stringify(r.runde));
  ok('danach: 1 стол · 2 стола · 5 столов + In Deklination öffnen', /1 стол · 2 стола · 5 столов/.test(r.nachher) && r.knopf, r.nachher);
  ok('Punkte: 4 Regelfälle, einer erledigt', r.dots[0] === 4 && r.dots[1] === 1, JSON.stringify(r.dots));
  ok('Gesamtzahl: 4 Regelfälle je Wort', r.hdr.endsWith('von ' + r.erw + ' gelernt'), r.hdr);
  ok('Zahlbereich: große Zahlen > 100, bis 20', r.gross && r.grossTask && r.bis20);
  ok('Regelfälle wählbar (r24,r11)', r.faelle === 'r24,r11' && r.faellePool && !r.falschRegel, JSON.stringify([r.faelle, r.falschRegel]));
  ok('Zahl ausschreiben: одна мать, одно окно, двадцать один стол, две матери, два окна, сто столов, тридцать три матери',
    r.write.join('|') === 'одна мать|одно окно|двадцать один стол|две матери|два окна|сто столов|тридцать три матери' && r.writeZahlen && r.writeOk[1] && r.grossAus, r.write.join('|') + ' ' + JSON.stringify(r.writeOk));
  ok('Zählform пять человек mit Hinweis; nur regelmäßige lässt sie weg', /^человек\|.*Zählform/.test(r.zaehl) && r.reg, r.zaehl.slice(0, 120));
  ok('Rundenende nach Regelfall gruppiert', /Fehler/.test(r.ende), r.ende);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
