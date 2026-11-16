const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Gesamtprüfung 16.11. – Wortgruppen und Satzbau: deutsche Genus-Einträge für alle Substantive,
// Ordnungszahlen ohne „erstee“, keine Ordnungszahlen bei Zahl + Adjektiv + Substantiv, Körperteile nur mit zwei,
// schwache Maskulina (dem Nachbarn), engere Passung Adjektiv–Substantiv, на кухне, среди nur bei лес/поле
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {};
    out.fehlend = Object.keys(nounDeclensionData).filter(n => nounHas(n, 'sg') && nounHas(n, 'pl') && !WG_DE_NOUNS[n]);
    out.ohneKlasse = Object.keys(nounDeclensionData).filter(n => nounHas(n, 'sg') && nounHas(n, 'pl') && !WG_NOUN_CLASS[n]);
    out.ordinal = [...WG_ORDINALS].map(a => wgDeAdj(a, 'm', 'Nom', false, 'стол')).filter(x => /ee$/.test(x));
    out.nachbar = wgGermanNP({ adj: 'умный', noun: 'сосед', number: 'sg', kasus: 'Dat' });
    out.freund = wgGermanNP({ noun: 'друг', number: 'sg', kasus: 'Nom' });
    out.kirche = wgGermanNP({ det: 'мой', noun: 'церковь', number: 'sg', kasus: 'Nom' });
    // alle Generatoren der Wortgruppen viele Male: kein „ee“, kein „das“ vor maskulinen/femininen Wörtern
    setAppView('grammar'); openWordgroup(); wgState.pairs = buildWordgroupPairs();
    const schlecht = [], zahl = [];
    ['adjnoun', 'detnoun', 'prepphrase', 'numadjnoun'].forEach(t => ['sg', 'pl'].forEach(num => {
      wgState.type = t; wgState.number = num; wgState.caseScope = 'all';
      for (let i = 0; i < 300; i++) {
        const x = (WG_BUILDERS[t] || WG_BUILDERS.np)(null); const de = String(x.promptDe || '');
        if (/\Bt(?:e|ee)e[nmrs]?\b/.test(de) && !/\bTee\b/.test(de)) schlecht.push(de);
        if (t === 'numadjnoun') {
          const adj = x.promptTop.split(' + ')[1].split(' ')[0], noun = x.promptTop.split(' ').pop();
          if (WG_ORDINALS.has(adj) || (WG_NOUN_CLASS[noun] === 'K' && !/^(два|две) /.test(x.answer))) zahl.push(x.answer);
        }
      }
    }));
    out.schlecht = [...new Set(schlecht)].slice(0, 5); out.zahl = [...new Set(zahl)].slice(0, 5);
    out.fits = [['толстый', 'семья'], ['тёмный', 'праздник'], ['простой', 'вода'], ['сладкий', 'яйцо'], ['тяжёлый', 'билет'], ['низкий', 'школа'], ['маленький', 'урок'], ['иностранный', 'дочь'], ['десятый', 'мама'], ['горячий', 'яблоко']]
      .filter(([a, n]) => wgFits(a, n));
    out.gut = [['большой', 'семья'], ['хороший', 'семья'], ['умный', 'сосед'], ['тёмный', 'ночь'], ['первый', 'студент']].filter(([a, n]) => !wgFits(a, n));
    out.kueche = SB_ORTE['кухня'][0];
    out.sredi = PREP_SATZ['среди:Gen.'][0].n.join(' ');
    out.sb = ['Ich bin müde.', 'Wir haben Hunger.', 'Sie kennen den kurzen Weg.', 'Ihr kennt die richtige Antwort.', 'Ihr könnt das Fenster öffnen.'].filter(d => !SB_ITEMS.some(i => i.de === d));
    out.aspekt = ASPECT_SATZ.find(x => /уже уехал/.test(x.ru)).correct;
    return out;
  });
  ok('alle Substantive der Wortgruppen haben deutsches Genus und Plural', !r.fehlend.length, r.fehlend);
  ok('alle Substantive der Wortgruppen haben eine Bedeutungsklasse', !r.ohneKlasse.length, r.ohneKlasse);
  ok('Ordnungszahlen ohne doppeltes e (der erste, nicht erstee)', !r.ordinal.length, r.ordinal);
  ok('schwache Maskulina: dem klugen Nachbarn', r.nachbar === 'dem klugen Nachbarn', r.nachbar);
  ok('der Freund, meine Kirche', r.freund === 'der Freund' && r.kirche === 'meine Kirche', [r.freund, r.kirche]);
  ok('erzeugte Wortgruppen ohne „-ee“', !r.schlecht.length, r.schlecht);
  ok('Zahl + Adj + Subst: keine Ordnungszahlen, Körperteile nur mit zwei', !r.zahl.length, r.zahl);
  ok('Unsinnige Paare ausgeschlossen (толстая семья, тяжёлый билет …)', !r.fits.length, r.fits);
  ok('Sinnvolle Paare bleiben (большая семья, умный сосед …)', !r.gut.length, r.gut);
  ok('Ort: на кухне', r.kueche === 'на', r.kueche);
  ok('Kasus-Drill среди nur mit лес/поле', r.sredi === 'лес поле', r.sredi);
  ok('Satzbau: deutsche Sätze korrigiert', !r.sb.length, r.sb);
  ok('Aspekt „Im Satz“: приезжал … уехал', r.aspekt === 'приезжал', r.aspekt);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
