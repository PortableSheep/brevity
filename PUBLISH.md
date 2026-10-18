# Releasing Brevity

All nine packages are published at `0.1.0`. Packing, verifying, and publishing
remain separate actions. Future publication requires explicit maintainer approval,
npm scope ownership, and a reviewed source commit. Do not disable 2FA or place
registry tokens in this repo.

The framework is called **Brevity**. Packages use the maintainer's
`@portablesheep` scope: `@portablesheep/brevity` is core; optional packages are
`@portablesheep/brevity-web`, `brevity-views`, `brevity-islands`,
`brevity-islands-svelte`, and `brevity-plugin-{cache,debug,viewer,validation}`
under that same scope. The `@brevity` organization belongs to someone else.

The initial release was published on October 18, 2026 (UTC) by `portablesheep`
from `8d5ff11ba8c9e154da54278af8f391c9215c0bb5`, using Node 22.21.1 and
npm 11.13.0. Its [source CI run](https://github.com/PortableSheep/brevity/actions/runs/39102612653)
passed. This authenticated local bootstrap has no provenance attestation.
Registry metadata does not include `gitHead`; matching archive integrity ties
the registry artifacts to the checked local build, not an independent build.
The [0.1.0 release](https://github.com/PortableSheep/brevity/releases/tag/v0.1.0)
includes a per-package integrity and verification record. Registry consumer and
starter checks passed; npm verified 32 registry signatures and seven dependency
attestations, and the consumer's production audit found no vulnerabilities.
Those dependency attestations are not provenance for Brevity.

## Candidate checks (no publication)

Use a supported Node LTS release with npm. CI checks Node 20/22/24 compatibility;
prefer Node 22/24 for release work. From a clean checkout of the intended commit:

```sh
npm ci
npm test
npm run typecheck
npm run test:release
npm run docs:build
npx playwright install chromium
npm run docs:e2e
```

`test:release` packs all nine workspaces into a temporary directory, verifies
license/source/runtime metadata and every declared export target (including
conditional JavaScript and declaration exports), compares two tarballs from
unchanged build output, then installs into an isolated consumer. It exercises
strict TypeScript, standard decorators, the detached HTTP handler, plugins,
views, optional browser exports, the Svelte adapter, and starter dev/compiled
startup. The server-only production install must not contain Svelte. Temporary
consumers are removed even on failure. This is not a registry-install test or
proof that two independent builds produce identical output.

The packages use the maintainer-approved MIT license. Each archive includes its
license; repository metadata points to its workspace in PortableSheep/brevity.
Core and web retain zero external runtime dependencies. Eta remains an optional
views-package dependency; Svelte stays in the optional adapter's peer graph.

## Before approving publication

- Confirm control of the **@portablesheep** npm scope and permission for all nine names.
  Public repository ownership does not grant npm scope ownership. If names must
  change, update manifests, dependency ranges, starter, imports, and docs together;
  rerun the candidate checks rather than applying a blind rename.
- Confirm each candidate version is unused in the registry. Keep the initial
  `0.1.0` only if available; do not bump versions or create tags just to prepare.
- Review `CHANGELOG.md` against the candidate commit. Set versions and all internal
  dependency/peer ranges deliberately; keep the lockfile and starter consistent.
- Review the packed file lists (`npm pack --dry-run --json --workspace <name>`).
  No credentials, local databases, private applications, or deployment metadata
  belong in a package.
- Confirm licensing/third-party obligations and the supported-runtime policy.
- Choose the release commit, publication mechanism, and approval boundary before
  adding a publishing workflow. The repository currently has verification/Pages
  CI only; **there is no automatic publishing workflow**.

## Trusted publishing and provenance

Prefer npm [trusted publishing](https://docs.npmjs.com/trusted-publishers/) from a
GitHub-hosted runner over long-lived registry tokens. Follow npm's current CLI
and Node prerequisites; do not assume the npm bundled with an older Node release
supports OIDC publishing. Configure each package's trusted publisher to the exact
`PortableSheep/brevity` repository, future workflow filename, and any protected
GitHub environment. Keep that environment approval-gated and grant
`id-token: write` only to the publishing job. Do not add a `NODE_AUTH_TOKEN` as a
substitute for configuring trusted publishing.

For a new package, npm's package-settings trusted-publisher flow may require an
initial authenticated publication before the package exists. Resolve that
bootstrap explicitly with the maintainer; do not claim the first release has
provenance unless the registry actually exposes and verifies an attestation.
Keep 2FA enabled. With supported public repositories and runners, trusted
publishing automatically generates provenance. A local `npm pack` or a successful
CI build alone does not generate a published provenance attestation.

After explicit publication approval, build and verify the exact reviewed commit,
then publish its packages in dependency order: core, web, the four core plugins,
views, islands, islands-svelte. `npm run publish:all` publishes packages; it is not
a dry run or an attestation guarantee. Do not run it during preparation. Publishing
is not atomic across packages: stop on failure, inspect already-published versions,
and never overwrite or blindly repeat a partially completed release.

## Registry verification and release record

After publication, install the **exact released versions** in a new directory
outside this checkout, without tarball paths, workspace links, or overrides.
Run the existing consumer checks in registry mode:

```sh
npm run build:packages
node scripts/check-release.mjs --registry
```

This compares published and local archive integrity and repository metadata,
installs exact registry versions, exercises server/HTTP/types/adapter/starter
behavior, and runs `npm audit signatures` and a production dependency audit in
the isolated consumer. Signature verification is not a vulnerability audit or an
independent reproducible-build proof. Inspect provenance information separately;
do not infer a source commit from a signature.

Only after registry verification, publish release notes/tag for that exact
commit and record versions, Node/npm/toolchain, CI run, registry integrity,
attestation results, and any migration notes. Do not label a source-only tarball
as a published, signed, or reproducible registry release.

## Fresh-developer walkthrough

Have someone unfamiliar with Brevity follow the public getting-started guide and
starter README from a fresh checkout/registry consumer. Record the actual steps,
blockers and time, including ESM setup, template copying, startup and shutdown.
Our automated packed consumer is a useful rehearsal, not independent onboarding.
The starter now installs from npm; repository examples remain available for
framework development.
