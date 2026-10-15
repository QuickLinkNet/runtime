# Contributing to RUNTIME

Thank you for improving RUNTIME.

## Development

1. Use Node.js 20+, PHP 8.0+ and a disposable local MySQL/MariaDB database.
2. Install dependencies with `npm install`.
3. Copy `api/.env.example` to the ignored `api/.env` and provide local database credentials.
4. Start the frontend and API with `npm run dev:all`.

Before submitting a change, run the checks relevant to the area:

```text
npm run test:i18n
npm run build
npm run test:php
npm run test:pwa
```

Do not run `npm run test:api` against production or any database containing valuable data.

## Contributions and assets

Keep changes focused, document behavior changes and never commit secrets or personal data. New visual or audio assets must include their creator, source or generator, creation date and a license compatible with `ASSET_LICENSES.md`.

By submitting a code or documentation contribution, you agree to license it under `AGPL-3.0-or-later`. Asset contributions must be explicitly offered under `CC-BY-SA-4.0` unless the maintainers approve and document another compatible license.
