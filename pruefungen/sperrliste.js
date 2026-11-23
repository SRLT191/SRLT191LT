// Sperrliste (23.11.): Diese Wörter kommen nirgends in die App – nicht in Wortschatz, Beispielsätze, Satzbau, Texte oder Infotexte.
// Durchsucht wird die ganze index.html, Groß-/Kleinschreibung egal, auch abgeleitete Formen (израильский, Israeli …).
// Neue Einträge nur auf ausdrücklichen Wunsch des Besitzers.
const fs = require('fs');
const path = require('path');

const SPERRLISTE = [
  { name: 'Israel', muster: /израил|israel|israil/i },
];

let fehler = 0, n = 0;
const ok = (name, bed, info) => { n++; if (bed) console.log('OK  ' + name); else { fehler++; console.log('XX ' + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); } };

const quelle = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

function funde(text, muster) {
  const g = new RegExp(muster.source, 'gi'), out = [];
  text.split('\n').forEach((z, i) => { if (g.test(z)) out.push((i + 1) + ': ' + z.trim().slice(0, 80)); g.lastIndex = 0; });
  return out;
}

for (const e of SPERRLISTE) {
  const f = funde(quelle, e.muster);
  ok('gesperrt: ' + e.name + ' kommt in index.html nicht vor', f.length === 0, f.slice(0, 5));
}

// Gegenprobe: eingesetzte Formen werden gefunden
const probe = ['{ru:"Израиль", de:["Israel"]}', "{ ru: 'Он был в Израиле.' }", 'израильский', 'ISRAELI', 'Азербайджан'].join('\n');
const gefunden = funde(probe, SPERRLISTE[0].muster).length;
ok('Gegenprobe: vier eingesetzte Formen werden gefunden', gefunden === 4, gefunden);

console.log(n - fehler + ' von ' + n + ' bestanden');
process.exit(fehler ? 1 : 0);
