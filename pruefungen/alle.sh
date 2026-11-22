#!/usr/bin/env bash
# Führt alle Prüfungen aus. Ausgabe: eine Zeile je Prüfung, in fester Reihenfolge; Exit-Code 1, wenn eine fehlschlägt.
# JOBS=n: so viele Prüfungen gleichzeitig (Standard: Anzahl der Kerne).
# SEED=n: Startwert für den Zufall in der App (Standard 1, jeder Lauf zieht dasselbe);
#         SEED=zufall: neuen Startwert ziehen; SEED=aus: echter Zufall ohne Startwert.
cd "$(dirname "$0")"
JOBS=${JOBS:-$(nproc 2>/dev/null || echo 2)}
SEED=${SEED:-1}
[ "$SEED" = zufall ] && SEED=$(( (RANDOM << 15 | RANDOM) % 1000000 + 1 ))
export SEED
echo "Startwert: $SEED · $JOBS gleichzeitig"
[ -n "$GITHUB_OUTPUT" ] && echo "seed=$SEED" >> "$GITHUB_OUTPUT"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

pruefe() {  # $1 Nummer, $2 Name, Rest: Datei und Argumente
  local nr="$1" name="$2"; shift 2
  local out code grund=""
  out=$(timeout 300 node -r ./zufall.js "$@" 2>&1); code=$?
  [ $code -ne 0 ] && grund="Exit-Code $code"
  echo "$out" | grep -q '^XX ' && grund="fehlgeschlagene Einzelprüfung"
  echo "$out" | grep -qE "\[ ?'" && grund="JS-Fehler oder Fund"
  echo "$out" | grep -qE 'fehlende Handler: \[[^]]' && grund="Knopf ohne Funktion"
  [ "$name" = schmalansicht ] && ! echo "$out" | grep -q 'kein Überlauf' && grund="Überlauf"
  [ "$name" = dunkelansicht ] && echo "$out" | grep -qE '[1-9][0-9]* verschiedene Stellen' && grund="Kontrast"
  {
    if [ -n "$grund" ]; then
      echo "FEHLER  $name ($grund)"
      # Zeilen mit dem Fund; bei reinem Exit-Code auch Zeilen mit typischen Fundwörtern (pruefen-knoepfe u. a.)
      echo "$out" | grep -E '^XX |\[ ?'"'"'|ÄNDERT|BLEIBT|ERNEUT|ZÄHLT ALS RICHTIG|: \?|^\?\? |Werkzeuge ohne' | grep -v 'Werkzeuge ohne Prüfen-Prüfung: keine' | head -8 | sed 's/^/        /'
      touch "$tmp/fehler"
    else
      echo "ok      $name — $(echo "$out" | grep -E 'bestanden|kein Überlauf|verschiedene Stellen' | tail -1)"
    fi
  } > "$tmp/$nr.txt.part"
  mv "$tmp/$nr.txt.part" "$tmp/$nr.txt"
}

# Liste der Läufe: Name und Aufruf
namen=(); aufrufe=()
neu() { namen+=("$1"); shift; aufrufe+=("$*"); }
for f in *.js; do
  case "$f" in
    zufall.js) ;;
    richtungen.js) neu richtungen-ru "$f" ru; neu richtungen-de "$f" de ;;
    aufgaben-erzeugt.js) for t in 1 2 3 4; do neu "aufgaben-erzeugt-$t" "$f" $t; done ;;
    *) neu "${f%.js}" "$f" ;;
  esac
done

# Langsame Läufe zuerst starten, die Ausgabe bleibt trotzdem in der Reihenfolge der Liste
reihe=()
for i in "${!namen[@]}"; do case "${namen[$i]}" in aufgaben-erzeugt-*|speicher-beschaedigt|einstufungstest|pc-design|klickdurchlauf) reihe+=("$i") ;; esac; done
for i in "${!namen[@]}"; do case "${namen[$i]}" in aufgaben-erzeugt-*|speicher-beschaedigt|einstufungstest|pc-design|klickdurchlauf) ;; *) reihe+=("$i") ;; esac; done

gedruckt=0
drucke() { while [ $gedruckt -lt ${#namen[@]} ] && [ -f "$tmp/$gedruckt.txt" ]; do cat "$tmp/$gedruckt.txt"; gedruckt=$((gedruckt + 1)); done; }
laufend=0
for i in "${reihe[@]}"; do
  # shellcheck disable=SC2086
  pruefe "$i" "${namen[$i]}" ${aufrufe[$i]} &
  laufend=$((laufend + 1))
  if [ $laufend -ge "$JOBS" ]; then wait -n; laufend=$((laufend - 1)); drucke; fi
done
wait
drucke
if [ -f "$tmp/fehler" ]; then
  echo "Mindestens eine Prüfung ist fehlgeschlagen. Nachstellen: SEED=$SEED bash pruefungen/alle.sh"
  exit 1
fi
exit 0
