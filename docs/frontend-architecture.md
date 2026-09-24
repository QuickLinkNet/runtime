# Frontend-Architektur

Das Frontend verwendet ein pragmatisches Atomic Design: Wiederverwendbare UI-Bausteine liegen unter `src/ui`, fachliche Bausteine unter `src/features` und vollständige Ansichten unter `src/pages`. Spiellogik und API-Zugriff bleiben davon getrennt.

## Ordner und Zuständigkeiten

```text
src/
  app/                 App-Ablauf und Navigation
  pages/               vollständige Ansichten ohne globale Spiellogik
  features/
    cards/             Kartenanzeige, Details und Glossar
    deck-builder/      Deck-Konfiguration
    match/             Match-Ablauf und Spielfeld-Bausteine
  ui/
    atoms/             kleinste UI-Elemente, z. B. ein leerer Slot
    molecules/         kombinierte Anzeigen, z. B. Core oder Spielerstatus
  game/                fachliche Daten, Regeln und globaler Spielzustand
  api/                 Kommunikation mit dem PHP-Backend
  styles/              zentrale Tokens und klar begrenzte globale Styles
```

Die Kategorien sind Leitplanken und kein Selbstzweck. Ein Baustein, der nur im Match vorkommt, bleibt im Match-Feature und wird nicht künstlich zu einem globalen Atom gemacht.

## Wo ändere ich das Design?

- `src/styles/tokens.css`: globale Farben, Radien und Schatten
- `src/styles/match-theme.css`: gut lesbare Regler für Karten-, Board- und Schriftgrößen im Match
- `src/styles/base.css`: Reset und allgemeine Grundelemente
- `src/styles/screens.css`: Start, Anmeldung, Hauptmenü und Multiplayer-Lobby
- `src/styles/deck-builder.css`: ausschließlich der Deck Builder
- `src/styles/match.css`: Board, Spielerleisten, Hand und Match-Zustände
- `src/styles/cards.css`: Kartenrahmen und Karteninhalt
- `src/styles/overlays.css`: Dialoge, Kartendetails und Glossar
- `src/styles/responsive.css`: Abweichungen für Tablet und Smartphone

`src/styles/global.css` ist nur noch der geordnete Einstiegspunkt. Dort gehören keine neuen Selektoren hinein.

## Regeln für neue Bausteine

1. Eine vollständige Route oder Ansicht kommt nach `pages`.
2. Fachliche UI kommt in das passende Feature.
3. Nur wirklich wiederverwendbare, fachlich neutrale Elemente kommen nach `ui`.
4. Geschäftslogik gehört nicht in UI-Atoms oder CSS.
5. Neue Farben und wiederkehrende Größen werden als Token angelegt, statt mehrfach als Einzelwert aufzutauchen.
6. Responsive Regeln bleiben beim vorhandenen Breakpoint-System und werden zentral in `responsive.css` ergänzt.
7. `dist`, `deploy` und `node_modules` sind generiert und keine Such- oder Bearbeitungsziele.

## Sichere Weiterentwicklung

Nach strukturellen Änderungen mindestens `npm run build` und `npm run test:php` ausführen. Bei sichtbaren Layout-Änderungen zusätzlich Desktop- und Mobile-Ansicht prüfen.
