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

1. Upload-Paket erzeugen:

   ```text
   npm run deploy
   ```

2. Den vollständigen Inhalt des erzeugten Ordners `deploy/` in das Webroot der Domain oder Subdomain hochladen.
3. Auf dem Server `api/config/config.example.php` nach `api/config/config.php` kopieren und die echten Zugangsdaten eintragen.
4. Beim ersten API-Aufruf werden noch fehlende Migrationen automatisch und versionsbasiert ausgeführt.
5. Sicherstellen, dass Frontend und `/api` über dieselbe HTTPS-Domain erreichbar sind.

Node.js, Composer, Docker, Cronjobs oder ein dauerhaft laufender Prozess werden auf dem Server nicht benötigt.

## API-Konfiguration

Alternativ zu den Werten in `config.php` können `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` und `APP_ENV` als Umgebungsvariablen gesetzt werden. Roh-Tokens werden nie in der Datenbank gespeichert; dort liegt ausschließlich der SHA-256-Hash.

Weitere Informationen: [Architektur](docs/architecture.md), [Frontend-Struktur](docs/frontend-architecture.md), [Spielregeln](docs/game-rules.md), [API](docs/api.md), [Kartensystem](docs/card-system.md), [Zukunftsideen](docs/future-ideas.md).
