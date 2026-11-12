const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Konjugieren (7.11.): nur neue Bildungsmuster statt vieler gleicher Tabellen – 12 Sonderfälle
// (зову, танцую, жую, кладу, рос, пеку, лью, борюсь, бреюсь, мёрз, чищу, кормлю) mit Erklärung
const { chromium } = require('playwright');
const NEU = { 'звать': 'зову', 'танцевать': 'танцую', 'жевать': 'жую', 'класть': 'кладу', 'расти': 'расту', 'печь': 'пеку', 'лить': 'лью', 'бороться': 'борюсь', 'бриться': 'бреюсь', 'мёрзнуть': 'мёрзну', 'чистить': 'чищу', 'кормить': 'кормлю' };
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(NEU => {
    const verben = WORTART_GROUPS['Verben'].flatMap(c => getAllWordsOfCat(c));
    const out = { fehlt: [], form: [], vok: [], de: [] };
    Object.entries(NEU).forEach(([v, ich]) => {
      const d = conjugationData[v]; if (!d) { out.fehlt.push(v); return; }
      const np = Object.values(d.nonPast || {}), pa = Object.values(d.past || {}), im = Object.values(d.imperative || {}), fu = Object.values(d.future || {});
      if (np.length !== 6 || pa.length !== 4 || im.length !== 2 || fu.length !== 6 || d.nonPast['я'] !== ich || !fu.every(f => f.endsWith(' ' + v)) || !d.nonPastNote) out.form.push(v);
      const w = verben.find(x => x.ru.split(' / ')[0] === v); if (!w) out.vok.push(v); else if (!d.de.split(', ').every(t => [].concat(w.de).join(', ').includes(t))) out.de.push(v + ': ' + d.de);
    });
    out.klasse = Object.keys(NEU).filter(v => verbClassKey(v) === 'none');
    // Werkzeug: Tabelle ausfüllen und prüfen
    setAppView('grammar'); openConjugate(); document.getElementById('conj-verb-select').value = 'расти'; setConjTense('past');
    document.querySelectorAll('#conj-grid input[data-answer]').forEach(i => i.value = i.dataset.answer.split(/\s*[\/|]\s*/)[0]);
    checkConjugationTable(); out.past = (loadGrammarSrs()['conj:past'] || {})['расти'];
    out.zellen = [...document.querySelectorAll('#conj-grid input[data-answer]')].map(i => i.dataset.answer).join(' ');
    updateGrammarTileProgress(); out.hdr = document.getElementById('gtp-conj').textContent; out.n = Object.keys(conjugationData).length; out.pf = conjPfVerben().length;
    out.umformen = buildTransformItems().filter(t => Object.keys(NEU).includes(t.prompt.split(' + ')[1])).length;
    return out;
  }, NEU);
  ok('12 neue Verben mit vollständiger Tabelle (6 Präsens, буду-Futur, 4 Vergangenheit, 2 Imperativ) und Erklärung', r.fehlt.length === 0 && r.form.length === 0, JSON.stringify([r.fehlt, r.form]));
  ok('alle stehen in den Vokabeln, Bedeutung wie auf der Karte', r.vok.length === 0 && r.de.length === 0, JSON.stringify([r.vok, r.de]));
  ok('jedes Verb bekommt eine Konjugationsklasse', r.klasse.length === 0, r.klasse.join(', '));
  ok('расти Vergangenheit: рос, росла, росло, росли – geübt und gespeichert', r.zellen === 'рос росла росло росли' && r.past && r.past.correct === 1, JSON.stringify([r.zellen, r.past]));
  ok('Kopfzeile: ' + r.n + ' Verben + ' + r.pf + ' vollendete Tabellen × 3 Zeiten (ohne Futur); Umformen nutzt die neuen Verben', r.hdr === '1 von ' + (r.n + r.pf) * 3 + ' gelernt' && r.n >= 158 && r.umformen > 0, JSON.stringify([r.hdr, r.umformen]));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
