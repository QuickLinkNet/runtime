# RUNTIME agent entry point

Keep startup cheap. Do not rediscover the whole repository unless the task explicitly requires it.

## First five minutes

1. Run `git status --short --branch` without changing the worktree.
2. Read `docs/agent-handoff.md` completely. It is the current operational handoff.
3. Read only the domain document and source files named there that relate to the task.
4. Use `docs/project-status.md` for the product overview; do not begin with a repository-wide audit.
5. Preserve every pre-existing modification. Never use reset, checkout, clean, stash, or bulk deletion to make the tree look clean.

## Avoid repeated work

- The card, role-balance, engine-text, rule and artwork audits are already folded into the current source and documentation. Repeat them only when the requested change invalidates their conclusions.
- Do not inspect `.codex_docx_work/` or the root-level DOCX helper scripts unless the task is about those documents.
- Do not search old Codex session logs during normal development. Durable findings belong in `docs/agent-handoff.md` or the relevant domain document.
- Prefer targeted `rg` queries and focused file reads. Do not dump all catalogs, card definitions or generated assets into context.
- Treat `docs/agent-handoff.md` as a cache: update it when architecture, counts, validation results or known blockers materially change.

## Safety and validation

- Apply source edits with patches and keep unrelated user changes intact.
- Never run `tests/api-integration.php` against a live or unknown database. It requires a disposable local test database.
- Minimum checks for frontend/i18n work: `git diff --check`, `npm run test:i18n`, and `npm run build`.
- Add `npm run test:php` for game rules, cards, economy or API-domain changes; add `npm run test:pwa` for shell/service-worker changes.
- Do not deploy, stage or commit unless the user asks.

## Canonical project facts

- 90 playable cards plus 4 generated token cards.
- 48 base cards plus 42 expansion cards: 24 Production Incident and 18 System Upgrade.
- Supported UI locales: German (`de`), English (`en`) and Dutch (`nl`).
- Frontend: React/TypeScript/Vite. Backend: server-authoritative PHP/MySQL.
