# RUNTIME

RUNTIME ist ein serverautoritatives, rundenbasiertes Tech-Kartenspiel für zwei Spieler. Der MVP enthält 48 Karten, drei Starter-Decks, einen Deck Builder, einen regelbasierten Server-Bot und private Multiplayer-Räume mit Polling und Reconnect.

## Voraussetzungen

- Node.js 20 oder neuer (nur lokal für das Frontend)
- PHP 8.0 oder neuer mit PDO MySQL
- MySQL 5.7+ oder MariaDB 10.3+

## Lokal starten

1. Abhängigkeiten installieren:

   ```text
   npm install
   ```

2. Eine leere Datenbank anlegen. Das Schema wird beim ersten API-Aufruf automatisch migriert. Der Datenbankbenutzer benötigt dafür `CREATE`, `ALTER`, `INDEX` und `REFERENCES` zusätzlich zu den normalen Lese-/Schreibrechten. `database/schema.sql` bleibt als manueller Snapshot verfügbar.

3. `api/.env.example` nach `api/.env` kopieren und die Datenbank-Zugangsdaten eintragen. Die `.env` wird von PHP automatisch geladen und von Git sowie dem Deployment-Paket ausgeschlossen. Alternativ kann weiterhin `api/config/config.php` verwendet werden.

4. Frontend starten:

   ```text
   npm run dev
   ```

5. In einem zweiten Terminal die PHP-API starten:

   ```text
   npm run dev:api
   ```

   Vite leitet `/api` automatisch an PHP auf Port 8080 weiter. PHP lädt die Zugangsdaten aus `api/.env` und verbindet sich mit der dort eingetragenen externen Datenbank. Optional startet `npm run dev:all` beide Prozesse gemeinsam.

6. Die von Vite angezeigte Adresse `http://localhost:5173` öffnen. Für Multiplayer einen zweiten Browser oder ein Inkognito-Fenster verwenden.

## Tests

Die Rules Engine wird ohne Webserver und ohne Datenbank getestet:

```text
npm run test:php
```

Der Testlauf deckt Match-Start, Mulligan, Compute, Limits, Combat, Keywords, Crash-Effekte, Memory Leak, Game Over, private Views, Bot-Aktionen und Sicherheitsgrenzen ab.

## Production / Shared Hosting

Das Deployment ist für beide öffentlichen Adressen eingerichtet:

- `https://www.red-it.org/apps/runtime/`
- `https://runtime.red-it.org/`

Ein Aufruf erledigt den vollständigen Ablauf:

```text
npm run deploy
```

Der Befehl:

1. kompiliert TypeScript und baut das Frontend mit relativen Pfaden für Verzeichnis und Subdomain,
2. erstellt den uploadfertigen Ordner `deploy/`,
3. übernimmt die lokale, nicht versionierte RUNTIME-Datenbankkonfiguration,
4. lädt Frontend, PHP-API und Kartenkatalog nach `/html/apps/runtime`,
5. startet beim API-Aufruf noch fehlende Datenbankmigrationen und
6. prüft anschließend die öffentliche Seite und den API-Healthcheck.

Die FTP-Zugangsdaten liegen entweder in der ignorierten `.env.deploy` entsprechend `.env.deploy.example` oder werden in dieser lokalen Workspace-Struktur aus der vorhandenen Hosting-Konfiguration übernommen. Das Skript akzeptiert aus Sicherheitsgründen ausschließlich ein Zielverzeichnis, das auf `/runtime` endet, und löscht außerhalb des generierten Asset-Ordners keine Serverdateien.

Node.js, Composer, Docker, Cronjobs oder ein dauerhaft laufender Prozess werden auf dem Server nicht benötigt.

## Progressive Web App

Der Production-Build erzeugt automatisch eine installierbare PWA:

- Manifest und App-Icons für Android, iOS und Desktop
- versionierter Service Worker mit vorgeladener App-Hülle
- Karten-Artworks werden bei Benutzung begrenzt offline zwischengespeichert
- API-, Spieler- und Matchantworten werden niemals vom Service Worker gecacht
- neue Versionen werden angeboten und erst nach Bestätigung aktiviert
- `npm run deploy` prüft Manifest, Service Worker und App-Icon nach dem Upload

Service Worker funktionieren lokal nur im Production-Build (`npm run build` plus Vite Preview) und im Deployment über HTTPS. Im normalen Vite-Entwicklungsmodus werden sie absichtlich nicht registriert.

## API-Konfiguration

Alternativ zu den Werten in `config.php` können `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` und `APP_ENV` als Umgebungsvariablen gesetzt werden. Roh-Tokens werden nie in der Datenbank gespeichert; dort liegt ausschließlich der SHA-256-Hash.

Weitere Informationen: [Aktueller Projektstand](docs/project-status.md), [Architektur](docs/architecture.md), [Frontend-Struktur](docs/frontend-architecture.md), [Spielregeln](docs/game-rules.md), [API](docs/api.md), [Kartensystem](docs/card-system.md), [Zukunftsideen](docs/future-ideas.md).
