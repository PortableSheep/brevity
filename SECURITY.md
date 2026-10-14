# Security policy

## Reporting a vulnerability

Use GitHub's private
[Report a vulnerability](https://github.com/PortableSheep/brevity/security/advisories/new)
channel for suspected vulnerabilities. Private vulnerability reporting is enabled
for this repository. Do not open a public issue with exploit details or disclose
an unfixed vulnerability in a pull request.

Include the affected package and version or commit, Node version, a minimal
synthetic reproduction, the expected and actual behavior, and the potential
impact. Never include credentials, session tokens, personal data, or production
database contents. Test only systems you own or are authorized to test.

There is no guaranteed response or remediation SLA. Reports are handled on a
best-effort basis. Coordinate disclosure privately while a report is investigated.
If confirmed, a fix and advisory can identify affected versions and mitigation.

## Supported code

Security fixes target the latest development code and, when published, the
latest release. There is no commitment to backport fixes to older pre-1.0
versions. See the [support and upgrade policy](docs/guide/support.md).

## Application responsibilities

Authentication, authorization, CSRF protection, session policy, rate limiting,
proxy trust, TLS, secret handling, and deployment configuration remain
application-owned. Use supported Node versions and keep optional integrations
and their dependencies updated. Never expose development diagnostics or tooling
servers as production endpoints.

CI, dependency audits, and bounded framework checks are evidence for specific
contracts, not a guarantee that an application is secure.
