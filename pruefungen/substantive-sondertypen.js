const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Substantive (7.11.): nur Typen, die noch fehlten – люди/дети (anderer Stamm), друзья, сыновья, мужчина (männlich auf -а),
// здание (-ие), станция (-ия), улица (ц), яблоко, платье, глаз, гражданин, сосед, уши, церковь, деньги (nur Plural);
// Werkzeuge bieten nur Zahlen an, die es gibt (любовь ohne Plural, деньги ohne Singular); пять человек
const { chromium } = require('playwright');
const NEU = ['человек', 'ребёнок', 'друг', 'сын', 'мужчина', 'здание', 'станция', 'улица', 'яблоко', 'платье', 'глаз', 'гражданин', 'сосед', 'ухо', 'церковь', 'деньги'];
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(NEU => {
    const subst = SUBSTANTIVE_THEMEN.flatMap(c => getAllWordsOfCat(c));
    const out = { fehlt: [], form: [], vok: [] };
    NEU.forEach(n => { const d = nounDeclensionData[n]; if (!d) { out.fehlt.push(n); return; }
      const sg = Object.values(d.sg || {}), pl = Object.values(d.pl || {});
      if (sg.length !== 6 || pl.length !== 6 || !d.note || !d.typeLabel || (n !== 'деньги' && d.sg['Nom.'] !== n) || (n === 'деньги' && (sg.some(f => f !== '—') || d.pl['Nom.'] !== 'деньги'))) out.form.push(n);
      const w = subst.find(x => x.ru.split(' / ').includes(n)); if (!w || ![].concat(w.de).join(', ').includes(d.de)) out.vok.push(n); });
    out.genus = { мужчина: nounGender('мужчина', nounDeclensionData['мужчина']), церковь: nounGender('церковь', nounDeclensionData['церковь']), ухо: nounGender('ухо', nounDeclensionData['ухо']) };
    out.belebt = ['человек', 'ребёнок', 'мужчина', 'сосед'].every(n => isAnimate(nounDeclensionData[n], n)) && !isAnimate(nounDeclensionData['здание'], 'здание');
    out.wg = wgDeclineNP({ adj: 'новый', noun: 'мужчина', kasus: 'Akk.', number: 'sg' }).ru;
    // Werkzeug: Singular ohne деньги, Plural ohne любовь
    setAppView('grammar'); openNounDecline(); setNounNumber('sg');
    const opts = () => [...document.querySelectorAll('#noun-select option')].map(o => o.value);
    out.sg = { деньги: opts().includes('деньги'), любовь: opts().includes('любовь') };
    setNounNumber('pl'); out.pl = { деньги: opts().includes('деньги'), любовь: opts().includes('любовь') };
    document.getElementById('noun-select').value = 'деньги'; renderNounTable();
    out.felder = [...document.querySelectorAll('#noun-grid input')].map(i => i.dataset.answer).join(' ');
    document.querySelectorAll('#noun-grid input').forEach(i => i.value = i.dataset.answer); checkNounTable();
    out.gespeichert = !!(loadGrammarSrs()['noun:pl'] || {})['деньги'];
    document.getElementById('noun-select').value = 'любовь'; setNounNumber('pl'); out.wechsel = document.getElementById('noun-select').value !== 'любовь';
    const n = Object.keys(nounDeclensionData); out.total = nounTotal(); out.erwartet = n.length * 2 - 2;
    updateGrammarTileProgress(); out.hdr = document.getElementById('gtp-noun').textContent;
    // Zahl + Substantiv: ohne любовь/деньги, „пять человек“
    out.nn = numNounNouns(); out.nnOhne = !out.nn.includes('деньги') && !out.nn.includes('любовь') && out.nn.includes('человек');
    // seit 12.11. kommen die Aufgaben aus der Runde nach Lernstand: Aufgabe gezielt vorgeben
    numNounState.queue = [['человек', 'r5']]; restartNumNoun(); out.fuenf = numNounState.current;
    out.wgOhne = buildWordgroupPairs().nouns.every(x => nounHas(x, 'sg') && nounHas(x, 'pl'));
    out.cfDash = caseFormTotal('noun') === Object.entries(nounDeclensionData).reduce((s, [n, d]) => s + ['sg', 'pl'].reduce((m, k) => m + Object.entries(d[k]).filter(([kk, f]) => f !== '—' && !(k === 'sg' && kk === 'Nom.') && f !== n).length, 0), 0);   // ohne Nom. Sg. und Formen gleich dem Wort (12.11.)
    return out;
  }, NEU);
  ok('16 neue Substantive mit allen Formen, Erklärung und Typ', r.fehlt.length === 0 && r.form.length === 0, JSON.stringify([r.fehlt, r.form]));
  ok('alle stehen in den Vokabeln, Bedeutung wie auf der Karte', r.vok.length === 0, r.vok.join(', '));
  ok('мужчина männlich (новый мужчина → нового мужчину), церковь weiblich, ухо Neutrum; Personen belebt', r.genus.мужчина === 'm' && r.genus.церковь === 'f' && r.genus.ухо === 'n' && r.belebt && r.wg === 'нового мужчину', JSON.stringify([r.genus, r.belebt, r.wg]));
  ok('Singular ohne деньги, Plural ohne любовь (kein „—“ mehr einzutippen)', !r.sg.деньги && r.sg.любовь && r.pl.деньги && !r.pl.любовь && r.wechsel, JSON.stringify([r.sg, r.pl, r.wechsel]));
  ok('деньги im Plural geübt und gespeichert', r.felder === 'деньги денег деньгам деньги деньгами деньгах' && r.gespeichert, JSON.stringify([r.felder, r.gespeichert]));
  ok('Gesamtzahl zählt nur vorhandene Zahlen', r.total === r.erwartet && r.hdr.endsWith('von ' + r.erwartet + ' gelernt'), JSON.stringify([r.total, r.erwartet, r.hdr]));
  ok('Zahl + Substantiv ohne любовь/деньги; nach 5: человек (nicht людей)', r.nnOhne && r.fuenf.noun === 'человек' && r.fuenf.answer === 'человек' && r.fuenf.n >= 5, JSON.stringify(r.fuenf));
  ok('Wortgruppen nur mit Wörtern in beiden Zahlen; Kasus bilden ohne „—“', r.wgOhne && r.cfDash);
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
