# Public release checklist

This checklist is the release gate before changing the repository visibility to public and presenting RUNTIME as free software.

## Completed

- [x] License source code under `AGPL-3.0-or-later`.
- [x] License project-owned visual and audio assets under `CC-BY-SA-4.0`.
- [x] Add asset provenance, trademark and third-party notices.
- [x] Add a private security reporting policy.
- [x] Scan the current tree and reachable Git history for common secret formats.
- [x] Remove hosting-provider details and unrelated-workspace coupling from tracked deployment configuration.
- [x] Update vulnerable build/deployment dependencies until `npm audit` reports zero known vulnerabilities.

## Required before public release

- [ ] Implement authenticated account deletion in API and UI. Require recent password confirmation, revoke the active token, delete or irreversibly anonymize personal data, define the treatment of audit/telemetry records and add integration tests against a disposable database.
- [ ] Complete and legally review `docs/privacy-notice-draft.md`, then publish the resulting privacy notice in the application with controller identity/contact, purposes, legal bases, recipients, retention periods and data-subject rights. Link it at account registration and from every main screen.
- [ ] Determine whether an imprint is required for the concrete operating model and publish the correct operator details if applicable.
- [ ] Review recognizable third-party marks in card names and artwork; replace any mark whose intended use cannot be cleared.
- [ ] Decide whether the existing Git author email may remain public. If not, rewrite all reachable commits to an approved noreply address and force-push before changing visibility.
- [ ] Create a local ignored `.env.deploy` from `.env.deploy.example` and verify the deployment using encrypted FTP/FTPS.
- [ ] Enable GitHub private vulnerability reporting and repository secret scanning.
- [ ] Run the full build, i18n, PHP, PWA and disposable-database HTTP test suite from a clean clone.
- [ ] Change repository visibility only after every required item above is checked.
