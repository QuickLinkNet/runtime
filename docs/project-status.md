# Projektstand RUNTIME

Stand: 8. Oktober 2026

Diese Datei ist der kurze, verbindliche Übergabepunkt für die weitere Entwicklung. Detailregeln stehen in den jeweils verlinkten Fachdokumenten.

## Aktueller Stand

- React-/TypeScript-Frontend mit pragmatischem Atomic Design
- serverautoritative PHP-Rules-Engine mit MySQL-Persistenz
- Singleplayer gegen Server-Bot und private Multiplayer-Räume
- drei gültige Starter-Decks und frei konfigurierbarer Deck Builder
- 72 spielbare Karten plus 4 erzeugte Token-Karten
- vollständige Artwork-Zuordnung für die 48 Basiskarten und 4 Tokens; 24 Set-2-Artworks stehen in der Produktionswarteschlange
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
- serverautoritative Booster mit Common-, Uncommon-, Rare- und Legendary-Slots
- persistente Sammlung pro Spieler inklusive festem 48-Karten-Basis-Set, erspieltem Erweiterungsset, Duplicate Protection und Opening-Historie
- responsives Booster-Opening mit einzelnem Aufdecken und kompletter Sammlungsansicht
- verdiente Credits für Account-Matches (10 Abschluss, +15 Sieg), 100-Credit-Booster und einmaliger Bonus-Booster beim ersten Sieg
- optionaler Sammlungsfilter und Besitzanzeige im Deck Builder; Karten bleiben in der Testphase frei spielbar
- neue Seltenheitsrahmen auf allen Kartenansichten: Common grün, Uncommon blau, Rare violett, Legendary gold
- achtteiliges, serverautoritatives Tutorial mit geführten Aktionen, responsivem Coach, Wiederholungsmodus und einmaliger Booster-Belohnung

- Set 2 „Production Incident“ mit 24 neuen, spielbaren Karten und gekapselten Servereffekten
- explizite, erweiterungssichere 30-Karten-Starterdecks in gemeinsamer Konfiguration
- optionaler Account-Flow: Gast spielen ohne Zwang, registrieren/anmelden/verknüpfen für persistente eigene Stacks, Sammlung und Booster
- Match-Abschluss mit serverseitigen Ergebnissen, Stats, Rewards und sicherem Rematch-/Deck-Flow
- Härtung: idempotente `clientActionId`-Aktionen, Wiederverbindungsstatus und ein sicherer Einzel-Retry nach Netzfehlern
- Balancing-Telemetrie für Aktionen und Match-Zusammenfassungen, inklusive automatischer Migration
- HTTP-Integrationstest für Identität, Gastgrenze, Match-Aktion und Replay-Schutz
- drei auswählbare, serverautoritative Bot-Profile mit eigenen Decks und klaren Spielstilen: Junior Bot, Security Auditor und Chaos Engineer
- geschützte Admin Console mit serverseitiger E-Mail-Allowlist, Spieler-/Economy-Übersicht, Audit-Log und doppelt bestätigtem globalem Sammlungs-Reset

## Qualitätssicherung

- `npm run build` kompiliert TypeScript und erstellt den Production-Build.
- `npm run test:php` prüft die Regeln, Tutorialabläufe, Booster-Garantien und Sicherheitsgrenzen der Engine.
- `npm run test:api` prüft gegen eine lokale Test-API den HTTP-Flow und den idempotenten Replay-Schutz.
- Sichtbare Änderungen werden zusätzlich in Desktop- und Mobile-Viewports geprüft.
- TS-, TSX- und CSS-Dateien sollen nach Möglichkeit unter 500 Zeilen bleiben.
- Letzte vollständige Prüfung am 5. Oktober 2026: Production-Build, 39 PHP-Tests, Booster-API, Desktop-/Mobile-UI und PWA-Prüfung erfolgreich.
- Live geprüft: Manifest, Service Worker und Android-Icons liefern auf `runtime.red-it.org` HTTP 200.

## Nächste sinnvolle Ausbaustufe

1. **Set-2-Artworks:** die 24 Motive aus der Artwork-Queue einzeln erstellen und abnehmen.
2. **Audio:** Pack-Riss, Reveal-Stufen und Legendary-Stinger sowie Match-Sounds mit Lautstärkereglern.
3. **Bot-Ausbau:** später Principal Architect mit Komboplanung und weiteren klaren Deck-Archetypen.
4. **Balancing & Härtung:** abgeschlossen: Telemetrie, HTTP-Integrationstest, Wiederverbindung und Replay-Schutz bei parallelen/erneuten Aktionen.

## Danach

- Replays und Zuschaueransicht
- weitere Bot-Profile und Schwierigkeitsstufen
- Matchmaking und Ranked
- Accounts, kosmetische Freischaltungen und Booster-Belohnungen
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
