# Support and upgrades

Brevity is pre-1.0 software. Use explicit versions, review changes, and verify
your application before upgrading. Community support is best effort, with no
uptime, response-time, or security-remediation SLA.

## Runtime compatibility

| Runtime             | Policy                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Node 22 and 24      | Deployment targets covered by the repository's compatibility CI. Use a supported Node LTS release. |
| Node 20             | Legacy compatibility check only; not a recommendation to deploy an end-of-life runtime.            |
| Vercel Node 22      | Synthetic deployed HTTP contracts verified; see [deployment](./deployment#vercel-node-functions).  |
| Lambda              | Requires a separate HTTP integration; not yet verified.                                            |
| Edge/Fetch runtimes | Not supported by the Node HTTP core.                                                               |

An API passing on one runtime is not proof that an application's database,
identity provider, proxy, or hosting configuration works on another. The
[production checklist](./production-readiness) records those distinctions.

## Versioning

Once packages are published, patch versions are for compatible fixes. Intentional
breaking changes before 1.0 belong in a minor version and must be called out in
the [changelog](https://github.com/PortableSheep/brevity/blob/main/CHANGELOG.md),
with migration notes for changed public APIs. Optional packages have their own
dependencies and must be upgraded with compatible framework versions.

Only the latest development code and latest published release are maintenance
targets. Older pre-1.0 branches have no promised backports or long-term support.
There is no fixed release schedule.

The current release gate installs repository-generated tarballs into a clean
consumer. It does not prove npm registry availability, package ownership, signed
provenance, or reproducible builds. Publication and registry-consumer verification
remain separate release steps; this documentation does not announce a release.

## Upgrading an application

1. Pin an exact package version or source commit and commit your lockfile. Keep
   a known-good deployment available for rollback.
2. Read the changelog and migration notes for every intervening version. Review
   optional integration and Node runtime changes as well as core changes.
3. Upgrade in a branch and use a clean install. Run types, application tests,
   and no-JavaScript/browser contracts where applicable.
4. Deploy to staging. Exercise authentication, ownership, forms, cookies,
   persistence, and errors on the actual host. Inspect logs and metrics.
5. Roll out with an application rollback plan. Framework rollback does not undo
   database migrations; plan schema compatibility and restore procedures separately.

Before publishing a framework release, run the repository gates, update the
changelog and affected guides, verify packed consumers, and then verify the actual
published packages and provenance. Never treat a successful dry run as publication.

## Getting help and reporting problems

Use [GitHub issues](https://github.com/PortableSheep/brevity/issues) for ordinary
bugs and documentation problems. Include package versions or commit, Node
version, expected/actual behavior, and a minimal synthetic reproduction. Remove
secrets and personal data.

For a suspected vulnerability, use the
[private reporting channel](https://github.com/PortableSheep/brevity/security/advisories/new),
not a public issue. The
[security policy](https://github.com/PortableSheep/brevity/blob/main/SECURITY.md)
describes scope and reporting expectations.
