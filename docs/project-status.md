# Projektstand RUNTIME

Stand: 4. Oktober 2026

Diese Datei ist der kurze, verbindliche Übergabepunkt für die weitere Entwicklung. Detailregeln stehen in den jeweils verlinkten Fachdokumenten.

## Aktueller Stand

- React-/TypeScript-Frontend mit pragmatischem Atomic Design
- serverautoritative PHP-Rules-Engine mit MySQL-Persistenz
- Singleplayer gegen Server-Bot und private Multiplayer-Räume
- drei gültige Starter-Decks und frei konfigurierbarer Deck Builder
- 48 spielbare Karten plus 4 erzeugte Token-Karten
- vollständige Artwork-Zuordnung für alle 52 Karten und Tokens
- responsiver Deck Builder mit kompaktem 5er- und großem 4er-Raster
- große Kartenansicht, Artwork-Lightbox und mobile Vollkartenansicht
- responsive Match-Ansicht für Desktop, Tablet und Smartphone
- verständlicher Event-Feed, Zugwechsel-Banner und Auswahl-/Zielhinweise
- Feedback für ungültige Aktionen und unzureichendes Compute
- Deploy-, Damage- und Heal-Animationen für Karten und Core
- Combat Feedback V2 mit Angreiferbewegung, Zielspur, Trefferzahlen und Block-Effekt
- zerstörte Karten fliegen sichtbar zum Trash; erzeugte Tokens lösen sich auf
- serverseitige Validierung von Kosten, Zielen, Slots und Zugberechtigung
- Deployment für `red-it.org/apps/runtime` und `runtime.red-it.org`
- installierbare PWA für Android, iOS und Desktop mit eigenen App- und Maskable-Icons
- versionierter Offline-App-Shell, kontrollierter Update-Hinweis und Installations-UI
- API- und Matchdaten sind bewusst vom Service-Worker-Cache ausgeschlossen
- Android-PWA live repariert: konfliktfreie Root-Icons statt des vom Hosting reservierten `/icons/`-Pfads

## Qualitätssicherung

- `npm run build` kompiliert TypeScript und erstellt den Production-Build.
- `npm run test:php` prüft aktuell 30 Regeln und Sicherheitsgrenzen der Engine.
- Sichtbare Änderungen werden zusätzlich in Desktop- und Mobile-Viewports geprüft.
- TS-, TSX- und CSS-Dateien sollen nach Möglichkeit unter 500 Zeilen bleiben.
- Letzte vollständige Prüfung am 4. Oktober 2026: Production-Build, 30 PHP-Tests und PWA-Prüfung erfolgreich.
- Live geprüft: Manifest, Service Worker und Android-Icons liefern auf `runtime.red-it.org` HTTP 200.

## Nächste sinnvolle Ausbaustufe

1. **Audio:** leise Hintergrundmusik, UI-Sounds, Deploy, Angriff, Treffer und Zugwechsel mit Lautstärkereglern.
2. **Onboarding:** kurzes interaktives Tutorial statt ausschließlich Glossar und Hilfetexten.
3. **Balancing:** Match-Telemetrie, Karten-Siegquoten und systematische Kosten-/Werteanpassung.
4. **Härtung:** zusätzliche API-Integrationstests, Wiederverbindungsfälle und parallele Aktionen testen.

## Danach

- Replays und Zuschaueransicht
- weitere Bot-Profile und Schwierigkeitsstufen
- Matchmaking und Ranked
- Accounts, Sammlungen und rein kosmetische Freischaltungen
- optionale WebSocket-Transportschicht
- Kampagne und globale Incident-Ereignisse

## Wichtige Dokumente

- [Architektur](architecture.md)
- [Frontend-Architektur](frontend-architecture.md)
- [Spielregeln](game-rules.md)
- [Kartensystem](card-system.md)
- [Artwork-Liste](card-artwork-list.md)
- [Artwork-Produktion](card-artwork-production.md)
- [API](api.md)
- [Spätere Ideen](future-ideas.md)
