# Spielregeln

Zwei Spieler beginnen mit je 30 Core-Integrität und einem validen 30-Karten-Deck aus genau zwei Tech-Domains plus neutralen Karten. Maximal zwei Kopien derselben Karte sind erlaubt.

## Kartenarten und Domains

Jede Karte besitzt genau einen Kartentyp: **Service**, **Command** oder **Infrastructure**. Services und Infrastructure werden in die jeweils passenden Board-Slots ausgespielt. Commands werden einmalig ausgeführt und anschließend in den Trash gelegt.

Die sechs wählbaren Tech-Domains sind **Frontend**, **Backend**, **DevOps**, **Data**, **Security** und **AI**. Die sichtbare Domain **DevOps** wird intern aus Kompatibilitätsgründen weiterhin mit dem technischen Schlüssel `infrastructure` gespeichert. Sie ist nicht mit dem Kartentyp Infrastructure gleichzusetzen: Eine DevOps-Karte kann beispielsweise ein Service, Command oder eine Infrastructure sein.

**Neutral** ist eine frei verwendbare Sonderkategorie und zählt nicht als gewählte Tech-Domain. **Token** ist ebenfalls kein Kartentyp, sondern kennzeichnet erzeugte Karten, die nicht in ein Deck aufgenommen werden können. Ein Token ist weiterhin entweder ein Service oder ein Command.

Beide Spieler sehen beim Mulligan ihre fünf normalen Startkarten und dürfen beliebig viele davon einmal ersetzen. Beim ersten eigenen Zug wird keine weitere Karte gezogen, damit Mulligan und tatsächliche Starthand übereinstimmen. Der zweite Spieler erhält zusätzlich `BOOTSTRAP`. Compute wächst in jedem eigenen Zug um eins bis maximal zehn; ab dem zweiten eigenen Zug wird außerdem eine Karte gezogen.

Jede Seite besitzt zwei Infrastructure-Slots. Sind beide belegt, kann eine neue Infrastructure ausgespielt werden, indem eine eigene bestehende Infrastructure als Ersatz gewählt wird. Die ersetzte Karte wandert in den Trash.

Pro Seite gibt es fünf Service- und zwei Infrastructure-Slots sowie maximal zehn Handkarten. Services können ab dem nächsten eigenen Zug einmal angreifen. Im Service-Kampf wird Schaden gleichzeitig ausgetauscht. FIREWALL schützt den Core, REDUNDANCY verhindert eine Schadensinstanz, SANDBOX deaktiviert Angriff und Effekte bis zum nächsten eigenen Zug.

Weitere Keywords: DEPLOY beim normalen Ausspielen, CRASH beim Zerstören, PATCH als Heilung, FORK als Kopie ohne erneuten DEPLOY und OVERCLOCK als optionale Mehrkosten.

DEBUG kostet ein Compute und entfernt einen eigenen BUG. Bei voller Hand landet eine gezogene Karte im Trash. Ein fehlgeschlagener Draw verursacht ansteigenden MEMORY-LEAK-Schaden. Core-Integrität von null beendet das Match sofort.

Multiplayer-Züge dauern 75 Sekunden. Drei aufeinanderfolgende eigene Timeouts führen zur Niederlage. Es ist kein Hintergrundprozess nötig; jeder relevante Request prüft die Deadline.

## Geführtes Tutorial

Das Tutorial besteht aus acht deterministischen Spielsituationen und nutzt dieselbe serverautoritativ validierte Rules Engine wie normale Matches. Es erklärt Compute und DEPLOY, Infrastructure, Core-Angriffe, BUG und DEBUG, PATCH, CRASH, das Ersetzen voller Infrastructure-Slots und einen abschließenden Production Deploy. Außerhalb des jeweils aktuellen Lernziels liegende Aktionen werden abgewiesen. Nach jeder Lektion bestätigt der Spieler den Übergang in die nächste vorbereitete Situation.

Der erste vollständige Abschluss vergibt einmalig einen Booster. Das Tutorial kann anschließend ohne weitere Belohnung beliebig oft über das Hauptmenü wiederholt werden.
