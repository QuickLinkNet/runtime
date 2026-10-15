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
- [x] Implement authenticated account deletion in API and UI, including password confirmation, token revocation, anonymization and HTTP test coverage.
- [x] Publish the privacy notice and imprint in the application and link them from registration and every main screen.
- [x] Rewrite all reachable commits to the approved project email before changing repository visibility.
- [x] Create the local ignored `.env.deploy` from `.env.deploy.example`.

## Required before public release

- [ ] Legally review the published privacy notice and imprint for the concrete operating model. Confirm server-log retention, hosting processors/data-processing agreements, EEA transfers and rules for minors.
- [ ] Review recognizable third-party marks in card names and artwork; replace any mark whose intended use cannot be cleared.
- [ ] Verify the deployment using encrypted FTP/FTPS.
- [ ] Enable GitHub private vulnerability reporting and repository secret scanning.
- [ ] Run the account-deletion HTTP flow against a dedicated disposable database or, after deployment, with a uniquely named production smoke-test account.
- [ ] Run the full build, i18n, PHP and PWA suite from a clean clone.
- [ ] Change repository visibility only after every required item above is checked.
