const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Rektion (10.11.): Erklärung mit Merkhilfen (Dativ = an wen, Instrumental = womit/als was, Genitiv = weg von,
// Präpositionen wie im Deutschen, Akkusativ wie im Englischen, Spiel/Instrument, mit Fragewort lernen);
// die als Beispiele genannten Verben stimmen mit der Übung überein
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    setAppView('grammar'); openRektion(); toggleRektionInfo && toggleRektionInfo();
    const box = document.querySelector('#rektion-info-panel .rk-merk'), t = box ? box.textContent : '';
    const fall = v => { const x = RK_VERBS.find(y => y.v === v); return x && x.r; };
    const soll = { 'звонить': 'Dat', 'помогать': 'Dat', 'советовать': 'Dat', 'обещать': 'Dat', 'верить': 'Dat', 'заниматься': 'Instr', 'интересоваться': 'Instr', 'гордиться': 'Instr', 'пользоваться': 'Instr', 'руководить': 'Instr', 'бояться': 'Gen', 'касаться': 'Gen', 'желать': 'Gen',
      'надеяться': 'naAkk', 'сердиться': 'naAkk', 'мечтать': 'oPraep', 'зависеть': 'otGen', 'готовиться': 'kDat', 'привыкать': 'kDat', 'голосовать': 'zaAkk', 'состоять': 'izGen', 'благодарить': 'Akk', 'поздравлять': 'Akk' };
    const falsch = Object.entries(soll).filter(([v, k]) => fall(v) !== k).map(([v, k]) => v + ': ' + fall(v) + ' statt ' + k);
    return { da: !!box, sichtbar: !!box && box.getClientRects().length > 0, t, falsch };
  });
  ok('Abschnitt „Merkhilfen“ in der Erklärung', r.da && r.sichtbar && /Merkhilfen/.test(r.t));
  ok('alle Faustregeln enthalten', ['an wen geht etwas', 'womit oder als was', 'weg von etwas', 'wie im Deutschen gedacht', 'wie im Englischen', 'Spiel oder Instrument', 'Fragewort'].every(k => r.t.includes(k)), r.t.slice(0, 200));
  ok('genannte Beispielverben stimmen mit der Übung überein', r.falsch.length === 0, r.falsch.join(', '));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
