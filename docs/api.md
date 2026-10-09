# API

Alle Endpunkte verwenden `api/index.php?action=…` und antworten mit `{ "success": true, "data": … }` oder einem strukturierten Fehler. Authentifizierte Requests senden `X-Player-Token`.

| Action | Methode | Zweck |
| --- | --- | --- |
| `createPlayer` | POST | Namen registrieren und einmalig den Roh-Token erhalten |
| `registerAccount` | POST | Kostenlosen Account mit Name, E-Mail und Passwort anlegen |
| `login` | POST | Account anmelden und einen frischen Spieler-Token erhalten |
| `me` | GET | Aktuelle Identität prüfen |
| `linkAccount` | POST | Gastprofil mit einem neuen Account verknüpfen |
| `catalog` | GET | Karten und Starter-Decks laden |
| `loadout` | GET | Den gespeicherten Account-Stack laden |
| `saveLoadout` | POST | Den aktiven Account-Stack speichern |
| `collection` | GET | Persistente Kartensammlung und Booster-Fortschritt laden |
| `buyBooster` | POST | 100 verdiente Credits in einen Booster umwandeln |
| `openBooster` | POST | Booster serverseitig erzeugen und Karten atomar gutschreiben |
| `salvageDuplicates` | POST | Alte Kopien oberhalb des 2er-Limits in Komponenten umwandeln |
| `craftCard` | POST | Eine Set-2-Karte gezielt mit Komponenten herstellen |
| `claimContract` | POST | Eine abgeschlossene Wochenbelohnung abholen |
| `deckSlots` | GET | Alle gespeicherten Stacks inklusive aktivem Stack laden |
| `createDeckSlot` / `updateDeckSlot` | POST | Benannten Stack speichern oder bearbeiten |
| `activateDeckSlot` / `duplicateDeckSlot` / `deleteDeckSlot` | POST | Stack aktivieren, kopieren oder löschen |
| `adminBalanceReport` | GET | Letzten gespeicherten Balance-Lab-Report laden |
| `adminRunBalanceSimulation` | POST | Isolierte Bot-Simulation starten und Report speichern |
| `adminOverview` | GET | Geschützte Admin-Kennzahlen und letzte Admin-Aktionen laden |
| `adminPlayers` | GET | Geschützte Spielersuche (maximal 100 Treffer) |
| `adminPlayer` | GET | Geschützte Spieler-, Karten- und Audit-Details laden |
| `adminUpdatePlayer` | POST | Credits und ungeöffnete Booster eines Spielers setzen und protokollieren |
| `adminResetCollections` | POST | Alle erworbenen Erweiterungskarten nach serverseitiger Doppelbestätigung entfernen |
| `adminDeleteGuestPlayers` | POST | Alle nicht registrierten Spieler nach serverseitiger Doppelbestätigung löschen |
| `createMatch` | POST | Singleplayer- oder Multiplayer-Match anlegen; Singleplayer akzeptiert optional `botProfile` |
| `createTutorial` | POST | Deterministisches, serverautoritatives Tutorial-Match anlegen |
| `joinMatch` | POST | Privatem Raum beitreten |
| `startMatch` | POST | Volles Multiplayer-Match starten |
| `getMatchState` | GET | Versionsbasiert pollen |
| `submitGameAction` | POST | Eine validierbare Spielabsicht senden |
| `resumeMatch` | POST | Aktives Match des Spielers finden |
| `leaveMatch` | POST | Match verlassen |

`submitGameAction` erwartet `roomCode`, `expectedVersion` und eine `action`. Veraltete Versionen erhalten HTTP 409. Die normalen Action-Typen sind `MULLIGAN`, `PLAY_CARD`, `ATTACK`, `DEBUG` und `END_TURN`. Tutorial-Matches ergänzen `CONTINUE_TUTORIAL`; erlaubte Aktionen werden pro Lektion zusätzlich auf dem Server eingeschränkt.

Für Singleplayer-Matches wählt `botProfile` einen serverseitig validierten Gegner: `junior` (gelegentlich suboptimal), `security` (FIREWALL, PATCH und sichere Trades) oder `chaos` (BUGs, CRASH und aggressive Trades). Fehlt der Wert, wird `junior` verwendet.

Jede vom Client ausgelöste Spielaktion enthält zusätzlich eine `clientActionId` (12–80 Zeichen aus Buchstaben, Ziffern, `_` und `-`). Wiederholt der Client dieselbe Aktion nach einem Netzfehler, liefert die API den aktuellen Match-Stand mit `replayed: true` zurück; die Aktion wird nicht ein zweites Mal ausgeführt. Ein fehlendes oder neues `clientActionId` bleibt abwärtskompatibel und wird wie eine neue Aktion behandelt.

Die API protokolliert serverseitig akzeptierte und abgelehnte Aktionen in `match_action_telemetry` sowie genau eine Zusammenfassung beendeter Matches in `match_summaries`. Beide Tabellen sind reine Betriebs-/Balancing-Daten und werden nicht an Spielclients ausgeliefert.

## Integrationstest

`npm run test:api` prüft den realen HTTP-Weg: Gast anlegen, Identität, Gastgrenze, Match erstellen, Aktion senden, dieselbe Aktion erneut senden und Match verlassen. Der Test legt Testdaten an und darf daher nur gegen eine lokale, entbehrliche Entwicklungsdatenbank laufen:

```powershell
npm run dev:api
$env:RUNTIME_API_URL = 'http://127.0.0.1:8080/index.php'
npm run test:api
```

Der erste erfolgreiche Tutorial-Abschluss setzt `tutorial_completed_at` und schreibt atomar genau einen Booster gut. Wiederholungen bleiben möglich, vergeben aber keine weitere Abschlussbelohnung.

Fehler enthalten stabile Codes wie `NOT_YOUR_TURN`, `INVALID_TARGET`, `INSUFFICIENT_COMPUTE`, `VERSION_CONFLICT` oder `FIREWALL_ACTIVE`. Interne Stack Traces werden nicht ausgeliefert.

`openBooster` würfelt ausschließlich auf dem Server. Die Slots und Seltenheiten stehen in `shared/booster-config.json`; das Ergebnis und alle Sammlungsänderungen werden in einer Datenbanktransaktion gespeichert. Account-Matches bringen 10 Credits für den Abschluss und weitere 15 Credits bei einem Sieg. Ein Booster kostet 100 Credits; der erste Sieg schaltet zusätzlich genau einen Bonus-Booster frei. Der Deck Builder bleibt standardmäßig frei, kann aber freiwillig im Collection Mode auf vorhandene Kopien begrenzt werden.

## Admin Console

Die Admin API akzeptiert ausschließlich angemeldete Accounts, deren E-Mail in `RUNTIME_ADMIN_EMAILS` (kommagetrennt in `api/.env` oder als Server-Umgebungsvariable) steht. Ohne konfigurierten Eintrag existiert kein Adminzugang. Jede Änderung an Credits/Packs, jeder globale Karten-Reset und jede Gastlöschung wird in `admin_audit_log` gespeichert. `adminResetCollections` löscht nur erworbene Erweiterungskarten; Credits, Packs, Accounts, Decks und das permanente Basis-Set bleiben bestehen. Die API verlangt zusätzlich `doubleConfirmed: true` und exakt `confirmation: "RESET ALL"`; die Gastlöschung verlangt entsprechend `confirmation: "DELETE GUESTS"`. Die Oberfläche fordert beide Eingriffe in zwei separaten Schritten ein.
