# Security policy

## Supported version

Security fixes target the current `master` branch and the currently deployed release. Older commits and private forks are not maintained.

## Reporting a vulnerability

Please do not open a public issue for an undisclosed vulnerability, leaked credential or exploit.

Use GitHub's private vulnerability reporting for this repository:

`https://github.com/QuickLinkNet/runtime/security/advisories/new`

If private reporting is not enabled yet, contact the repository owner through the GitHub organization before sharing technical details. Include the affected component, reproduction steps, expected impact and any suggested mitigation. Do not access, alter or retain other users' data while testing.

## Secrets

Never commit production credentials, database exports or populated `.env` files. If a secret is exposed, revoke or rotate it immediately; removing it in a later commit does not remove it from Git history.
