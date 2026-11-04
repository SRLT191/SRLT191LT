const APP_PATH = require('path').resolve(__dirname, '..', 'index.html');
// Fixes der Gesamtprüfung 25.10. nachmittags: Sätze und Übersetzungen, Tippfehler-Farbe,
// Umbruch langer Eingaben, Tippflächen am Handy, russische Schrift in Wortauswahl, Wortstellung bei Besitz/Verneinung
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + APP_PATH); await p.waitForTimeout(300);
  const R = []; const check = async (n, f) => { try { const r = await f(); const ok = typeof r === 'object' ? r.ok : r; R.push([ok ? 'OK ' : 'XX ', n, r && r.info || '']); } catch (e) { R.push(['XX ', n, e.message]); } };
  const sent = w => p.evaluate(w => { const v = allVocabWords().find(x => x.ru === w || x.ru.split(' / ').includes(w)); return getWordSentence(v); }, w);
  await check('Sätze: keine Ziffern bei миллион/миллиард, грамм im Nominativ', async () => {
    const a = await sent('миллион'), b2 = await sent('миллиард'), c = await sent('грамм');
    return { ok: !/\d/.test(a.de + b2.de) && /Million/.test(a.de) && /Milliarde/.test(b2.de) && /^Один грамм/.test(c.ru), info: a.de + ' / ' + b2.de + ' / ' + c.ru };
  });
  await check('Sätze überarbeitet (встречать, слышать, ой, столько, средневековье, обещание)', async () => {
    const t = { 'встречать': /соседа/, 'слышать': /море/, 'ой': /больно/, 'столько': /унести/ };
    const de = { 'средневековье': /ist eine lange Epoche/, 'обещание': /sein Versprechen/, 'мыть': /abwaschen/, 'стеклянный': /aus Glas/, 'металлический': /aus Metall/ };
    const bad = [];
    for (const w in t) { const s = await sent(w); if (!t[w].test(s.ru)) bad.push(w); }
    for (const w in de) { const s = await sent(w); if (!de[w].test(s.de)) bad.push(w); }
    return { ok: !bad.length, info: bad.join(', ') };
  });
  await check('Übersetzungen: признак „Anzeichen“, исследовать „erforschen“, кипеть „kochen“', () => p.evaluate(() => {
    const d = w => allVocabWords().find(x => x.ru === w).de;
    return { ok: d('признак').includes('Anzeichen') && d('исследовать')[0] === 'erforschen' && d('кипеть')[0] === 'kochen', info: [d('признак'), d('исследовать'), d('кипеть')].join(' | ') };
  }));
  await check('neue Satzformen haben eine Stufe (соседа, парке, хлеба, веревкой, унести)', () => p.evaluate(() => {
    const f = ['соседа', 'парке', 'хлеба', 'веревкой', 'унести'].filter(x => !SENT_FORM_LEVEL.get(x));
    return { ok: !f.length, info: f.join(', ') };
  }));
  await check('Tippfehler im Satzvergleich: Farbe aus Variable, Kontrast hell und dunkel ≥ 4,5', () => p.evaluate(() => {
    const el = document.createElement('span'); el.className = 'diff-typo'; el.textContent = 'x'; document.body.appendChild(el);
    const L = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const out = [];
    for (const t of ['light', 'dark']) { document.documentElement.setAttribute('data-theme', t);
      const fg = getComputedStyle(el).color, bg = getComputedStyle(document.documentElement).getPropertyValue(t === 'dark' ? '--c-error-bg' : '--c-error-bg').trim();
      const tmp = document.createElement('div'); tmp.style.color = bg; document.body.appendChild(tmp); const bgc = getComputedStyle(tmp).color; tmp.remove();
      const a = L(fg), c = L(bgc); out.push((Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05)); }
    el.remove(); document.documentElement.setAttribute('data-theme', 'light');
    return { ok: out.every(x => x >= 4.5), info: out.map(x => x.toFixed(1)).join(' / ') };
  }));
  await check('lange falsche Eingabe bricht um statt die Seite zu verbreitern', () => p.evaluate(() => getComputedStyle(document.getElementById('sentence-diff')).overflowWrap === 'anywhere'));
  await check('Wortauswahl: russisches Wort mit lang="ru"; Knopf кто · весь russisch', () => p.evaluate(() => {
    setAppView('grammar'); showGrammarPanel('conjugate');
    const s = document.querySelector('#conj-verb-btn span span[lang="ru"]');
    return { ok: !!s && document.getElementById('pronform-scope-extra').lang === 'ru', info: s ? s.textContent : 'kein span' };
  }));
  await check('Besitz und Verneinung: umgestellte Wortstellung gilt auch', () => p.evaluate(() => {
    const out = [];
    for (const [typ, zeit] of [['negation', 'present'], ['negation', 'past'], ['possession', 'present'], ['possession', 'future']]) {
      wgState.tool = 'sentence'; wgState.type = typ; wgState.tense = zeit;
      const sb = SB_ITEMS.find(i => i.owner && i.adj && i.noun);
      const t = WG_BUILDERS[typ](sb);
      const umg = (t.alt || []).find(a => !a.toLowerCase().startsWith(sb.owner.toLowerCase()));
      out.push(typ + '/' + zeit + ': ' + (umg || '–'));
    }
    return { ok: out.every(x => !x.endsWith('–')), info: out.join(' · ') };
  }));
  await check('Handy: auch der Aussprache-Knopf hat eine 44-px-Tippfläche', async () => {
    const m = await b.newPage({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
    await m.goto('file://' + APP_PATH); await m.waitForTimeout(300);
    const r = await m.evaluate(() => { setAppView('vocab'); return ['speak-btn', 'transcription-btn', 'bookmark-btn', 'detail-btn'].map(id => { const a = getComputedStyle(document.getElementById(id), '::after'); return id + ' ' + a.height; }); });
    await m.close();
    return { ok: r.every(x => x.endsWith('44px')), info: r.join(', ') };
  });
  await check('keine JS-Fehler', () => ({ ok: errs.length === 0, info: errs.slice(0, 3).join(' | ') }));
  R.forEach(r => console.log(r[0], r[1], r[2] ? '· ' + r[2] : ''));
  console.log('\n' + R.filter(r => r[0] === 'OK ').length + ' von ' + R.length + ' bestanden');
  if (R.some(r => r[0] !== 'OK ')) process.exitCode = 1;
  await b.close();
})();
