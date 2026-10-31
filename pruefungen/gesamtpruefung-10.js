const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Gesamtprüfung 1.11.: Satzstufe nie unter dem Zielwort, Geschlecht nimmt „Adjektiv + Substantiv“ auf,
// Satz-Dubletten, Kontrast der Grautöne, keine undefinierten Farbvariablen, Vokabelliste als ein Block,
// kein Vorlesen auf „Heute“, feste Knopfhöhe, Anhören nach dem Prüfen, Lücke für Vorleseprogramme,
// Rundenende mit Fehlerliste in Geschlecht, Kasus wählen und Bewegungsverben-Wahl
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  const gesprochen = [];
  await p.exposeFunction('__said', t => gesprochen.push(t));
  await p.addInitScript(() => {
    // Sprachausgabe mitschreiben (auch beim Start)
    const S = window.speechSynthesis; if (S) { const orig = S.speak.bind(S); S.speak = u => { window.__said(u.text); try { orig(u); } catch (e) {} }; }
  });
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(500);
  ok('9 beim Start auf „Heute“ wird nichts vorgelesen', gesprochen.length === 0 && await p.evaluate(() => appView === 'home'), JSON.stringify(gesprochen));
  await p.evaluate(() => { autoplayAudio = true; setDirection('ru-de'); setAppView('vocab'); });
  await p.waitForTimeout(100);
  ok('9 beim Wechsel zu den Vokabeln wird die Karte vorgelesen', gesprochen.length >= 1, JSON.stringify(gesprochen));

  const d = await p.evaluate(() => {
    const out = {};
    // 1 Satzstufen
    const unter = []; SENTENCE_PAIRS.forEach(p => (p.targets || []).forEach(t => { const w = findVocabEntry(t); if (w && levelIdx(sentenceLevel(p.ru, p.targets)) < levelIdx(wordLevel(w))) unter.push(p.ru); }));
    const pool = buildDictationPool(); const kr = pool.find(x => x.ru === 'Мы стоим у кратера.'), am = pool.find(x => x.ru === 'Америка очень большая.');
    out.s1 = { unter: unter.length, krater: kr && kr.lvl, amerika: am && am.lvl, amerikaOhneZiel: sentenceLevel('Америка очень большая.') };
    // 2 Geschlecht
    const g = genderPool(); const find = r => (g.find(x => x.ru === r) || {}).g;
    out.s2 = { старик: find('старик'), девушка: find('девушка'), вакансия: find('вакансия'), юноша: find('юноша'), полвека: find('полвека') || null, verb: g.some(x => x.ru === 'шутить'), n: g.length };
    // 3/4 Sätze
    const c = {}; SENTENCE_PAIRS.forEach(p => c[p.ru] = (c[p.ru] || 0) + 1); out.s3 = Object.keys(c).filter(k => c[k] > 1);
    out.s4 = (SENTENCE_PAIRS.find(p => p.ru === 'Сегодня непогода.') || {}).de;
    // 6 undefinierte Variablen
    const css = [...document.styleSheets].map(sh => { try { return [...sh.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    const used = new Set((css.match(/var\((--[\w-]+)\)/g) || []).map(x => x.slice(4, -1)));
    const st = getComputedStyle(document.documentElement);
    out.s6 = [...used].filter(v => !['--gt-p', '--p', '--sidebar-w', '--sub-p'].includes(v) && !st.getPropertyValue(v).trim());
    return out;
  });
  ok('1 kein Beispielsatz leichter als sein Zielwort (Krater C1, Amerika B1 auch ohne Zielwort)', d.s1.unter === 0 && d.s1.krater === 'C1' && d.s1.amerika === 'B1' && d.s1.amerikaOhneZiel === 'B1', JSON.stringify(d.s1));
  ok('2 Geschlecht: „alter Mann“, „junge Frau“, „offene Stelle“ dabei, юноша männlich, полвека nicht', d.s2.старик === 'm' && d.s2.девушка === 'f' && d.s2.вакансия === 'f' && d.s2.юноша === 'm' && !d.s2.полвека && !d.s2.verb, JSON.stringify(d.s2));
  ok('3 keine doppelten Satzpaare', d.s3.length === 0, d.s3.join(' | '));
  ok('4 непогода: „Heute herrscht Unwetter.“', d.s4 === 'Heute herrscht Unwetter.', d.s4);
  ok('6 keine undefinierten Farbvariablen', d.s6.length === 0, d.s6.join(', '));

  // 5 Kontrast der Grautöne im hellen Design
  const k = await p.evaluate(() => {
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2] }; };
    const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const cs = getComputedStyle(document.documentElement), out = {};
    ['--c-text-tertiary', '--c-text-muted', '--c-text-faint'].forEach(v => { const el = document.createElement('span'); el.style.color = 'var(' + v + ')'; document.body.appendChild(el);
      const f = lum(parse(getComputedStyle(el).color)); el.remove();
      out[v] = ['--c-surface', '--c-surface-alt', '--c-surface-soft', '--c-bg'].map(bg => { const e2 = document.createElement('span'); e2.style.color = cs.getPropertyValue(bg) ? 'var(' + bg + ')' : '#fff'; document.body.appendChild(e2); const l = lum(parse(getComputedStyle(e2).color)); e2.remove(); return +((Math.max(f, l) + .05) / (Math.min(f, l) + .05)).toFixed(2); }); });
    setAppView('grammar'); showGrammarPanel('casedrill'); out.hintOpacity = getComputedStyle(document.querySelector('.case-question .case-hint') || document.body).opacity;
    return out;
  });
  ok('5 graue Schrift im hellen Design ≥ 4,5 : 1 auf allen Flächen, Hinweis ohne Abblenden', Object.values(k).filter(Array.isArray).every(a => a.every(x => x >= 4.5)) && k.hintOpacity === '1', JSON.stringify(k));

  // 8 Vokabelliste als ein Block, Klick öffnet Details
  const v = await p.evaluate(async () => { setAppView('vocab'); openVocabList(); const rows = document.querySelectorAll('#vocab-table-body tr[data-i]'); const r2 = rows[2]; r2.querySelector('td').click();
    const det = document.getElementById('overlay-worddetail').classList.contains('open') && document.getElementById('wd-ru').textContent === vocabListRows[2].ru;
    closeOverlay('overlay-worddetail'); const bm = rows[3].querySelector('.bookmark-mini-btn'); const vorher = document.getElementById('overlay-worddetail').classList.contains('open'); bm.click(); const nachBm = document.getElementById('overlay-worddetail').classList.contains('open');
    toggleBookmark(vocabListRows[3].ru); closeOverlay('overlay-vocab'); await new Promise(r => setTimeout(r, 30)); return { n: rows.length, det, bmOhneDetails: !vorher && !nachBm, leer: vocabListRows.length }; });
  ok('8 Vokabelliste: alle Zeilen, Klick auf Zeile öffnet Details, Merken-Knopf nicht', v.n > 3000 && v.det && v.bmOhneDetails && v.leer === 0, JSON.stringify(v));
  const wk = await p.evaluate(() => { setAppView('home'); return { karte: !!document.getElementById('home-weeksum'), fn: typeof homeWeekCard }; });
  ok('8 Startseite: Wochenkarte aus eigener Funktion', wk.karte && wk.fn === 'function', JSON.stringify(wk));

  // 10/11/12 Umformen
  const u = await p.evaluate(() => { setAppView('grammar'); openTransform(); const h = () => [...document.querySelectorAll('#overlay-transform .gt-actions .tool-btn')].map(b => Math.round(b.getBoundingClientRect().height)).join(',');
    const sr = (document.querySelector('#transform-gap .sr-only') || {}).textContent; const h0 = h(); const it = transformState.queue[0]; const said = []; const o = window.speak; window.speak = t => said.push(t);
    speakTransform(); document.getElementById('transform-input').value = 'qqq'; checkTransform(); speakTransform(); window.speak = o; return { h0, h1: h(), sr, said, from: it.from, answer: it.answer }; });
  ok('10 Knopfzeile in Umformen bleibt gleich hoch', u.h0 === u.h1, u.h0 + ' → ' + u.h1);
  ok('11 Anhören: vor dem Prüfen Ausgangsform, danach Lösung', u.said[0] === u.from && u.said[1] === u.answer, JSON.stringify(u.said));
  ok('12 Lücke als Text für Vorleseprogramme', u.sr === 'Lücke', String(u.sr));

  // 13 Rundenende mit Fehlerliste
  const r = await p.evaluate(() => {
    const out = {};
    // Geschlecht: 1 falsch, 1 aufgedeckt, 1 übersprungen, Rest richtig
    setAppView('grammar'); openGender(); restartGender(); const gs = genderState;
    const falsch = g => ['m', 'f', 'n', 'pl'].find(x => x !== g);
    answerGender(falsch(gs.queue[0].g)); nextGender(); revealGender(); nextGender(); nextGender();
    while (gs.index < gs.queue.length) { answerGender(gs.queue[gs.index].g); nextGender(); }
    out.gender = { li: document.querySelectorAll('#gender-q .gt-fehler li').length, btn: !!document.getElementById('gender-repeat-btn'), done: document.getElementById('overlay-gender').classList.contains('gt-done') };
    document.getElementById('gender-repeat-btn').click(); out.genderWdh = [gs.queue.length, gs.index, document.getElementById('overlay-gender').classList.contains('gt-done')];
    // Kasus wählen
    openCaseDrill(); setCaseMode('abstract'); const cs = caseState; const n = cs.queue.length;
    gtChoose(CASE_CHOICE, CASE_LABELS.find(k => k !== cs.queue[0].kasus)); gtChoiceNext(CASE_CHOICE);
    while (cs.index < cs.queue.length) { gtChoose(CASE_CHOICE, cs.queue[cs.index].kasus); gtChoiceNext(CASE_CHOICE); }
    out.kasus = { n, li: document.querySelectorAll('#case-question .gt-fehler li').length, btn: !!document.getElementById('case-repeat-btn') };
    setCaseMode('word'); out.kasusWort = !document.getElementById('overlay-casedrill').classList.contains('gt-done'); setCaseMode('abstract');
    // Bewegungsverben-Wahl
    openMotion(); setMotionMode('quiz'); restartMotionQuiz(); const ms = motionState;
    while (ms.qIndex < ms.queue.length) { if (ms.qIndex < 2) gtChoiceReveal(MOTION_CHOICE); else gtChoose(MOTION_CHOICE, ms.queue[ms.qIndex].correct); gtChoiceNext(MOTION_CHOICE); }
    out.motion = { li: document.querySelectorAll('#motion-q .gt-fehler li').length, btn: !!document.getElementById('motion-repeat-btn'), aktionen: getComputedStyle(document.querySelector('#motion-quiz-view .gt-actions')).display };
    document.getElementById('motion-repeat-btn').click(); out.motionWdh = [ms.queue.length, ms.qIndex];
    setMotionMode('pair'); out.motionPaar = getComputedStyle(document.querySelector('#motion-pair-view .conj-row') || document.body).display;
    return out;
  });
  ok('13 Geschlecht: Fehlerliste (falsch, aufgedeckt, übersprungen) und „Fehler wiederholen“', r.gender.li === 3 && r.gender.btn && r.gender.done && r.genderWdh.join() === '3,0,false', JSON.stringify([r.gender, r.genderWdh]));
  ok('13 Kasus wählen: Fehlerliste, Wort-Modus danach nicht ausgeblendet', r.kasus.li === 1 && r.kasus.btn && r.kasusWort, JSON.stringify([r.kasus, r.kasusWort]));
  ok('13 Bewegungsverben-Wahl: Fehlerliste, Knöpfe ausgeblendet, Partner-Modus sichtbar', r.motion.li === 2 && r.motion.btn && r.motion.aktionen === 'none' && r.motionWdh.join() === '2,0' && r.motionPaar !== 'none', JSON.stringify([r.motion, r.motionWdh, r.motionPaar]));

  ok('Keine JS-Fehler', errs.length === 0, errs.slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
