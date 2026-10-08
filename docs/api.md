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
| `openBooster` | POST | Booster serverseitig erzeugen und Karten atomar gutschreiben |
| `createMatch` | POST | Singleplayer- oder Multiplayer-Match anlegen |
| `createTutorial` | POST | Deterministisches, serverautoritatives Tutorial-Match anlegen |
| `joinMatch` | POST | Privatem Raum beitreten |
| `startMatch` | POST | Volles Multiplayer-Match starten |
| `getMatchState` | GET | Versionsbasiert pollen |
| `submitGameAction` | POST | Eine validierbare Spielabsicht senden |
| `resumeMatch` | POST | Aktives Match des Spielers finden |
| `leaveMatch` | POST | Match verlassen |

`submitGameAction` erwartet `roomCode`, `expectedVersion` und eine `action`. Veraltete Versionen erhalten HTTP 409. Die normalen Action-Typen sind `MULLIGAN`, `PLAY_CARD`, `ATTACK`, `DEBUG` und `END_TURN`. Tutorial-Matches ergänzen `CONTINUE_TUTORIAL`; erlaubte Aktionen werden pro Lektion zusätzlich auf dem Server eingeschränkt.

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

`openBooster` würfelt ausschließlich auf dem Server. Die Slots und Seltenheiten stehen in `shared/booster-config.json`; das Ergebnis und alle Sammlungsänderungen werden in einer Datenbanktransaktion gespeichert. In der aktuellen Testphase sind Booster unbegrenzt, ohne dass der Deck Builder den Kartenbesitz erzwingt.
