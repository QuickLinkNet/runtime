# Agent handoff

Last updated: 15 October 2026

This is the compact continuation point for RUNTIME. Read it before broad code or history exploration. Product detail remains in the linked domain documents.

## Current worktree

- Branch: `master`; the public-release preparation and author-email history rewrite are committed and pushed.
- The current baseline includes account deletion, in-app legal information and the public-facing project README. Code and asset licenses, contribution/security/trademark/third-party documentation, privacy and release checklists, dependency updates and deployment decoupling are also part of the baseline.
- The unrelated DOCX work directory and four root-level DOCX helper scripts are now ignored and must remain untouched.
- The repository changes have not been deployed; deployment remains the owner's responsibility.

## Current product state

- React/TypeScript/Vite frontend and server-authoritative PHP/MySQL backend.
- 90 playable cards, 4 token cards and complete artwork mappings for all 94 definitions.
- Base set: 48 cards. Expansion pool: 42 cards, split into 24 Production Incident and 18 System Upgrade cards.
- UI, tutorial, rules, cards, factions, bot profiles, glossary and known API errors are localized for `de`, `en` and `nl`.
- Locale changes are reactive and persisted under `runtime.locale`.
- Login tokens survive reloads and transient/offline API failures. Logout is available and invalidates the server token when the API is reachable.
- Registered accounts can be deleted after password confirmation. Related game/progression data is removed, the remaining player row is anonymized and the active token becomes invalid.
- A trilingual privacy/imprint page is reachable from registration and every main view; the concrete hosting setup still requires legal review.
- Typography uses five shared size tokens with `10px` as the minimum; pages outside the identity/login pass still need deliberate visual review.

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

Their durable conclusions are represented by the source, tests and these documents:

- [Project status](project-status.md)
- [Internationalization](internationalization.md)
- [Card system](card-system.md)
- [Artwork inventory](card-artwork-list.md)
- [Factions and balance](factions-and-balance.md)
- [Game rules](game-rules.md)

Do not repeat those audits merely to regain context. Re-audit only the area changed by the current task.

## Last verified baseline

- `git diff --check`: passed.
- `npm run test:i18n`: passed — 1011 messages, 676 literal usages, 75 dynamic families, 3 runtime keys, 94/94 cards.
- `npm run build`: passed — 144 transformed modules and generated service worker; main chunk about 659 kB.
- `npm run test:php`: passed — 105 tests.
- `npm run test:pwa`: passed.
- `npm audit` and `npm audit --omit=dev`: 0 vulnerabilities after updating `basic-ftp` and `source-map-js`.
- Known non-blocking build warning: the main JavaScript chunk is about 644 kB after minification.
- HTTP integration tests were not rerun because no disposable local database was supplied.

## Public-release work and remaining gates

- Code is prepared for AGPL-3.0-or-later; original visual/audio assets are documented under CC BY-SA 4.0. The owner has confirmed the generated assets and necessary rights.
- Hosting names and the accidental sibling-project deployment fallback were removed from tracked files. Future deploys require a local ignored `.env.deploy` created from `.env.deploy.example`.
- Before making the repository public, complete the legal/hosting review, verify trademarks and encrypted deployment, enable repository security features and run a clean-clone release check. The account-deletion HTTP flow still needs a disposable database or a narrowly scoped post-deployment test account. See [Public release checklist](public-release-checklist.md).
- All commits reachable from public `master` use the approved project email. The rewritten history was force-pushed before public release.

## Handoff maintenance

When finishing a material task, update only the facts that changed: worktree intent, canonical counts, validation baseline, current focus and blockers. Keep this file short enough to read in one pass.
