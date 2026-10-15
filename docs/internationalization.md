# Internationalisierung

RUNTIME unterstützt Deutsch (`de`), Englisch (`en`) und Niederländisch (`nl`). Deutsch ist die Standardsprache und bleibt für unbekannte oder noch nicht lokalisierte Servermeldungen der Fallback.

## Architektur

- `src/i18n/I18nProvider.tsx` hält die aktive Sprache im React-Kontext.
- `src/i18n/runtime.ts` erkennt beim ersten Start die Browsersprache und speichert die Auswahl unter `runtime.locale`.
- `src/i18n/messages/` enthält die UI-Kataloge für allgemeine Texte, Seiten, Spiel, Administration und Balance Lab.
- `src/i18n/cardTranslations.ts` enthält Name, Regeltext und Flavor Text aller 94 Kartendefinitionen für Englisch und Niederländisch. Deutsch stammt aus `shared/cards.json`.
- `src/i18n/apiErrors.ts` übersetzt bekannte API-Fehlercodes clientseitig. Der Client sendet zusätzlich `Accept-Language`.
- Datenobjekte wie Karten, Fraktionen, Botprofile und Kartensets verwenden sprachabhängige Getter, damit bestehende Referenzen ohne Reload reagieren.

Der globale Sprachumschalter bleibt auf allen Ansichten erreichbar. Die aktive Sprache wird sofort auf `document.documentElement.lang`, UI-Texte, Karten, Glossar und ARIA-Beschriftungen angewendet.

## Prüfung

```text
npm run test:i18n
```

Der Test prüft:

- nicht leere Einträge für `de`, `en` und `nl`;
- statische Schlüssel und bedingte Schlüsselvarianten;
- dynamische Schlüsselfamilien;
- neu eingeführte sichtbare JSX-Literale und Textattribute;
- vollständige Kartenabdeckung ohne unbekannte Karten-IDs.

Vor einer Veröffentlichung werden zusätzlich die Hauptansichten in allen drei Sprachen auf Desktop und Smartphone geprüft. Besonderes Augenmerk gilt langen niederländischen Beschriftungen, Dialogen, dem Deck Builder, Match-Prompts und Karten-Flavortexten.
