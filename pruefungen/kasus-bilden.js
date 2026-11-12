const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Kasus bilden – Substantive (12.11.): Abzeichen der Form, Fragewörter, Rahmen mit об/со, Platzhalter, Nachher-Zeile,
// Runden nach Lernstand, ohne Nominativ Singular, gemeinsame Punkte mit der Deklination, nur regelmäßige,
// mehrere Fälle, Reihenfolge Singular · Plural · Beide, Rundenende nach Fall gruppiert
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, st = caseFormState;
    setAppView('grammar'); openCaseForm('noun');
    const q = () => document.getElementById('caseform-q');
    out.reihe = [...document.querySelectorAll('#cf-num-switcher .mode-btn')].map(b => b.textContent.trim()).join(' ');
    out.chip = !!q().querySelector('.cf-form-chip') && !!q().querySelector('.cf-frage') && !/gesuchte Form/.test(q().textContent);
    out.platz = document.getElementById('caseform-input').placeholder;
    out.platzOk = out.platz === st.current.frage + ' eingeben…';
    // Rahmen und Lautregeln
    out.rahmen = [
      cfRahmenText(cfNounTask('окно', 'sg', 'Präp.'), 'окне'), cfRahmenText(cfNounTask('словарь', 'sg', 'Instr.'), 'словарём'),
      cfRahmenText(cfNounTask('суп', 'pl', 'Gen.'), 'супов'), cfRahmenText(cfNounTask('книга', 'sg', 'Gen.'), 'книги'),
      cfRahmenText(cfNounTask('стол', 'pl', 'Nom.'), 'столы'), cfRahmenText(cfNounTask('брат', 'sg', 'Akk.'), 'брата'),
      cfRahmenText(cfNounTask('книга', 'pl', 'Dat.'), 'книгам')];
    // Runde: 15 verschiedene Wörter, nie Nom. Sg., neue vor bekannten
    const pool = cfNounPool(st);
    out.keinNomSg = !pool.some(x => x[1] === 'sg' && x[2] === 'Nom.');
    const runde = cfNounRound(st);
    out.runde = [runde.length, new Set(runde.map(x => x[0])).size];
    out.total = [caseFormTotal('noun'), pool.length];
    // Prüfen: Nachher-Zeile, Punkte gemeinsam mit der Deklination
    st.queue = [['книга', 'sg', 'Gen.']]; restartCaseForm('noun');
    out.rahmenFeld = document.getElementById('caseform-pre').textContent;
    document.getElementById('caseform-input').value = 'книги'; checkCaseForm('noun');
    out.nachher = document.getElementById('caseform-result').textContent;
    out.knopf = !!document.querySelector('#caseform-result button[onclick="cfZurTabelle()"]');
    out.dotCf = document.querySelectorAll('#caseform-dots .conj-dot.fertig').length;
    openNounDecline(); setNounNumber('sg'); document.getElementById('noun-select').value = 'книга'; renderNounTable();
    out.dotDekl = document.querySelectorAll('#noun-dots .conj-dot.fertig').length;
    // In Deklination öffnen
    openCaseForm('noun'); st.queue = [['сумка', 'pl', 'Dat.']]; restartCaseForm('noun'); revealCaseForm('noun');
    cfZurTabelle(); out.tabelle = [document.getElementById('overlay-noun').classList.contains('open'), document.getElementById('noun-select').value];
    // Fortschritt zählt Nom. Sg. nicht
    progressMark('caseform', 'n:стол:sg:Nom.', true);
    updateGrammarTileProgress(); out.hdr = document.getElementById('gtp-caseform').textContent;
    // mehrere Fälle, Nom gesperrt bei Singular
    openCaseForm('noun'); setCaseFormCase('Gen.', 'noun'); setCaseFormCase('Präp.', 'noun');
    out.mehr = [st.kasus, [...document.querySelectorAll('#cf-case-switcher .mode-btn.active')].map(b => b.dataset.v).join(',')];
    out.mehrPool = cfNounPool(st).every(x => x[2] === 'Gen.' || x[2] === 'Präp.');
    setCaseFormCase('Präp.', 'noun'); out.einer = st.kasus;
    setCaseFormCase('Nom.', 'noun'); setCaseFormNumber('sg', 'noun');
    out.nomSg = [st.kasus, document.querySelector('#cf-case-switcher [data-v="Nom."]').disabled];
    setCaseFormNumber('mixed', 'noun'); setCaseFormCase('all', 'noun');
    // nur regelmäßige
    toggleCaseFormReg(); out.reg = cfNounPool(st).every(x => !isIrregularNoun(x[0])) && cfNounPool(st).length > 0;
    toggleCaseFormReg();
    // Rundenende gruppiert
    gtRundeNeu('cf');
    for (let i = 0; i < 15; i++) { document.getElementById('caseform-input').value = 'xx'; checkCaseForm('noun'); nextCaseForm('noun'); }
    out.ende = [!!q().querySelector('.gt-fehler-gruppen'), (q().querySelector('.gt-fehler-gruppen') || {}).textContent || ''];
    out.fehlerRu = (q().querySelector('.gt-fehler li') || { dataset: {} }).dataset.ru || '';
    gtRundeNeu('cf');
    return out;
  });
  ok('Zahl: Singular · Plural · Beide', r.reihe === 'Singular Plural A2 Beide' || /^Singular Plural.*Beide$/.test(r.reihe), r.reihe);
  ok('gesuchte Form als Abzeichen mit Fragewörtern', r.chip);
  ok('Platzhalter nennt die Form', r.platzOk, r.platz);
  ok('Rahmen mit об/со: об окне, со словарём, много супов, нет книги, Это столы., Я вижу брата., к книгам',
    r.rahmen.join('|') === 'Я думаю об окне.|со словарём|много супов|нет книги|Это столы.|Я вижу брата.|к книгам', r.rahmen.join('|'));
  ok('ohne Nominativ Singular: Pool und Gesamtzahl', r.keinNomSg && r.total[0] === r.total[1], JSON.stringify(r.total));
  ok('Runde nach Lernstand: 15 Aufgaben, 15 verschiedene Wörter', r.runde[0] === 15 && r.runde[1] === 15, JSON.stringify(r.runde));
  ok('Rahmen am Feld (нет), danach beide Zahlen + „In Deklination öffnen“', r.rahmenFeld === 'нет' && /Gen\. книги · книг/.test(r.nachher) && r.knopf, r.rahmenFeld + ' / ' + r.nachher);
  ok('Punkt je Fall gemeinsam mit der Deklination', r.dotCf === 1 && r.dotDekl === 1, JSON.stringify([r.dotCf, r.dotDekl]));
  ok('In Deklination öffnen zeigt das Wort', r.tabelle[0] && r.tabelle[1] === 'сумка', JSON.stringify(r.tabelle));
  ok('Fortschritt zählt Nom. Sg. nicht', /^1 von /.test(r.hdr), r.hdr);
  ok('mehrere Fälle wählbar (Gen.,Präp.), Abwählen bis auf einen', r.mehr[0] === 'Gen.,Präp.' && r.mehr[1] === 'Gen.,Präp.' && r.mehrPool && r.einer === 'Gen.', JSON.stringify([r.mehr, r.einer]));
  ok('Singular sperrt „Nom“ und nimmt ihn aus der Auswahl', r.nomSg[0] === 'Gen.' && r.nomSg[1], JSON.stringify(r.nomSg));
  ok('nur regelmäßige Wörter', r.reg);
  ok('Rundenende: Fehler nach Fall gruppiert, Anhören mit Rahmen', r.ende[0] && /Fehler/.test(r.ende[1]) && r.fehlerRu.includes(' '), JSON.stringify([r.ende[1], r.fehlerRu]));
  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
