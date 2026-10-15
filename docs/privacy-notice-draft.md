# Privacy notice draft

> Internal draft only. Do not publish this text until every bracketed field and retention decision has been completed and reviewed for the actual operator and hosting setup.

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

## Decisions required before publication

- Legal basis for account, gameplay, telemetry and security-log processing.
- Concrete retention periods and automated deletion/anonymization rules for guest profiles, accounts, matches, telemetry, feedback, admin logs and server logs.
- Hosting provider and any other recipients/processors, including the applicable data-processing agreements.
- Whether data is transferred outside the EEA and, if so, the applicable safeguards.
- Contact and verified workflow for access, correction, export, objection and deletion requests.
- Supervisory authority and complaint information applicable to the controller.
- Whether minors may create accounts and which age/consent rules apply.

## Account deletion acceptance criteria

The planned account-deletion feature must require fresh authentication, clearly explain irreversible effects, revoke the token, remove or anonymize personal data across related tables, preserve only records that have a documented legal/security need, and return a neutral confirmation. It requires API-domain tests plus an HTTP integration test against a disposable database.
