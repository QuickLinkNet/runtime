# Privacy notice draft

> Internal review copy corresponding to the notice currently available in the application. It is not a substitute for legal review of the actual operating and hosting setup.

## Controller

- Name: Manuel Kramm
- Postal address: Sanitätsrat-Hallermann-Straße 5, 44539 Dortmund, Germany
- Privacy contact: `kramm.manuel@red-it.org`

## Data processed by RUNTIME

| Area | Data | Purpose | Current storage |
| --- | --- | --- | --- |
| Guest profile | chosen player name, random player ID, token hash, creation and last-seen timestamps | provide a persistent guest game profile | MySQL `players` |
| Optional account | player name, email address, password hash, account timestamp, token hash | authentication and cross-device progression | MySQL `players` |
| Game operation | match state, room code, player association and action/version data | conduct and reconnect server-authoritative matches | MySQL match tables |
| Balance telemetry | action type, accepted/rejected result, timing/version data and match summaries | reliability and game balancing | MySQL telemetry tables |
| Feedback | match association and rating | game balancing | MySQL `match_feedback` |
| Administration | administrator/target IDs, action and details | accountability for administrative changes | MySQL `admin_audit_log` |
| Browser storage | authentication token, cached identity, locale, deck choice, audio and PWA preferences | keep the selected profile and settings on the device | browser local storage/cache |

The application code does not intentionally store IP addresses or advertising identifiers. Web-server and hosting logs must be documented separately because they are controlled by the production infrastructure rather than this repository.

## Decisions still requiring verification

- Concrete retention periods and automated cleanup rules for guest profiles, matches, admin logs and infrastructure logs.
- Hosting provider and any other recipients/processors, including the applicable data-processing agreements.
- Whether data is transferred outside the EEA and, if so, the applicable safeguards.
- Whether minors may create accounts and which age/consent rules apply.

## Implemented account deletion

Account deletion requires the current password and an explicit irreversible-action confirmation. It revokes the active token, removes related gameplay, collection, progression, feedback and telemetry data, and irreversibly anonymizes the remaining player row. Admin audit references are detached rather than silently rewriting the audit history. The HTTP integration test covers missing confirmation, a wrong password, successful deletion, token invalidation and rejected login; execution still requires a disposable database or a narrowly scoped post-deployment smoke-test account.
