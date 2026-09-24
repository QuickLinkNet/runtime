# Architektur

RUNTIME trennt die React-Oberfläche von der autoritativen PHP-Rules-Engine. Der Browser sendet ausschließlich Absichten wie `PLAY_CARD`, `ATTACK` oder `END_TURN`. PHP validiert Kosten, Ziele, Zugrecht, Zufall, Effekte und Sieg.

## Bausteine

- `src/`: React/TypeScript UI, globaler Match-State via Context und Reducer, API-Client und lokaler Deck Builder.
- `shared/cards.json`: einzige Quelle für Kartennamen, Werte und Effekt-IDs; Frontend und PHP verwenden dieselbe Datei.
- `api/game/`: Rules Engine, private Player Views und Bot.
- `api/services/MatchService.php`: Transaktionen, Versionsprüfung, Timer, Reconnect und Bot-Orchestrierung.
- `api/repositories/`: kleine PDO-Persistenzschicht.
- `api/database/migrations/`: geordnete, idempotente Schema-Migrationen; ausgeführte Versionen werden in `schema_migrations` gespeichert.
- `database/schema.sql`: drei Tabellen für Spieler, Matches und Teilnehmer.

Der komplette autoritative Match-State liegt als JSON im Match-Datensatz. Aktionen sperren den Datensatz mit `SELECT … FOR UPDATE`, vergleichen die erwartete Version und speichern genau eine neue Version.

Bei jedem API-Aufruf prüft `SchemaMigrator`, ob neue Migrationen vorliegen. Ausstehende Versionen werden unter einem MySQL Advisory Lock genau einmal angewendet. Neue Migrationen werden als fortlaufend benannte PHP-Dateien hinzugefügt und müssen wiederholbar beziehungsweise idempotent sein.

## Versteckte Informationen

`PlayerView::build()` erstellt pro Betrachter eine eigene Antwort. Gegnerische Handkarten und beide Deckreihenfolgen verlassen den Server nie. Board, Infrastructure und Trash sind öffentlich. Private Draw- und Generate-Events werden ebenfalls bereinigt.

## Hosting

Das Produktionspaket besteht aus statischen Frontend-Dateien, Vanilla PHP und dem gemeinsamen Kartenkatalog. Es benötigt weder WebSockets noch Worker. Multiplayer-Änderungen werden alle 1,25 Sekunden gepollt; im Hintergrund reduziert die Page Visibility API die Frequenz.
