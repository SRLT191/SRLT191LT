const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// A2 nach dem „Лексический минимум … Базовый уровень“ (Златоуст 2019): Wörter dieser Liste
// stehen höchstens auf A2. Die Liste selbst liegt aus Urheberrechtsgründen nicht im Repository –
// geprüft wird eine Stichprobe von Wörtern, die vorher nach Häufigkeit B1–C1 waren.
const { chromium } = require('playwright');
const STICHPROBE = ['музей', 'экскурсия', 'баскетбол', 'космонавт', 'плыть / плавать', 'словарь', 'лекция', 'тётя', 'внук', 'серый',
  'приятного аппетита', 'дешёвый', 'включать', 'выключать', 'десятый', 'ноль', 'очки', 'виза', 'памятник', 'химия'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  await check('Stichprobe der A2-Liste steht auf A2', () => p.evaluate(S => {
    const f = S.filter(ru => { const w = allVocabWords().find(x => x.ru === ru || x.ru.split(' / ').includes(ru)); return !w || wordLevel(w) !== 'A2'; });
    return { ok: !f.length, info: f.join(', ') };
  }, STICHPROBE));
  await check('A1 bleibt unberührt (Monate, Zahlen, Jahreszeiten)', () => p.evaluate(() => {
    const f = ['январь', 'один', 'весна', 'бесплатный', 'нормальный'].filter(ru => wordLevel(allVocabWords().find(x => x.ru === ru)) !== 'A1');
    return { ok: !f.length, info: f.join(', ') };
  }));
  await check('jedes Wort hat eine Stufe', () => p.evaluate(() => { const f = allVocabWords().filter(w => !wordLevel(w)).map(w => w.ru); return { ok: !f.length, info: f.slice(0, 5).join(', ') }; }));
  await check('Satzformen der umgestuften Wörter auf A2 (музея, лекции, кошку)', () => p.evaluate(() => {
    const f = ['музея', 'лекции', 'кошку'].filter(x => SENT_FORM_LEVEL.get(x) !== 'A2'); return { ok: !f.length, info: f.join(', ') };
  }));
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  if (R.some(r => r[0] !== 'OK ')) process.exitCode = 1;
  await b.close();
})();
