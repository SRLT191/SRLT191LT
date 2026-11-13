const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// „Muster sitzt“ (12.11.): 10 verschiedene Wörter richtig → Muster sicher, übrige Formen zählen und werden ausgelassen;
// Fehler öffnet wieder; Schalter „Auch sichere Muster üben“; Wiederholung über Stufen; Sonderfälle einzeln
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, D = musterBauen(), hdr = id => { updateGrammarTileProgress(); return +/^(\d+) von/.exec(document.getElementById(id).textContent)[1]; };
    const day = () => (loadDaylog()[dayKey()] || [0, 0])[0];
    setAppView('grammar');
    // Kasus bilden Adjektive: hart · weiblich · Genitiv
    const mid = 'ca|hart|fem|Gen.', hart = Object.keys(declensionData).filter(a => declensionData[a].typeLabel === 'hart');
    out.need = [D.need[mid], D.anzahl[mid]];
    const d0 = day();
    for (let i = 0; i < 9; i++) progressMark('caseadj', 'a:' + hart[i] + ':fem:Gen.', true);
    progressMark('caseadj', 'a:' + hart[0] + ':fem:Gen.', true);   // dasselbe Wort noch einmal zählt nicht doppelt
    out.neun = [musterSicher(mid), hdr('gtp-caseadj'), day() - d0];
    progressMark('caseadj', 'a:' + hart[9] + ':fem:Gen.', true);
    out.zehn = [musterSicher(mid), hdr('gtp-caseadj'), musterGesperrt('caseadj', 'a:' + hart[20] + ':fem:Gen.'), musterGesperrt('caseadj', 'a:' + hart[20] + ':fem:Dat.')];
    // gesperrte Formen werden nicht mehr gezogen
    openCaseAdj(); let gezogen = 0; for (let i = 0; i < 1500; i++) { restartCaseForm('adj'); const t = caseAdjState.current; if (t && musterOf('caseadj', t.id) === mid) gezogen++; gtRundeNeu('ca'); }
    out.gezogen = gezogen;
    // Schalter
    out.knopf = !!document.querySelector('#overlay-caseadj .muster-alle-toggle') && /^Muster 1\//.test(document.querySelector('#overlay-caseadj .gt-muster').textContent);
    toggleMusterAlle(); out.alle = !musterGesperrt('caseadj', 'a:' + hart[20] + ':fem:Gen.'); toggleMusterAlle();
    // Startseite zählt die Formen des sicheren Musters mit
    out.home = srcEntries(grammarToolSources().caseadj, loadLifetime().g).length;
    // Fehler öffnet das Muster: 3 weitere Wörter nötig
    progressMark('caseadj', 'a:' + hart[30] + ':fem:Gen.', false);
    out.offen = [musterSicher(mid), (loadGrammarSrs().muster[mid].w || []).length];
    [31, 32, 33].forEach(i => progressMark('caseadj', 'a:' + hart[i] + ':fem:Gen.', true)); out.wieder = musterSicher(mid);
    // Wiederholung: fällig → nicht gesperrt
    const le = loadLifetime().g.muster[mid]; out.stufe = le.d; le.dd = Date.now() - 400 * 86400000;
    out.faellig = [musterFaellig(mid), musterGesperrt('caseadj', 'a:' + hart[20] + ':fem:Gen.')];
    // kleines Muster: alle Wörter nötig; Sonderfälle ohne Muster
    const klein = Object.keys(D.need).find(m => m.startsWith('ca|') && D.anzahl[m] === 1); out.klein = D.need[klein];
    out.sonder = [musterOf('caseform', 'n:отец:sg:Gen.'), musterOf('caseform', 'n:отец:pl:Dat.'), musterOf('caseform', 'n:стол:sg:Gen.'), musterOf('transform', 'past:идти'), musterOf('transform', 'past:читать:она'),
      musterOf('conj', 'читать'), musterOf('conj', 'писать'), musterOf('conj:past', 'читать'), musterOf('adjform', 'comp:новый'), musterOf('adjform', 'sup:новый'), musterOf('decl:fem', 'новый')];
    // Verben umformen: 10 regelmäßige Verben → alle übrigen zählen, Pool ohne sie
    const reg = Object.keys(conjugationData).filter(musterPastRegel), h0 = hdr('gtp-transform');
    reg.slice(0, 10).forEach(v => progressMark('transform', 'past:' + v + ':она', true));
    out.tf = [hdr('gtp-transform') - h0, reg.length];
    setTransformScope('past'); out.tfPool = transformPool().filter(t => t.pkey === 'она' && musterPastRegel(t.inf)).length;
    // Konjugieren: nächstes Verb überspringt sichere Klasse
    const k1 = Object.keys(conjugationData).filter(v => verbClassKey(v) === 'k1'); k1.slice(0, 10).forEach(v => progressMark('conj', v, true));
    openConjugate(); setConjTense('nonpast'); document.getElementById('conj-verb-select').value = k1[0]; nextConjugationVerb();
    out.cj = verbClassKey(document.getElementById('conj-verb-select').value);
    // Gesamtzahlen unverändert
    const s = grammarToolSources(); out.total = Object.keys(MUSTER_TOOLS).map(k => MUSTER_TOOLS[k]).every(t => s[t][4]().length === s[t][1]);
    out.keys = Object.values(s).some(x => x[0].includes('muster'));
    return out;
  });
  ok('Muster hart · weiblich · Genitiv: 10 von 65 Wörtern nötig', r.need[0] === 10 && r.need[1] === 65, JSON.stringify(r.need));
  ok('9 verschiedene Wörter (eins doppelt): noch nicht sicher, 9 gelernt, Tageszählung nur je Antwort', !r.neun[0] && r.neun[1] === 9 && r.neun[2] === 10, JSON.stringify(r.neun));
  ok('10. Wort: Muster sicher, alle 65 Formen zählen, übrige gesperrt (andere Fälle nicht)', r.zehn[0] && r.zehn[1] === 65 && r.zehn[2] && !r.zehn[3], JSON.stringify(r.zehn));
  ok('Formen des sicheren Musters werden nicht mehr gezogen', r.gezogen === 0, String(r.gezogen));
  ok('Schalter in der Leiste, Abzeichen „Muster 1/…“ in der Kopfzeile; Schalter hebt die Sperre auf', r.knopf && r.alle);
  ok('Startseite zählt die Formen des sicheren Musters mit', r.home >= 65, String(r.home));
  ok('Fehler öffnet das Muster (7 von 10), 3 weitere Wörter schließen es', !r.offen[0] && r.offen[1] === 7 && r.wieder, JSON.stringify(r.offen));
  ok('Wiederholung: fälliges Muster wird wieder gefragt', r.stufe >= 1 && r.faellig[0] && !r.faellig[1], JSON.stringify([r.stufe, r.faellig]));
  ok('kleine Muster brauchen alle Wörter; Sonderfälle zählen einzeln', r.klein === 1 && r.sonder[0] === null && /^cf\|Plural\|Dat\./.test(r.sonder[1]) && /^cf\|2\. Klasse/.test(r.sonder[2]) && r.sonder[3] === null && r.sonder[4] === 'tf|Vergangenheit|она'
    && /^cj\|Präsens/.test(r.sonder[5]) && r.sonder[6] === null && r.sonder[7] === 'cj|Vergangenheit' && r.sonder[8] === null && r.sonder[9] === 'af|Superlativ' && r.sonder[10] === 'dc|hart|fem', JSON.stringify(r.sonder));
  ok('Verben umformen: 10 regelmäßige Verben → alle regelmäßigen zählen, Pool ohne sie', r.tf[0] === r.tf[1] && r.tfPool === 0, JSON.stringify([r.tf, r.tfPool]));
  ok('Konjugieren: „Nächstes Verb“ überspringt die sichere 1. Konjugation', r.cj !== 'k1', r.cj);
  ok('Gesamtzahlen unverändert; „muster“ ist kein gezählter Schlüssel', r.total && !r.keys);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
