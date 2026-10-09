# Fraktionen & Balance Lab

`shared/faction-profiles.json` ist die verbindliche Design-Bibel für Frontend, Backend, DevOps, Data, Security, AI und Neutral. Sie beschreibt Identität, Kern-Verben, Stärken, Schwächen und eine Regel für neue Karten. Neue Karten sollen mindestens eine dieser Aussagen stärken – nicht nur isoliert effizient sein.

## Balance Lab

Das Admin-Balance-Lab simuliert isolierte Bot-gegen-Bot-Matches. Es verwendet vier Archetypen: Interface & API, Fortress Stack, Model Pipeline und Chaos Engineer. Für jede Paarung werden beide Sitzpositionen mehrfach gespielt; dadurch wird der Startvorteil nicht als Kartenstärke fehlinterpretiert.

Der Report zeigt:

- Winrate und durchschnittliche Länge je Archetyp;
- Fraktions-Signale über die in den Archetypen enthaltenen Domains;
- Matchup-Matrix, Karten-Impact und beobachtbare Ausreißer;
- Hinweise für Buff, Nerf oder zusätzliche Synergie.

Zusätzlich wertet das Lab bis zu 500 gespeicherte echte Match-Zusammenfassungen aus. Reale Spielergebnisse werden nicht in die Simulator-Winrate hineingerechnet, sondern separat markiert: So ist jederzeit sichtbar, ob ein Bot-Signal auch bei echten Spielen bestätigt wird.

Die Empfehlungen sind absichtlich keine automatischen Regeländerungen. Erst reale Matches, Spielgefühl und ausreichend Simulationen rechtfertigen einen Karten-Patch.

## Vorgehen für einen Balance-Patch

1. Volles Balance-Lab ausführen und den Report sichern.
2. Eine konkrete Hypothese wählen, zum Beispiel: „Security gewinnt zu selten, weil frühe Board-Präsenz fehlt.“
3. Nur einen kleinen Patch planen: eine Karte, Kosten oder eine Synergie.
4. Dieselbe Simulation erneut ausführen und mit Kollegenspielen gegenprüfen.
5. Werte erst nach Vergleich der beiden Reports übernehmen.
