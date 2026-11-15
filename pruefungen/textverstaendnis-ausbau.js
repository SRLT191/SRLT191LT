const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Textverständnis-Ausbau (15.11.): Liste (zwei Spalten, Stand je Stufe, Balken, Dauer, Weiterlesen, Erklärung, Pfeiltasten),
// Wörter (neu je Text, Wort antippen, „Wörter dieses Texts üben“), Umschrift und Schriftgröße, Übungsarten DE → RU und Hören
// mit eigenen Texten (Probetexte, solange keine bestätigten da sind), Tagesprotokoll, Stufenplan, „Sätze wiederholen“ auf der Startseite.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1800, height: 1000 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {}, gesprochen = []; window.speak = (t, rate) => gesprochen.push([t, rate]);
    const body = document.getElementById('reading-body'), taste = (key, ziel, extra) => (ziel || document.body).dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, extra || {})));
    localStorage.removeItem(READING_KEY); localStorage.removeItem(READING_MODE_KEY); readState.modus = 'ru';
    const echteDe = readingTexteDerArt('de').length, echteHoer = readingTexteDerArt('hoer').length;
    TEXTE.push({ id: 'probe-de', art: 'de', lvl: 'A1', titel: 'Проба', de: 'Probe', saetze: [{ ru: 'Сегодня у меня свободный день.', de: 'Heute habe ich einen freien Tag.' }, { ru: 'Я пью чай.', de: 'Ich trinke Tee.' }] },
      { id: 'probe-hoer', art: 'hoer', lvl: 'A2', titel: 'Проба', de: 'Probe', saetze: [{ ru: 'Это кот.', de: 'Das ist eine Katze.' }, { ru: 'Кот спит.', de: 'Die Katze schläft.' }, { ru: 'Я тоже сплю.', de: 'Ich schlafe auch.' }] });
    out.arten = [readingTexteDerArt('ru').some(t => t.id === 'v-magazine'), readingTexteDerArt('de').every(t => t.art === 'de'), !readingTexteDerArt('ru').some(t => t.art)];
    setAppView('reading');
    // Liste
    const sp = body.querySelector('.rd-spalten'), gr = [...body.querySelectorAll('.rd-gruppe')];
    out.spalten = [!!sp, gr.length, gr.length > 1 && Math.abs(gr[0].getBoundingClientRect().top - gr[1].getBoundingClientRect().top) < 2, Math.round(document.getElementById('reading-view').getBoundingClientRect().width)];
    out.kopf = [...body.querySelectorAll('.rd-stufe small')].map(x => x.textContent);
    const k0 = body.querySelector('.rd-card');
    out.karte = [k0.querySelector('.rd-card-st').textContent, k0.querySelector('.rd-card-st').getBoundingClientRect().height < 24, !k0.querySelector('.rd-bar'), /neue Wörter/.test(k0.querySelector('.rd-card-de').textContent)];
    out.info = [!!document.getElementById('rd-intro'), !!body.querySelector('.rd-weiter')];
    out.modi = [...body.querySelectorAll('.rd-modus button')].map(x => x.dataset.modus).join();
    // Wortindex
    out.wort = ['магазине', 'сел', 'мою', 'буду', 'Со', 'болит', 'минут', 'Москве'].map(f => { const w = readKarte(f); return f + '→' + (w ? w.ru : '-'); }).join(' ');
    const mag = readingText('v-magazine'); out.neuZahl = readNeueWoerter(mag).length === readKartenText(mag).length && readKartenText(mag).length > 40;
    // Text öffnen, Wort antippen, Umschrift
    openText('v-magazine');
    const w = [...body.querySelectorAll('.rd-cur .rd-w')]; out.woerter = w.map(x => x.textContent).join(' ');
    w[0].click(); out.wortBox = (document.getElementById('rd-wort') || {}).textContent || '';
    transcriptionMode = 'letters'; renderReading(); out.tr = (body.querySelector('.rd-cur + .rd-tr') || {}).textContent || '';
    setTranscriptionMode('off'); out.trAus = !body.querySelector('.rd-tr');
    setCardSize('sehrgross'); out.gross = parseFloat(getComputedStyle(body.querySelector('.rd-text')).fontSize); setCardSize('auto'); out.normal = parseFloat(getComputedStyle(body.querySelector('.rd-text')).fontSize);
    // Tagesprotokoll
    const vorher = (loadDaylog()[dayKey()] || [0, 0])[0];
    readZeigen(); readRate(true); readZeigen(); readRate(false);
    out.tag = (loadDaylog()[dayKey()] || [0, 0])[0] - vorher;
    out.stand = JSON.stringify(loadReading()['v-magazine'].s);
    // Übungsart DE → RU: eigene Texte
    closeText(); setReadModus('de');
    out.deListe = [...body.querySelectorAll('.rd-card')].map(x => x.dataset.id).join() === readingTexteDerArt('de').map(t => t.id).join() && !body.querySelector('.rd-card[data-id="v-magazine"]');
    openText('probe-de');
    out.de = [readState.modus, localStorage.getItem(READING_MODE_KEY), body.querySelector('.rd-text').getAttribute('lang'), body.querySelector('.rd-cur').textContent.trim(), document.getElementById('rd-input').getAttribute('lang'), !body.querySelector('#reading-text .rd-modus'), /Übersetzen/.test(body.querySelector('.rd-art').textContent)];
    readZeigen(); out.deLoesung = [(body.querySelector('.rd-loesung-ru') || {}).textContent, body.querySelectorAll('.rd-loesung .rd-w').length > 0];
    readRate(true);
    // Hören: eigene Texte
    closeText(); setReadModus('hoer'); openText('probe-hoer');
    gesprochen.length = 0;
    out.hoer = [body.querySelectorAll('.rd-s.verdeckt').length, !!body.querySelector('.rd-hoer-btn'), body.querySelector('.rd-s.cur').getAttribute('aria-label')];
    taste('4'); out.vorgelesen = gesprochen.map(x => x[0]).pop() === 'Это кот.';
    body.querySelector('.rd-cur-hoer .tool-btn + .tool-btn').click(); out.langsam = gesprochen.pop()[1] < speakRate;
    readZeigen(); out.hoerOffen = [body.querySelectorAll('.rd-s.verdeckt').length, /Gehört/.test(body.querySelector('.rd-loesung').textContent), !!document.getElementById('rd-muster')];
    readRate(false);
    out.getrennt = Object.keys(loadReading()).sort().join();
    // Text einer anderen Art öffnen (Startseite, Weiterlernen) stellt den Reiter mit um
    openText('v-magazine'); out.artWechsel = [readState.modus, localStorage.getItem(READING_MODE_KEY)];
    // zurück zur Liste: Weiterlesen, Balken, „zuletzt“, Erklärung zu, Pfeiltasten
    closeText();
    const wl = body.querySelector('.rd-weiter');
    out.weiter = wl ? [wl.dataset.id, wl.textContent.replace(/\s+/g, ' ').trim()] : null;
    const km = body.querySelector('.rd-card[data-id="v-magazine"]');
    out.balken = [km.querySelectorAll('.rd-bar .ok, .rd-bar .no').length, km.querySelector('.rd-card-z').textContent, km.querySelector('.rd-card-st').textContent];
    out.infoZu = !document.getElementById('rd-intro'); body.querySelector('.rd-info-btn').click(); out.infoAuf = !!document.getElementById('rd-intro');
    taste('ArrowDown'); const f1 = document.activeElement; taste('ArrowDown'); const f2 = document.activeElement;
    out.pfeile = [f1.className, f2.className, f2.dataset.id];
    // Aufräumen beim Start: Lesestände vorhandener Texte bleiben, alte mit Zusatz (~de) fallen weg
    const pm = loadReading(); pm['v-magazine~de'] = { s: {}, z: 1, d: 0 }; saveReading(pm);
    pruneReading(); out.prune = Object.keys(loadReading()).sort().join();
    // ohne Texte einer Art: Hinweis
    const alle = TEXTE.splice(0); setReadModus('de'); out.leer = (body.querySelector('.rd-leer') || {}).textContent; TEXTE.push(...alle); setReadModus('ru');
    TEXTE.splice(TEXTE.findIndex(t => t.id === 'probe-de'), 1); TEXTE.splice(TEXTE.findIndex(t => t.id === 'probe-hoer'), 1);
    out.echte = [readingTexteDerArt('de').length === echteDe, readingTexteDerArt('hoer').length === echteHoer];
    // Startseite: „Sätze wiederholen“ erst nach ein paar Tagen
    const m = loadReading(); setAppView('home'); out.homeFrisch = !document.getElementById('home-read-due');
    m['v-magazine'].z = Date.now() - 3 * 864e5; saveReading(m); setAppView('home');
    const hb = document.getElementById('home-read-due'); out.homeAlt = [!!hb, /(Satz|Sätze) aus Texten/.test(document.getElementById('home-due').textContent)];
    if (hb) hb.click();
    out.homeKlick = [appView, readState.id, readState.modus, readState.i, readState.ende];
    // Stufenplan
    const lm = loadReading(); lm['v-magazine'].d = 1; saveReading(lm);
    openLevelOverview(); renderLevelPlan('A1');
    const li = [...document.querySelectorAll('#lvl-plan li')].find(x => /Texte A1/.test(x.textContent));
    out.plan = li ? li.textContent.replace(/\s+/g, ' ').trim() : '';
    if (li) li.querySelector('.lvl-link').click(); out.planKlick = [appView, readState.id];
    // Wörter dieses Texts üben
    openText('v-magazine'); document.getElementById('rd-woerter-btn').click();
    out.vokabeln = [appView, activeMain, getPool().length === readKartenText(mag).length, homePlanText(homeStats())];
    out.sicherung = BACKUP_KEYS.includes(READING_MODE_KEY);
    return out;
  });
  ok('Breiter Bildschirm: A1 und A2 in zwei Spalten nebeneinander, Bereich breiter', r.spalten[0] && r.spalten[1] >= 2 && r.spalten[2] && r.spalten[3] > 1000, JSON.stringify(r.spalten));
  ok('Kopf je Stufe: „x von y Texten gelesen“', r.kopf.every(x => /^\d+ von \d+ Texte?n? gelesen$/.test(x)), r.kopf.join(' | '));
  ok('Karte: Stand, Sätze und Dauer in einer Zeile, ohne Balken solange neu, neue Wörter genannt', /^neu · \d+ Sätze · ~\d+ Min\.$/.test(r.karte[0]) && r.karte[1] && r.karte[2] && r.karte[3], JSON.stringify(r.karte));
  ok('Erklärung offen beim ersten Mal, noch kein „Weiterlesen“; drei Übungsarten', r.info[0] && !r.info[1] && r.modi === 'ru,de,hoer', JSON.stringify(r.info) + ' ' + r.modi);
  ok('Formen finden ihre Karte (Tabellen, Endungen, Ausnahmen, со → с), Eigennamen nicht', r.wort === 'магазине→магазин сел→садиться / сесть мою→мой буду→быть Со→с болит→болеть минут→минута Москве→-', r.wort);
  ok('Neue Wörter je Text gegen den Gesamtstand', r.neuZahl);
  ok('Wörter im aktuellen Satz antippbar, Antippen zeigt Grundform, Übersetzung und Stufe', /Сегодня/.test(r.woerter) && /Сегодня/i.test(r.wortBox) && /heute/i.test(r.wortBox) && /A1/.test(r.wortBox), r.woerter + ' / ' + r.wortBox);
  ok('Umschrift nach dem Schalter (Buchstaben, aus)', /^Segodnja u menja/.test(r.tr) && r.trAus, r.tr);
  ok('„Größe der Lernkarte“ vergrößert die Schrift des Texts', r.gross > r.normal, r.gross + ' > ' + r.normal);
  ok('Bewertungen zählen ins Tagesprotokoll', r.tag === 2 && r.stand === '{"0":1,"1":0}', r.tag + ' ' + r.stand);
  ok('Jede Übungsart hat eigene Texte (Feld art, ohne = Lesen); Liste zeigt nur die Texte der Art', r.arten.every(Boolean) && r.deListe, JSON.stringify(r.arten) + r.deListe);
  ok('DE → RU: deutscher Text und Satz, russische Eingabe, Lösung = Original mit antippbaren Wörtern; im Text kein Reiter, nur die Art', r.de.join('|') === 'de|de|de|Heute habe ich einen freien Tag.|ru|true|true' && /Сегодня у меня свободный день/.test(r.deLoesung[0]) && r.deLoesung[1], JSON.stringify(r.de) + JSON.stringify(r.deLoesung));
  ok('Hören: Sätze verdeckt, Knopf „Satz anhören“, 4 liest vor, „langsam“ langsamer', r.hoer[0] === 3 && r.hoer[1] && /verdeckt/.test(r.hoer[2]) && r.vorgelesen && r.langsam, JSON.stringify(r.hoer));
  ok('Hören: Lösung zeigt den Satz und die Übersetzung', r.hoerOffen[0] === 2 && r.hoerOffen[1] && r.hoerOffen[2], JSON.stringify(r.hoerOffen));
  ok('Lesestand je Text (eigene Texte, keine Zusätze)', r.getrennt === 'probe-de,probe-hoer,v-magazine', r.getrennt);
  ok('Text einer anderen Art öffnen stellt den Reiter um', r.artWechsel.join() === 'ru,', JSON.stringify(r.artWechsel));
  ok('Liste: „Weiterlesen“ mit angefangenem Text oben', r.weiter && r.weiter[0] === 'v-magazine' && /2 von 22 Sätzen/.test(r.weiter[1]), JSON.stringify(r.weiter));
  ok('Karte mit Balken (gewusst/nicht gewusst), „zuletzt heute“, Restdauer', r.balken[0] === 2 && r.balken[1] === 'zuletzt heute' && /übrig$/.test(r.balken[2]), JSON.stringify(r.balken));
  ok('Erklärung danach zugeklappt, ⓘ klappt sie auf', r.infoZu && r.infoAuf);
  ok('↑/↓ springt von Text zu Text (zuerst „Weiterlesen“)', /rd-weiter/.test(r.pfeile[0]) && /rd-card/.test(r.pfeile[1]), JSON.stringify(r.pfeile));
  ok('Aufräumen beim Start: Lesestände vorhandener Texte bleiben, unbekannte Kennungen fallen weg', r.prune === 'probe-de,probe-hoer,v-magazine', r.prune);
  ok('Übungsart ohne Texte: Hinweis statt leerer Fläche', /Für „Übersetzen“ gibt es noch keine Texte|Noch keine Texte/.test(r.leer || ''), r.leer);
  ok('Probetexte wieder entfernt', r.echte.every(Boolean));
  ok('Startseite: „Sätze wiederholen“ erst nach ein paar Tagen, öffnet die nicht gewussten Sätze', r.homeFrisch && r.homeAlt.every(Boolean) && r.homeKlick.join() === 'reading,v-magazine,ru,1,false', JSON.stringify(r.homeAlt) + JSON.stringify(r.homeKlick));
  ok('Stufenplan: Punkt „Texte A1: x von y Texten gelesen“, Link öffnet die Texte', /Texte A1: 1 von \d+ Texten gelesen/.test(r.plan) && r.planKlick[0] === 'reading' && r.planKlick[1] === null, r.plan + ' ' + JSON.stringify(r.planKlick));
  ok('„Wörter dieses Texts üben“: eigene Runde in den Vokabeln mit den Karten des Texts', r.vokabeln[0] === 'vocab' && r.vokabeln[1] === 'textw' && r.vokabeln[2] && /Wörter aus „В магазине“/.test(r.vokabeln[3]), JSON.stringify(r.vokabeln));
  ok('Übungsart in der Sicherung', r.sicherung);
  // Handy
  for (const w of [320, 390]) {
    await p.setViewportSize({ width: w, height: 760 });
    const h = await p.evaluate(() => {
      setAppView('reading'); closeText();
      const ueber = () => [...document.querySelectorAll('#reading-view *')].filter(x => x.getBoundingClientRect().right > window.innerWidth + 1).length;
      const liste = ueber(); const mb = [...document.querySelectorAll('.rd-modus button')].map(x => Math.round(x.getBoundingClientRect().height));
      openText('u-vracha'); readZeigen(); const text = ueber(); closeText(); setReadModus('de'); const de = ueber(); setReadModus('ru');
      return [liste, text, de, Math.min(...mb)];
    });
    ok('Handy ' + w + ' px: Liste, Text und Liste DE → RU ohne Überlauf', h[0] + h[1] + h[2] === 0, JSON.stringify(h));
  }
  ok('Keine JS-Fehler', !errs.length, errs.join(' | '));
  await b.close();
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  const n = R.filter(x => x[0] === 'OK ').length; console.log('\n' + n + ' von ' + R.length + ' bestanden');
  process.exit(n === R.length ? 0 : 1);
})();
