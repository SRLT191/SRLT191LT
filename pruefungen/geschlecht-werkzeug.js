const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Geschlecht (12.11.): Tasten 1–4, Runde 15, Bereiche (Regelfälle, -ь-Wörter, Ausnahmen, nur Plural), Beispiel mit Begleiter,
// Endung markiert + Farbe, Liste der -ь-Wörter mit „üben“, Fortschritt ohne Regelfälle (Kopf zeigt Bereich), Beschriftung der Knöpfe
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i === undefined ? '' : JSON.stringify(i)]);
  const p = await b.newPage({ viewport: { width: 1300, height: 850 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}; setAppView('grammar'); genderState.scope = 'all'; openGender();
    out.runde = genderState.queue.length;
    const pool = genderPool(), typ = t => pool.filter(x => x.typ === t);
    out.typen = { easy: typ('easy').length, soft: typ('soft').length, exc: typ('exc').length, pl: typ('pl').length, ohne: pool.filter(x => !x.typ).length };
    out.bsp = ['мебель', 'день', 'окно', 'часы', 'папа', 'время'].map(w => genderBeispiel(pool.find(x => x.ru === w)));
    out.knoepfe = [...document.querySelectorAll('#gender-opts .case-opt')].map(b => b.querySelector('.gd-l').textContent + ':' + b.getAttribute('aria-keyshortcuts'));
    // Bereiche
    out.bereiche = ['easy', 'soft', 'exc', 'pl'].map(sc => { setGenderScope(sc); return genderState.queue.every(x => x.typ === sc) && /: \d+ von \d+ gelernt$/.test(document.getElementById('gtp-gender').textContent); });
    setGenderScope('soft');
    // Antwort: Endung markiert, Farbe, Beispiel
    const it = genderState.queue[0]; answerGender(it.g === 'm' ? 'f' : 'm'); clearTimeout(GENDER_CHOICE.timer);
    const w = document.getElementById('gender-wort');
    out.antwort = { klasse: w.className, end: (w.querySelector('.gd-end') || {}).textContent, bsp: (document.querySelector('#gender-result .gd-bsp') || {}).textContent, it: it.ru, g: it.g };
    // Vorlesen nach der Antwort mit Begleiter
    const alt = window.speak; let gesagt = ''; window.speak = t => { gesagt = t; }; speakGender(); window.speak = alt; out.gesagt = [gesagt, genderBeispiel(it)];
    nextGender();
    // Fortschritt: Regelfall zählt nicht, -ь-Wort zählt
    resetProgress(); setGenderScope('all');
    const vorher = document.getElementById('gtp-gender').textContent;
    progressMark('gender', 'дом', true); updateGrammarTileProgress(); const nachRegel = document.getElementById('gtp-gender').textContent;
    progressMark('gender', 'мебель', true); updateGrammarTileProgress(); const nachWeich = document.getElementById('gtp-gender').textContent;
    out.fort = [vorher, nachRegel, nachWeich, genderTotal(), pool.length, grammarToolSources().gender[1]];
    const st = {}; updateGrammarTileProgress(undefined, st); out.chip = st['gtp-gender'];
    // Liste
    openGenderList(); const ov = document.getElementById('overlay-genderlist');
    out.liste = { offen: ov.classList.contains('open'), gruppen: ov.querySelectorAll('.rkl-group').length, woerter: ov.querySelectorAll('.gdl-w').length, soft: typ('soft').length, haken: ov.querySelectorAll('.gdl-w.ok').length };
    ov.querySelector('.rkl-ueben[onclick*="\'ost\'"]').click();
    out.ueben = { zu: !ov.classList.contains('open'), alle: genderState.queue.every(x => x.grp === 'ost'), n: genderState.queue.length };
    restartGender();
    return out;
  });
  ok('Runde mit 15 Wörtern', r.runde === 15, r.runde);
  ok('jedes Wort hat einen Typ', r.typen.ohne === 0 && r.typen.easy > 1000 && r.typen.soft > 100 && r.typen.exc > 10 && r.typen.pl > 10, r.typen);
  ok('Beispiel mit Begleiter', r.bsp.join('|') === 'моя мебель|мой день|моё окно|мои часы|мой папа|моё время', r.bsp);
  ok('Knöpfe beschriftet, Tasten 1–4', r.knoepfe.join() === 'männlich:1,weiblich:2,sächlich:3,nur Plural:4', r.knoepfe);
  ok('Bereiche filtern, Kopf zeigt Bereich', r.bereiche.every(Boolean), r.bereiche);
  ok('Antwort: Farbe, Endung markiert, Beispiel', r.antwort.klasse.includes('gd-' + r.antwort.g) && r.antwort.end && r.antwort.it.endsWith(r.antwort.end) && r.antwort.bsp.includes(r.antwort.it), r.antwort);
  ok('Vorlesen nach der Antwort mit Begleiter', r.gesagt[0] === r.gesagt[1], r.gesagt);
  ok('Fortschritt ohne Regelfälle', /^0 von/.test(r.fort[0]) && /^0 von/.test(r.fort[1]) && /^1 von/.test(r.fort[2]) && r.fort[3] < r.fort[4] && r.fort[5] === r.fort[3] && /^1 von \d+ gelernt$/.test(r.chip), [r.fort, r.chip]);
  ok('Liste der -ь-Wörter', r.liste.offen && r.liste.gruppen >= 7 && r.liste.woerter === r.liste.soft && r.liste.haken === 1, r.liste);
  ok('Gruppe üben', r.ueben.zu && r.ueben.alle && r.ueben.n > 0, r.ueben);
  // Tasten
  await p.evaluate(() => { genderState.scope = 'all'; restartGender(); document.activeElement && document.activeElement.blur(); });
  const k = await p.evaluate(() => ['m', 'f', 'n', 'pl'].indexOf(genderState.queue[0].g) + 1);
  await p.keyboard.press(String(k)); await p.waitForTimeout(50);
  ok('Taste wählt die Antwort', await p.evaluate(() => genderState.correct === 1));
  ok('keine Fehler', !errs.length, errs);
  R.forEach(x => console.log(x.join(' '))); await b.close();
  if (R.some(x => x[0] === 'XX ')) process.exit(1);
})();
