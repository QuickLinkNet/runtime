# Spielregeln

Zwei Spieler beginnen mit je 30 Core-Integrität und einem validen 30-Karten-Deck aus genau zwei Tech-Domains plus neutralen Karten. Maximal zwei Kopien derselben Karte sind erlaubt.

Nach drei Startkarten wählen beide Spieler ihren Mulligan. Der zweite Spieler erhält zusätzlich `BOOTSTRAP`. Compute wächst zu Beginn des eigenen Zuges um eins bis maximal zehn, wird aufgefüllt und anschließend wird eine Karte gezogen.

Pro Seite gibt es fünf Service- und zwei Infrastructure-Slots sowie maximal zehn Handkarten. Services können ab dem nächsten eigenen Zug einmal angreifen. Im Service-Kampf wird Schaden gleichzeitig ausgetauscht. FIREWALL schützt den Core, REDUNDANCY verhindert eine Schadensinstanz, SANDBOX deaktiviert Angriff und Effekte bis zum nächsten eigenen Zug.

Weitere Keywords: DEPLOY beim normalen Ausspielen, CRASH beim Zerstören, PATCH als Heilung, FORK als Kopie ohne erneuten DEPLOY und OVERCLOCK als optionale Mehrkosten.

DEBUG kostet ein Compute und entfernt einen eigenen BUG. Bei voller Hand landet eine gezogene Karte im Trash. Ein fehlgeschlagener Draw verursacht ansteigenden MEMORY-LEAK-Schaden. Core-Integrität von null beendet das Match sofort.

Multiplayer-Züge dauern 75 Sekunden. Drei aufeinanderfolgende eigene Timeouts führen zur Niederlage. Es ist kein Hintergrundprozess nötig; jeder relevante Request prüft die Deadline.
