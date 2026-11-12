const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Satzbau (12.11.): Erklärung Wort für Wort nach der Antwort, Tipps bei falscher Form, Satzart „Ort / Richtung“,
// „Nur Deutsch“ groß mit Lautsprecher daneben, keine doppelte Lösung nach Wort-Tipps, Satzarten am Handy in einer Zeile
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1300, height: 850 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const out = {}; const txt = h => h.replace(/<[^>]+>/g, '');
    out.e1 = txt(sbErklaerung(['В', 'городе', 'нет', 'парка']));
    out.e2 = txt(sbErklaerung(['я', 'знаю', 'умного', 'студента']));
    out.e3 = txt(sbErklaerung(['мы', 'в', 'лесу']));
    out.e4 = txt(sbErklaerung(['я', 'покупаю', 'дешёвый', 'билет']));
    out.e5 = txt(sbErklaerung(['Не', 'берите', 'мою', 'книгу']));
    out.t = [sbTipps('В городе нет парк', ['В', 'городе', 'нет', 'парка']), sbTipps('я иду в школа', ['я', 'иду', 'в', 'школу']), sbTipps('я встречает весёлую сестру', ['я', 'встречаю', 'весёлую', 'сестру']), sbTipps('мы говорим о ответе', ['мы', 'говорим', 'об', 'ответе']), sbTipps('я иду в школу', ['я', 'иду', 'в', 'школу'])];
    // im Werkzeug: falsch → Tipp + Erklärung; aufdecken → Erklärung
    setAppView('grammar'); openSentenceBuild(); setWgAnswerMode('type'); setSbHelp('blocks'); setWgType('negation'); restartWordgroup();
    const c = wgState.current, toks = c.answer.split(' ');
    wgEl('input').value = toks.slice(0, -1).join(' ') + ' ' + nounDeclensionData[Object.keys(nounDeclensionData).find(n => Object.values(nounDeclensionData[n].sg).includes(toks[toks.length - 1].toLowerCase()))]?.sg['Nom.'];
    checkWordgroup(); const res = document.getElementById('sb-result');
    out.werkzeug = { tipp: !!res.querySelector('.case-tipp'), erkl: !!res.querySelector('.sb-erkl'), satz: c.answer };
    restartWordgroup(); revealWordgroup(); out.aufdecken = !!document.querySelector('#sb-result .sb-erkl');
    // Ort / Richtung
    setWgType('place'); const satz = new Set(); let gut = true;
    for (let i = 0; i < 80; i++) { restartWordgroup(); const x = wgState.current; satz.add(x.answer); const sb = SB_ITEMS[+x.sbId.split('#')[1]];
      const k = sb.wohin ? 'Akk.' : 'Präp.'; const f = x.tokens[x.tokens.length - 1];
      if (!(sb.wohin ? x.tokens.length === 4 && /^(иду|идёшь|идёт|идём|идёте|идут)$/.test(x.tokens[1]) : x.tokens.length === 3)) gut = false;
      if (!(f === nounDeclensionData[sb.noun].sg[k] || (!sb.wohin && f === (NOUN_LOCATIVE[sb.noun] || {})[SB_ORTE[sb.noun][0]]))) gut = false;
      if (!/^(Ich|Du|Er|Sie|Wir|Ihr) /.test(x.promptDe) || !x.promptDe.includes(sb.wohin ? SB_ORTE[sb.noun][2] : SB_ORTE[sb.noun][1])) gut = false; }
    out.ort = { gut, n: satz.size, items: SB_ITEMS.filter(i => i.type === 'place').length, zeit: getComputedStyle(document.getElementById('sb-tense-switcher')).display, knopf: !!document.getElementById('sb-type-place'), info: !!document.querySelector('.sb-type-info[data-sbtype="place"]') };
    const lok = SB_ITEMS.find(i => i.type === 'place' && i.noun === 'мост' && !i.wohin); wgState.current = null; const t = WG_BUILDERS.place(lok); out.most = t.answer.split(' ').slice(1).join(' ');
    // Nur Deutsch groß, Lautsprecher daneben
    setWgType('negation'); setSbHelp('free'); await sleep(20);
    const g = document.querySelector('#sb-q .sb-de-gross'); out.deGross = !!g && g.textContent.includes(wgState.current.promptDe.slice(0, 5)) && !!g.querySelector('.gt-speak-inline') && parseFloat(getComputedStyle(g).fontSize) >= 20;
    // keine doppelte Lösung nach allen Wort-Tipps
    setSbHelp('blocks'); restartWordgroup(); const n = wgState.current.tokens.length; for (let i = 0; i < n; i++) revealWordgroupStep();
    out.doppelt = getComputedStyle(wgEl('stepwise')).display !== 'none';
    return out;
  });
  ok('Erklärung: нет → Genitiv, в → Präpositiv', /городе ← город: Präpositiv – nach в/.test(r.e1) && /парка ← парк: Genitiv – nach нет/.test(r.e1), r.e1);
  ok('Erklärung: Verbform, belebter Akkusativ', /знаю ← знать: Präsens, ich-Form/.test(r.e2) && /умного ← умный: Akkusativ männlich \(belebt/.test(r.e2) && /студента ← студент: Akkusativ \(belebt/.test(r.e2), r.e2);
  ok('Erklärung: Ortsform auf -у', /лесу ← лес: Präpositiv \(Ortsform auf -у\)/.test(r.e3), r.e3);
  ok('Erklärung: Akkusativ gleich Nominativ', /билет: Akkusativ \(gleich dem Nominativ\) – покупать verlangt den Akkusativ/.test(r.e4), r.e4);
  ok('Erklärung: мою nicht als Verb gelesen', !/мыть/.test(r.e5), r.e5);
  ok('Tipps: Fall, Person, о → об; richtig = kein Tipp', /Nominativ.*nach нет steht der Genitiv: парка/.test(r.t[0][0]) && /Akkusativ: школу/.test(r.t[1][0]) && /er\/sie-Form.*встречаю/.test(r.t[2][0]) && /об statt о/.test(r.t[3][0]) && !r.t[4].length, r.t);
  ok('Werkzeug: Tipp und Erklärung nach falscher Antwort, Erklärung nach Aufdecken', r.werkzeug.tipp && r.werkzeug.erkl && r.aufdecken, r.werkzeug);
  ok('Ort / Richtung: Formen, Verb, deutscher Satz, nur Präsens', r.ort.gut && r.ort.items === 34 && r.ort.zeit === 'none' && r.ort.knopf && r.ort.info && r.ort.n > 20, r.ort);
  ok('Ort / Richtung: на мосту', r.most === 'на мосту', r.most);
  ok('„Nur Deutsch“: groß, Lautsprecher daneben', r.deGross);
  ok('nach allen Wort-Tipps keine doppelte Lösung', !r.doppelt);
  const m = await b.newPage({ ...devices['Pixel 7'] }); m.on('pageerror', e => errs.push(e.message));
  await m.goto('file://' + APP_PATH); await m.waitForTimeout(400);
  const h = await m.evaluate(() => { setAppView('grammar'); openSentenceBuild(); document.querySelector('#overlay-sentencebuild .gt-settings-toggle').click();
    const sw = document.getElementById('sb-type-switcher'), bs = [...sw.querySelectorAll('.mode-btn')].map(x => x.getBoundingClientRect().top);
    return { eineZeile: Math.max(...bs) - Math.min(...bs) < 4, scroll: sw.scrollWidth > sw.clientWidth, breit: document.documentElement.scrollWidth <= innerWidth }; });
  ok('Handy: Satzarten in einer scrollbaren Zeile', h.eineZeile && h.scroll && h.breit, h);
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
