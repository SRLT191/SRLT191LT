const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Vollständigkeit (15.11.): Übersicht je Stufe – Wortschatz, Grammatik gegen den Stufenkatalog, Texte je Übungsart,
// Abdeckung der Karten in den Texten, Fertigkeiten. Kein Bestanden/Nicht bestanden, sondern ein Bericht
// (Befehl „Prüfe die Vollständigkeit“). Fehlschlag nur, wenn der Bericht nicht erstellt werden kann.
const { chromium } = require('playwright');
// Stufenkatalog der Grammatik: [Stufe, Thema, Prüfung im Code (true = gebaut, 'teil' = teilweise, false = fehlt)]
const KATALOG = `[
  ['A1', 'Präsens, Vergangenheit, Futur mit буду', () => GRAMMAR_TOOL_LEVEL.conjugate === 'A1' && TRANSFORM_SCOPES.includes('future')],
  ['A1', 'Sechs Fälle im Singular (Substantiv, Adjektiv, Pronomen)', () => !!(GRAMMAR_TOOL_LEVEL.noun && GRAMMAR_TOOL_LEVEL.decline && GRAMMAR_TOOL_LEVEL.pronoun)],
  ['A1', 'Zahl + Substantiv', () => !!GRAMMAR_TOOL_LEVEL.numnoun],
  ['A1', 'Geschlecht', () => !!GRAMMAR_TOOL_LEVEL.gender],
  ['A1', 'Präpositionen mit Fall', () => !!GRAMMAR_TOOL_LEVEL.casedrill],
  ['A1', 'Satzarten (Aussage, Frage, Verneinung, Besitz, Dativ, Modal)', () => WG_SENTENCE_TYPES.length >= 7],
  ['A2', 'Plural in allen Fällen', () => !!document.getElementById('cf-num-pl')],
  ['A2', 'Aspekt (Aspektpaare, vollendete Formen)', () => GRAMMAR_TOOL_LEVEL.aspect === 'A2'],
  ['A2', 'Bewegungsverben (mit Vorsilben)', () => GRAMMAR_TOOL_LEVEL.motion === 'A2' && MOTION_PREFIX.length > 0],
  ['A2', 'Imperativ', () => TRANSFORM_SCOPES.includes('imperative')],
  ['A2', 'Rektion der Verben', () => GRAMMAR_TOOL_LEVEL.rektion === 'A2'],
  ['A2', 'Kurzform und Steigerung', () => GRAMMAR_TOOL_LEVEL.adjform === 'A2'],
  ['A2', 'кто/что, весь/этот/тот in allen Fällen', () => !!document.getElementById('pronform-scope-extra')],
  ['B1', 'Konjunktiv mit бы', () => TRANSFORM_SCOPES.includes('konj')],
  ['B1', 'Adverbialpartizip', () => TRANSFORM_SCOPES.includes('gerund')],
  ['B1', 'Partizipien', () => TRANSFORM_SCOPES.includes('part')],
  ['B1', 'Passiv mit -ся', () => TRANSFORM_SCOPES.includes('passiv')],
  ['B1', 'Relativsätze mit который', () => typeof relativeData !== 'undefined' && !!relativeData['который']],
  ['B1', 'Unbestimmte und verneinte Pronomen', () => typeof PF_REL !== 'undefined'],
  ['B1', 'Zahlwörter in allen Fällen', () => !!document.getElementById('nn-fall-toggle')],
  ['B1', 'Aspekt im Satz (нельзя, не надо, Imperativ)', () => typeof ASPECT_SATZ !== 'undefined'],
  ['B1', 'Nebensätze (чтобы, если, когда, хотя, ли)', () => WG_SENTENCE_TYPES.includes('nebensatz')],
  ['B1', 'Ordnungszahlen', () => !!declensionData['первый']],
  ['B1', 'Datum und Uhrzeit', () => false],
  ['B2', 'Indirekte Rede', () => WG_SENTENCE_TYPES.includes('rede')],
  ['B2', 'Kurzform der Passivpartizipien', () => typeof ADJ_PPP !== 'undefined'],
  ['B2', 'Sammelzahlwörter (оба, двое, трое)', () => typeof NN_OBA !== 'undefined' ? 'teil' : false],
  ['B2', 'Präpositionen благодаря, из-за, несмотря на', () => PREP_CASES.some(p => p.prep === 'несмотря на') ? true : PREP_CASES.some(p => p.prep === 'благодаря') ? 'teil' : false],
  ['B2', 'Bewegungsverben in übertragener Bedeutung', () => MOTION_PREFIX.some(x => x.bed)],
  ['B2', 'Partizipialsätze statt который', () => false],
  ['B2', 'Wortbildung (Vor- und Nachsilben)', () => false],
  ['C1', 'Feine Aspektunterschiede', () => typeof ASPECT_SATZ !== 'undefined' && ASPECT_SATZ.some(x => x.lvl === 'C1') ? 'teil' : false],
  ['C1', 'Rektion von Substantiven', () => false],
  ['C1', 'Stilebenen, Wortstellung (Thema – Rhema)', () => false],
]`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(katalog => {
    const K = eval(katalog), out = {};
    const karten = allVocabWords();
    out.wort = LEVELS.map(l => { const ws = karten.filter(w => wordLevel(w) === l), satz = ws.filter(w => { try { return !!getWordSentence(w); } catch (e) { return false; } }).length;
      return [l, ws.length, satz]; });
    out.ohneStufe = karten.filter(w => !wordLevel(w)).length;
    out.gram = K.map(([l, t, f]) => { let s = false; try { s = f(); } catch (e) { s = false; } return [l, t, s === true ? 'gebaut' : s === 'teil' ? 'teilweise' : 'fehlt']; });
    out.teile = LEVELS.map(l => [l, Object.values(GRAMMAR_TOOL_LEVEL).filter(x => x === l).length, GRAMMAR_PART_LEVEL.filter(x => x[1] === l).length]);
    out.texte = Object.keys(READ_MODI).map(a => [READ_MODI[a].name, LEVELS.map(l => TEXTE.filter(t => textArt(t) === a && t.lvl === l).length)]);
    const inTexten = new Set(); TEXTE.forEach(t => readKartenText(t).forEach(w => inTexten.add(w.ru)));
    out.abdeckung = ['A1', 'A2'].map(l => { const ws = karten.filter(w => wordLevel(w) === l); return [l, ws.filter(w => inTexten.has(w.ru)).length, ws.length]; });
    out.verben = [Object.keys(conjugationData).length, Object.keys(aspectData).length];
    out.satzbau = [WG_SENTENCE_TYPES.length, SB_ITEMS.length];
    return out;
  }, KATALOG);
  const pct = (a, b) => b ? Math.round(a / b * 100) + ' %' : '–';
  console.log('== Wortschatz (Karten je Stufe · mit Beispielsatz)');
  r.wort.forEach(([l, n, s]) => console.log('   ' + l + ': ' + n + ' Karten · ' + s + ' mit Beispielsatz (' + pct(s, n) + ')'));
  console.log('   ohne Stufe: ' + r.ohneStufe + ' · Abgleich mit den Mindestlisten (A1 FIPI, A2 Lexikalisches Minimum) nur von Hand – Stand siehe Vormerkung „Wortschatz-Lücken“');
  console.log('== Grammatik (Werkzeuge / Teile mit Stufe)');
  r.teile.forEach(([l, w, t]) => console.log('   ' + l + ': ' + w + ' Werkzeuge, ' + t + ' Teile'));
  console.log('== Grammatik gegen den Stufenkatalog');
  const LEVEL_LIST = ['A1', 'A2', 'B1', 'B2', 'C1'];
  LEVEL_LIST.forEach(l => {
    const z = r.gram.filter(x => x[0] === l); if (!z.length) return;
    const g = z.filter(x => x[2] === 'gebaut').length, t = z.filter(x => x[2] === 'teilweise').length;
    console.log('   ' + l + ': ' + g + ' von ' + z.length + ' gebaut' + (t ? ', ' + t + ' teilweise' : '') + ' (' + pct(g + t / 2, z.length) + ')');
    z.filter(x => x[2] !== 'gebaut').forEach(x => console.log('      ' + (x[2] === 'fehlt' ? '–' : '~') + ' ' + x[1]));
  });
  console.log('== Texte je Übungsart (A1 · A2 · B1 · B2 · C1)');
  r.texte.forEach(([a, n]) => console.log('   ' + a + ': ' + n.join(' · ')));
  console.log('== Abdeckung: Karten, die in einem Text vorkommen');
  r.abdeckung.forEach(([l, a, n]) => console.log('   ' + l + ': ' + a + ' von ' + n + ' (' + pct(a, n) + ')'));
  console.log('== Weitere Zahlen: ' + r.verben[0] + ' Konjugationstabellen, ' + r.verben[1] + ' Aspektpaare mit Formen, ' + r.satzbau[0] + ' Satzarten mit ' + r.satzbau[1] + ' Sätzen');
  console.log('== Fertigkeiten: Wortschatz ✓ · Grammatik ✓ · Lesen ✓ · Übersetzen DE → RU ✓ · Hören ✓ · freies Schreiben – · Sprechen –');
  const ok = !errs.length && r.gram.length > 30;
  console.log((ok ? 'OK ' : 'XX ') + ' Bericht erstellt' + (errs.length ? ' · ' + errs.join(' | ') : ''));
  console.log('\n' + (ok ? 1 : 0) + ' von 1 bestanden');
  await b.close(); process.exit(ok ? 0 : 1);
})();
