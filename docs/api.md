# API

Alle Endpunkte verwenden `api/index.php?action=…` und antworten mit `{ "success": true, "data": … }` oder einem strukturierten Fehler. Authentifizierte Requests senden `X-Player-Token`.

| Action | Methode | Zweck |
| --- | --- | --- |
| `createPlayer` | POST | Namen registrieren und einmalig den Roh-Token erhalten |
| `me` | GET | Aktuelle Identität prüfen |
| `catalog` | GET | Karten und Starter-Decks laden |
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

Der erste erfolgreiche Tutorial-Abschluss setzt `tutorial_completed_at` und schreibt atomar genau einen Booster gut. Wiederholungen bleiben möglich, vergeben aber keine weitere Abschlussbelohnung.

Fehler enthalten stabile Codes wie `NOT_YOUR_TURN`, `INVALID_TARGET`, `INSUFFICIENT_COMPUTE`, `VERSION_CONFLICT` oder `FIREWALL_ACTIVE`. Interne Stack Traces werden nicht ausgeliefert.

`openBooster` würfelt ausschließlich auf dem Server. Die Slots und Seltenheiten stehen in `shared/booster-config.json`; das Ergebnis und alle Sammlungsänderungen werden in einer Datenbanktransaktion gespeichert. In der aktuellen Testphase sind Booster unbegrenzt, ohne dass der Deck Builder den Kartenbesitz erzwingt.
