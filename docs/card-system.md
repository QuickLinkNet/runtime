# Kartensystem

`shared/cards.json` enthält exakt 48 spielbare V1-Karten und die vier nicht zum Deck zählenden Tokens CHILD COMPONENT, REPLICA, BUG und BOOTSTRAP. Jede Definition besitzt eine stabile technische ID, sichtbare Metadaten und optional eine `effectId`.

Jede Karte in einem Match erhält zusätzlich eine eindeutige `instanceId`. Dadurch bleiben zwei Kopien derselben Definition unterscheidbar. Services und Infrastructure speichern ihre veränderlichen Werte direkt in ihrer Board-Entity.

Komplexe Effekte werden in `GameEngine` aus kleinen Primitiven wie Ziehen, Schaden, Patch, Token, Buff, Sandbox, Fork und Rückgabe kombiniert. Zufall wird ausschließlich serverseitig mit `random_int()` bestimmt und als Event übertragen. Ein Budget von 100 Auflösungen pro Aktion verhindert Effektschleifen.

Effektive Kosten werden serverseitig in dieser Reihenfolge berechnet: Basiskosten, Erhöhungen, temporäre Modifikatoren und Reduktionen, anschließend das jeweilige Minimum. Generierte Karten existieren nur im aktuellen Match.
