# Support and upgrades

Brevity is pre-1.0. Pin versions and test your app before upgrading. Support is
best effort, without a response-time or uptime guarantee.

## Supported runtimes

Use **Node 22 or 24** for deployment. CI also checks Node 20 for compatibility,
but we don't recommend deploying an end-of-life runtime.

Vercel Node 22 has been exercised with a live app. Lambda needs an adapter and
hasn't been verified; Edge/Fetch runtimes aren't supported. See [deployment](./deployment).

## Upgrade safely

1. Read the [changelog](https://github.com/PortableSheep/brevity/blob/main/CHANGELOG.md)
   and migration notes. Pin the new version and commit your lockfile.
2. Upgrade in a branch. Run your types, tests, and browser checks.
3. Exercise auth, forms, persistence, and errors in staging before rolling out.
   Keep a known-good release available for rollback.

Rolling back framework code doesn't undo a database migration. Plan schema
compatibility separately.

## Version policy

Patch releases contain compatible fixes. Before 1.0, breaking changes use a
minor version and include migration notes. Only the latest development code and
latest published release are maintenance targets; older branches have no promised
backports. There's no fixed release schedule.

Packages aren't published to npm yet. See the
[release runbook](https://github.com/PortableSheep/brevity/blob/main/PUBLISH.md)
for publication and provenance checks.

## Get help

[Open an issue](https://github.com/PortableSheep/brevity/issues) with your
package/Node versions, expected and actual behavior, and a small reproduction.
Remove credentials and personal data.

Report vulnerabilities through the
[private security channel](https://github.com/PortableSheep/brevity/security/advisories/new),
not a public issue. See the
[security policy](https://github.com/PortableSheep/brevity/blob/main/SECURITY.md).
