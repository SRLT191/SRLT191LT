const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Gesamtprüfung 16.11. – Hinweistexte der Grammatik: sieben Konjugationshinweise sachlich richtig,
// помочь mit „aber“, синий ohne doppeltes ы→и, Rektion говорить mit „Russisch о + Präp.“, Bewegungsverben-Hilfe nennt die drei Verben ohne Tabelle
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const n = v => conjugationData[v].nonPastNote;
    const falsch = Object.entries({ 'смотреть': /т→тр/, 'брать': /р→р/, 'искать': /1\. Person/, 'жить': /т→в/, 'лежать': /г→ж/, 'ждать': /д→жд/, 'волноваться': /в→вл/ })
      .filter(([v, re]) => re.test(n(v))).map(([v]) => v);
    const beispiele = [['смотреть', 'смотрю'], ['брать', 'беру'], ['искать', 'ищешь'], ['жить', 'живу'], ['лежать', 'лежу'], ['ждать', 'жду'], ['волноваться', 'волнуюсь']]
      .filter(([v, f]) => !n(v).includes(f) || !Object.values(conjugationData[v].nonPast).includes(f)).map(([v]) => v);
    const pomoch = JSON.stringify(aspectData).includes('помогу, aber поможешь') && !JSON.stringify(aspectData).includes('но поможешь');
    const sinij = declensionData['синий'].note;
    const rk = RK_VERBS.find(x => x.v === 'говорить').dt;
    const hilfe = document.body.innerHTML.includes('außer лазить, таскать und ползать');
    return { falsch, beispiele, pomoch, sinij, rk, hilfe };
  });
  ok('Konjugationshinweise ohne falschen Konsonantenwechsel', !r.falsch.length, r.falsch);
  ok('Hinweise nennen die richtigen Beispielformen aus der Tabelle', !r.beispiele.length, r.beispiele);
  ok('помочь: „aber“ statt „но“', r.pomoch);
  ok('синий: ы→и, о→е, а→я, у→ю', /ы→и, о→е, а→я, у→ю/.test(r.sinij), r.sinij);
  ok('Rektion говорить: Russisch о + Präp.', /Russisch о \+ Präp\./.test(r.rk), r.rk);
  ok('Bewegungsverben-Hilfe nennt die Verben ohne eigene Tabelle', r.hilfe);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
