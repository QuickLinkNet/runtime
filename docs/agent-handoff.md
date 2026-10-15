# Agent handoff

Last updated: 15 October 2026

This is the compact continuation point for RUNTIME. Read it before broad code or history exploration. Product detail remains in the linked domain documents.

## Current worktree

- Branch: `master`, aligned with `origin/master` at the start of the i18n work.
- A large, intentional, uncommitted internationalization change spans the frontend. Preserve it.
- The unrelated `.codex_docx_work/` directory and four root-level DOCX Python helpers belong to another task and must be ignored.
- Nothing from the current i18n work is staged, committed or deployed.

## Current product state

- React/TypeScript/Vite frontend and server-authoritative PHP/MySQL backend.
- 90 playable cards, 4 token cards and complete artwork mappings for all 94 definitions.
- Base set: 48 cards. Expansion pool: 42 cards, split into 24 Production Incident and 18 System Upgrade cards.
- UI, cards, factions, bot profiles, glossary and known API errors are localized for `de`, `en` and `nl`.
- Locale changes are reactive and persisted under `runtime.locale`.
- The public production site already exposes the language switcher, but it still has the earlier floating/overlapping placement. The current utility-bar fix is local and not deployed.

## Where to work

- Application routing/state: `src/app/App.tsx`, `src/app/routes.ts`
- Pages and screen composition: `src/pages/`
- Game UI by domain: `src/features/`
- Shared game definitions: `src/game/`
- Localization runtime/catalogs: `src/i18n/`
- CSS entry point: `src/styles/global.css`; feature/screen styles live beside it
- HTTP client: `src/api/client.ts`
- Server API and rules: `api/`
- Rule tests: `tests/run.php`; destructive HTTP integration test: `tests/api-integration.php`

## Durable audit results

Nine earlier specialist tasks were recovered and incorporated: i18n catalog/API, i18n game UI, i18n pages, full card audit, role-balance audit, engine-text audit, card-rule audit, card-art audit and balance analysis.

Their durable conclusions are now represented by the source, tests and these documents:

- [Project status](project-status.md)
- [Internationalization](internationalization.md)
- [Card system](card-system.md)
- [Artwork inventory](card-artwork-list.md)
- [Factions and balance](factions-and-balance.md)
- [Game rules](game-rules.md)

Do not repeat those audits merely to regain context. Re-audit only the area changed by the current task.

## Last verified baseline

- `git diff --check`: passed
- `npm run test:i18n`: passed — 976 messages, 653 literal usages, 75 dynamic families, 1 runtime key, 94/94 cards
- `npm run build`: passed — 143 transformed modules and generated service worker
- `npm run test:php`: passed — 105 tests
- `npm run test:pwa`: passed
- Known non-blocking build warning: the main JavaScript chunk is about 643 kB after minification.
- HTTP integration tests were deliberately not rerun because no disposable local database was supplied.

## Current focus and known gap

- The language control is integrated with the audio control, positioned outside identity/authenticated headers, responsive down to 320 px and hidden during the boot screen.
- Public identity/login layouts were visually checked in English and Dutch on desktop/mobile.
- Authenticated layouts of the new build still need a visual pass after a safe local login or an explicitly authorized deployment.

## Handoff maintenance

When finishing a material task, update only the facts that changed: worktree intent, canonical counts, last validation baseline, current focus and blockers. Keep this file short enough to read in one pass.
