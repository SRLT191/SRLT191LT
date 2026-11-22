const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Startseite 22.11.: Satzbau-Aufgaben als Satz, „Weiterlernen“ ohne Kategorie im Knopf, Wiederholen in Portionen,
// Vorschau „noch heute +N“, Ring neben der Zahl, Grammatik heute/nie geübt, häufigste falsche Antwort,
// „Zuletzt geübt“ über die ganze Breite, Grammatikliste wie die Wortliste
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const R = []; const errs = [];
  const ok = (n, c, i) => R.push([c ? 'OK ' : 'XX ', n, i || '']);
  const p = await b.newPage({ viewport: { width: 1700, height: 1400 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const now = Date.now(), D = 864e5, lt = loadLifetime(), ws = allVocabWords();
    // 300 fällige Wörter: Stufen 3, 2, 1 im Wechsel; die ersten 12 oft falsch
    ws.slice(0, 300).forEach((w, i) => { lt.v[getKey(w)] = { c: 3, w: 1, mb: 2, l: now - 30 * D, d: 3 - (i % 3), dd: now - 20 * D - i * 1000, z: now - 2 * D, f: i < 12 ? 15 - i : 0 }; });
    lt.g['sb:negation'] = { 'negation#100': { c: 1, w: 3, mb: 1, l: now - 5 * D, d: 1, dd: now - 5 * D, z: now - 60e3, f: 3 } };
    lt.g['sb:sentence'] = { 'sentence#0': { c: 1, w: 3, mb: 1, l: now - 5 * D, d: 1, dd: now - 5 * D, z: now - 2 * D, f: 2 } };
    saveLifetime(); flushSaves();
    const out = {};
    // 8: falsche Antworten aufzeichnen (Mehrfachauswahl und Eintippen laufen über noteFehlantwort)
    noteFehlantwort(ws[0], ' Erzählen '); noteFehlantwort(ws[0], 'erzählen'); noteFehlantwort(ws[0], 'zeigen'); noteFehlantwort(ws[1], 'x'); flushSaves();
    out.gespeichert = JSON.parse(localStorage.getItem('vokabeltrainer-fehlantworten'))[getKey(ws[0])];
    out.merge = JSON.parse(mergeBackupValue('vokabeltrainer-fehlantworten', JSON.stringify({ a: { x: 2, y: 1 } }), JSON.stringify({ a: { x: 1, z: 4 }, b: { q: 1 } })));
    out.inBackup = BACKUP_KEYS.includes('vokabeltrainer-fehlantworten') && BACKUP_KEYS.includes('vokabeltrainer-due-portion');
    setAppView('home');
    const q = s => document.querySelector(s);
    out.gTexte = [...document.querySelectorAll('.home-hard-g-row b')].map(x => [x.textContent, x.lang]);
    out.go = q('.home-go').textContent.trim(); out.goTitle = q('.home-go').title; out.plan = q('#home-plan').textContent;
    out.due = q('#home-go-due').textContent.replace(/\s+/g, ' ').trim();
    out.fa = [...document.querySelectorAll('.home-hard-fa')].map(x => x.textContent);
    out.fc0 = (q('#home-forecast .home-wl span') || {}).textContent;
    const top = q('#home-today .home-today-top'), ring = q('#home-today .home-ring'), big = q('#home-today .home-big');
    out.ring = !!(top && top.contains(ring) && top.contains(big)) || !ring;
    out.gHeute = q('#home-g-heute').textContent; out.nie = [...document.querySelectorAll('#home-g-nie button')].map(x => x.textContent.trim());
    const z = q('#home-zuletzt').getBoundingClientRect(), grid = q('.home-grid').getBoundingClientRect();
    out.zuletztBreit = Math.abs(z.width - grid.width) < 2;
    const fs = s => parseFloat(getComputedStyle(q(s)).fontSize);
    out.gleich = [fs('.home-hard > div'), fs('.home-hard-g-row')];
    out.mehrKlasse = [...document.querySelectorAll('#home-hard .home-hard-mehr')].length;
    // 4: Portion – „Wiederholen“ nimmt 100, dringendste (Stufe 1) zuerst
    homeStartPool('due'); out.pool = homePool.length; out.stufen = homePool.map(w => lifeVocabEntry(w).d);
    setAppView('home'); homeStartPool('due', 'alt'); out.alt = homePool.length;
    setDuePortion(0); setAppView('home'); out.alleText = q('#home-go-due').textContent.replace(/\s+/g, ' ').trim(); homeStartPool('due'); out.alle = homePool.length;
    out.gespeichertPortion = localStorage.getItem('vokabeltrainer-due-portion');
    setDuePortion(50); setAppView('home');
    // 7: Knopf „noch nie geübt“ öffnet das Werkzeug
    const nieBtn = document.querySelector('#home-g-nie button'); nieBtn.click(); out.nieOffen = appView === 'grammar';
    setAppView('home');
    return out;
  });
  ok('1: Satzbau-Aufgabe als Satz statt Kennung (russisch, sonst deutsch)', r.gTexte.length >= 2 && r.gTexte.every(([t]) => !/#\d/.test(t)) && r.gTexte.some(([t, l]) => /никого/.test(t) && l === 'ru') && r.gTexte.some(([t, l]) => /neues Buch/.test(t) && l === 'de'), JSON.stringify(r.gTexte));
  ok('2: Knopf nur „Weiterlernen“, Ziel im Tooltip und in der Zeile darunter', r.go === 'Weiterlernen' && /^Weiterlernen · /.test(r.goTitle) && r.plan.length > 5, r.go + ' | ' + r.goTitle + ' | ' + r.plan);
  ok('4: Kopfknopf „Wiederholen · 100 von 300“', r.due.replace(/\s*·\s*/, ' · ') === 'Wiederholen · 100 von 300', r.due);
  ok('4: Portion 100, Stufe 1 zuerst', r.pool === 100 && r.stufen.every(d => d === 1), r.pool + ' · ' + [...new Set(r.stufen)]);
  ok('4: „Älteste zuerst“ ebenfalls als Portion', r.alt === 100, r.alt);
  ok('4: „alle“ nimmt alle 300 und zeigt „300 fällig“, Einstellung gemerkt', r.alle === 300 && /300 fällig/.test(r.alleText) && r.gespeichertPortion === '0', r.alleText + ' · ' + r.gespeichertPortion);
  ok('5: Vorschau beginnt mit „noch heute“', r.fc0 === undefined || r.fc0 === 'noch heute', r.fc0);
  ok('6: Ring direkt neben der Zahl', r.ring);
  ok('7: Heute geübte Grammatik je Bereich', /^Heute geübt: Sätze 1$/.test(r.gHeute.trim()), r.gHeute);
  ok('7: Noch nie geübte Bereiche mit Knopf, der das Werkzeug öffnet', r.nie.includes('Adjektive') && !r.nie.includes('Sätze') && r.nieOffen, r.nie.join(', '));
  ok('8: falsche Antworten gezählt (klein, getrimmt, höchstens 5 je Wort)', r.gespeichert && r.gespeichert['erzählen'] === 2 && r.gespeichert['zeigen'] === 1, JSON.stringify(r.gespeichert));
  ok('8: Zusammenführen je Antwort das Höhere, Schlüssel in der Sicherung', r.merge.a.x === 2 && r.merge.a.z === 4 && r.merge.b.q === 1 && r.inBackup, JSON.stringify(r.merge));
  ok('8: „oft: …“ bei Wörtern ab 10 Fehlern mit Antwort ab 2×', r.fa.length === 1 && /erzählen/.test(r.fa[0]), r.fa.join(' | '));
  ok('9: „Zuletzt geübt“ über die ganze Breite', r.zuletztBreit);
  ok('10: Grammatikliste in derselben Schrift wie die Wortliste', r.gleich[0] === r.gleich[1], r.gleich.join(' / '));

  // präparierte Fehlantworten: nichts wird ausgeführt
  const c = await b.newContext({ viewport: { width: 1400, height: 1200 } }); const q2 = await c.newPage(); const e2 = []; q2.on('pageerror', e => e2.push(e.message));
  await q2.addInitScript(() => { if (!localStorage.getItem('__s')) { localStorage.setItem('__s', '1'); } });
  await q2.goto('file://' + APP_PATH); await q2.waitForTimeout(300);
  const boese = await q2.evaluate(() => {
    const w = allVocabWords()[0], k = getKey(w), lt = loadLifetime();
    lt.v[k] = { c: 1, w: 12, mb: 1, l: 1, d: 1, dd: Date.now(), z: Date.now(), f: 12 }; saveLifetime(); flushSaves();
    localStorage.setItem('vokabeltrainer-fehlantworten', JSON.stringify({ [k]: { '<img src=x onerror="window.__x=1">': 5 } })); fehlMem = null;
    setAppView('home');
    return { x: !!window.__x, img: !!document.querySelector('#home-hard img'), text: (document.querySelector('.home-hard-fa') || {}).textContent };
  });
  ok('8: präparierte Antwort wird als Text gezeigt, nichts ausgeführt', !boese.x && !boese.img && /<img/.test(boese.text || ''), JSON.stringify(boese));
  ok('Keine JS-Fehler', !errs.length && !e2.length, errs.concat(e2).slice(0, 2).join(' | '));
  R.forEach(x => console.log(x[0], x[1], x[2] ? '· ' + x[2] : ''));
  console.log('\n' + R.filter(x => x[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  await b.close();
})();
