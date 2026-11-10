#!/usr/bin/env bash
# Führt alle Prüfungen aus. Ausgabe: eine Zeile je Prüfung; Exit-Code 1, wenn eine fehlschlägt.
cd "$(dirname "$0")"
fehler=0
lauf() {
  local name="$1"; shift
  local out code
  out=$(timeout 300 node "$@" 2>&1); code=$?
  local grund=""
  [ $code -ne 0 ] && grund="Exit-Code $code"
  echo "$out" | grep -q '^XX ' && grund="fehlgeschlagene Einzelprüfung"
  echo "$out" | grep -qE "\[ ?'" && grund="JS-Fehler oder Fund"
  echo "$out" | grep -qE 'fehlende Handler: \[[^]]' && grund="Knopf ohne Funktion"
  [ "$name" = schmalansicht ] && ! echo "$out" | grep -q 'kein Überlauf' && grund="Überlauf"
  [ "$name" = dunkelansicht ] && echo "$out" | grep -qE '[1-9][0-9]* verschiedene Stellen' && grund="Kontrast"
  if [ -n "$grund" ]; then
    echo "FEHLER  $name ($grund)"
    # Zeilen mit dem Fund; bei reinem Exit-Code auch Zeilen mit typischen Fundwörtern (pruefen-knoepfe u. a.)
    echo "$out" | grep -E '^XX |\[ ?'"'"'|ÄNDERT|BLEIBT|ERNEUT|ZÄHLT ALS RICHTIG|: \?|^\?\? |Werkzeuge ohne' | grep -v 'Werkzeuge ohne Prüfen-Prüfung: keine' | head -8 | sed 's/^/        /'; fehler=1
  else
    echo "ok      $name — $(echo "$out" | grep -E 'bestanden|kein Überlauf|verschiedene Stellen' | tail -1)"
  fi
}
for f in *.js; do
  case "$f" in
    richtungen.js) lauf "richtungen-ru" "$f" ru; lauf "richtungen-de" "$f" de ;;
    *) lauf "${f%.js}" "$f" ;;
  esac
done
exit $fehler
