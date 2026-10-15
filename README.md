<div align="center">

# RUNTIME_

### Deploy. Defend. Debug.

Ein serverautoritatives Tech-Kartenspiel über stabile Stacks, kaputte Deployments und den nächsten Production Incident.

[**Jetzt spielen**](https://runtime.red-it.org/) · [Spielregeln](docs/game-rules.md) · [Kartensystem](docs/card-system.md) · [Mitmachen](CONTRIBUTING.md)

![RUNTIME – taktisches Tech-Kartenspiel](public/backgrounds/runtime-wide.png)

![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8%2B-777bb4?style=flat-square&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL%20%2F%20MariaDB-supported-4479a1?style=flat-square&logo=mysql&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-b9f44a?style=flat-square)
![License](https://img.shields.io/badge/code-AGPL--3.0--or--later-b9f44a?style=flat-square)

</div>

## Was ist RUNTIME?

RUNTIME ist ein kostenloses, rundenbasiertes Kartenspiel für zwei Spieler. Du kombinierst zwei Tech-Domains, stellst Services und Infrastructure bereit, sicherst deinen Core und bringst das gegnerische System zum Absturz. Jede Aktion wird auf dem Server validiert – der Browser sendet nur deine Spielabsicht.

Der aktuelle Stand umfasst:

- **90 spielbare Karten und 4 Token** mit vollständigen Artworks
- **sieben Deck-Domains** mit eigenen Identitäten und Synergien
- **drei Starter-Stacks** sowie eigene gespeicherte Decks
- **Singleplayer** gegen drei unterschiedliche serverseitige Bots
- **private Multiplayer-Räume** mit Reconnect und Replay-Schutz
- **acht interaktive Tutorial-Lektionen** mit geführten Aktionen
- **Booster, Sammlung, Crafting, Contracts und Mastery** ohne Pay-to-win
- **Deutsch, Englisch und Niederländisch**, reaktiv wechselbar
- **installierbare PWA** für Desktop und Mobilgeräte
- freiwillige Accounts – Gastspielen funktioniert ohne E-Mail

## So spielt es sich

1. Wähle zwei Tech-Domains und baue einen Stack aus 30 Karten.
2. Erhöhe dein Compute, deploye Services und sichere sie mit Infrastructure.
3. Nutze Commands, Keywords und Synergien, um das gegnerische Board zu kontrollieren.
4. Reduziere die gegnerische Core-Integrität auf null, bevor dein eigenes System crasht.

Die Engine kennt unter anderem `DEPLOY`, `CRASH`, `PATCH`, `FIREWALL`, `REDUNDANCY`, `SANDBOX`, `FORK`, `OVERCLOCK`, `BUG` und `DEBUG`. Die vollständige Referenz steht in den [Spielregeln](docs/game-rules.md).

## Architektur

| Bereich | Umsetzung |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Hash-Routing |
| Backend | PHP 8+, serverautoritative Rules Engine und JSON-API |
| Persistenz | MySQL 5.7+ oder MariaDB 10.3+, automatische Migrationen |
| Multiplayer | private Raumcodes, Versionskonfliktschutz, Polling und Reconnect |
| Offline | versionierter Service Worker, App-Shell und kontrollierte Updates |
| Qualität | PHP-Regeltests, HTTP-Integrationstest, i18n- und PWA-Prüfung |

Weitere Details: [Architektur](docs/architecture.md), [Frontend-Struktur](docs/frontend-architecture.md), [API](docs/api.md) und [Projektstand](docs/project-status.md).

## Lokal starten

Vorausgesetzt werden Node.js 20+, PHP 8+ mit PDO MySQL und eine leere MySQL-/MariaDB-Datenbank.

```bash
npm ci
```

Kopiere anschließend `api/.env.example` nach `api/.env` und trage ausschließlich lokale Entwicklungszugänge ein. Das Schema wird beim ersten API-Aufruf automatisch migriert.

```bash
npm run dev:all
```

Öffne danach `http://localhost:5173`. Für einen privaten Multiplayer-Test eignet sich ein zweites Browser- oder Inkognito-Fenster.

## Qualitätssicherung

```bash
npm run test:i18n
npm run build
npm run test:php
npm run test:pwa
npm audit
```

`npm run test:api` legt und löscht Testdaten über die echte HTTP-API. Dieser Test darf ausschließlich gegen eine ausdrücklich dafür vorgesehene, entbehrliche Testdatenbank laufen – niemals gegen Produktionsdaten.

## Deployment

RUNTIME benötigt auf dem Zielsystem nur PHP, MySQL/MariaDB und HTTPS. Node.js wird ausschließlich zum lokalen Erzeugen des Produktionspakets verwendet.

```bash
cp .env.deploy.example .env.deploy
npm run deploy
```

`.env.deploy` und `api/.env` sind nicht versioniert. Das Deploy-Skript baut Frontend und Service Worker, erstellt ein geprüftes Paket, lädt es in das konfigurierte RUNTIME-Ziel und kontrolliert anschließend Seite, API und PWA-Artefakte. Es übernimmt keine Konfiguration aus benachbarten Projekten.

## Datenschutz und Sicherheit

RUNTIME verwendet keine Werbe- oder Analyse-Tracker. Accounts sind optional, Passwörter werden ausschließlich gehasht gespeichert, Tokens liegen in der Datenbank nur als SHA-256-Hash vor und Accounts können nach erneuter Passworteingabe dauerhaft gelöscht werden. Datenschutz und Impressum sind in der Anwendung auf jeder Hauptansicht erreichbar.

Bitte melde Sicherheitsprobleme nicht öffentlich, sondern entsprechend der [Security Policy](SECURITY.md). Die Datenschutz- und Veröffentlichungsprüfung wird in der [Public-Release-Checkliste](docs/public-release-checklist.md) festgehalten.

## Freie Software und Assets

- Quellcode und Dokumentation: [`AGPL-3.0-or-later`](LICENSE)
- Projekteigene Bilder und Audiodateien: [`CC-BY-SA-4.0`](ASSET_LICENSES.md)
- Abhängigkeiten: [Third-Party Notices](THIRD_PARTY_NOTICES.md)
- Markenhinweise: [Trademarks](TRADEMARKS.md)
- Beiträge: [Contributing Guide](CONTRIBUTING.md)

RUNTIME ist ein unabhängiges Projekt und nicht mit den im Spiel referenzierten Technologieanbietern verbunden.
