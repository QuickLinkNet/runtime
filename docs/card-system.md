# Kartensystem

`shared/cards.json` enthält 72 spielbare Karten und die vier nicht zum Deck zählenden Tokens CHILD COMPONENT, REPLICA, BUG und BOOTSTRAP. Der Pool besteht aus 48 Basiskarten und den 24 Karten aus **Set 2 – Production Incident**. Jede Definition besitzt eine stabile technische ID, sichtbare Metadaten und optional eine `effectId`.

Die 48 Basiskarten sind für jeden Account dauerhaft mit zwei Kopien verfügbar. `shared/card-sets.json` grenzt das Erweiterungsset zentral ab: Booster enthalten ausschließlich diese 24 Erweiterungskarten. Die Sammlung zeigt sowohl „Besessen“ als auch „Noch nicht erworben“; ein globaler Admin-Reset entfernt nur erworbene Erweiterungskarten, nie das permanente Basis-Set.

Die technische Kartentyp-Taxonomie besteht aus `service`, `command` und `infrastructure`. `token` ist kein eigener Kartentyp, sondern eine nicht deckbaubare Sonderkategorie: CHILD COMPONENT, REPLICA und BUG sind Service-Tokens; BOOTSTRAP ist ein Command-Token.

Die sechs wählbaren Tech-Domains heißen im UI Frontend, Backend, DevOps, Data, Security und AI. Für DevOps bleibt der interne Domain-Schlüssel `infrastructure` bestehen. `neutral` und `token` sind technische Sonder-Domains und zählen nicht zu den wählbaren Tech-Domains eines Decks.

Die Booster-Seltenheiten stehen zentral in `shared/booster-config.json`. Alle Kartenansichten verwenden dieselbe Zuordnung und laden automatisch den passenden Rahmen: Common grün, Uncommon blau, Rare violett und Legendary gold. Tokens behalten den neutralen Standardrahmen.

Die drei Starterdecks sind explizit in `shared/starter-decks.json` definiert. Dadurch bleiben sie valide 30-Karten-Decks, wenn neue Sets zum Katalog hinzukommen.

Die Fraktions-Identitäten stehen verbindlich in [`factions-and-balance.md`](factions-and-balance.md). Frontend steht für Tempo und Wiederaufbau, Backend für zuverlässigen Value, DevOps für Skalierung, Data für Auswahl und Ressourcen, Security für Kontrolle und AI für vorbereitete Komboturns. Neutral bleibt bewusst ein Werkzeugkasten.

Decks enthalten genau 30 Karten, genau zwei Tech-Domains und höchstens zwei Kopien je Karte. Legendary-Karten dürfen nur einmal vorkommen; damit Infrastructure-Hände nicht kippen, sind maximal vier Infrastructures pro Deck erlaubt. Im Match bleiben zehn Handkarten das Limit. Eine Infrastructure von der Hand kann einmal pro Zug dekommissioniert werden: Sie wandert in den Trash und wird direkt durch eine Karte ersetzt.

Jede Karte in einem Match erhält zusätzlich eine eindeutige `instanceId`. Dadurch bleiben zwei Kopien derselben Definition unterscheidbar. Services und Infrastructure speichern ihre veränderlichen Werte direkt in ihrer Board-Entity.

Komplexe Effekte werden in `GameEngine` aus kleinen Primitiven wie Ziehen, Schaden, Patch, Token, Buff, Sandbox, Fork und Rückgabe kombiniert. Zufall wird ausschließlich serverseitig mit `random_int()` bestimmt und als Event übertragen. Ein Budget von 100 Auflösungen pro Aktion verhindert Effektschleifen.

Effektive Kosten werden serverseitig in dieser Reihenfolge berechnet: Basiskosten, Erhöhungen, temporäre Modifikatoren und Reduktionen, anschließend das jeweilige Minimum. Generierte Karten existieren nur im aktuellen Match.
