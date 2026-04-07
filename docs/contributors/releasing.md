# Releasing

## Versioning policy

This package follows [Semantic Versioning](https://semver.org/):

- **patch** — backwards-compatible bug fixes (no API or behaviour changes visible to callers)
- **minor** — backwards-compatible new features or additions to the public API
- **major** — breaking changes to the public API or proof format

Version history is recorded in `CHANGELOG.md` and maintained automatically by Changesets.

## Adding a changeset

Every user-facing change must be accompanied by a changeset. Run:

```bash
npm run changeset
```

The interactive prompt asks you to:

1. Select the packages affected (there is one: `@aptos-labs/confidential-asset-bindings`).
2. Choose a bump type: `patch`, `minor`, or `major`.
3. Write a short description of the change (one sentence is enough).

This creates a Markdown file under `.changeset/`. Commit it alongside your code changes.

### Bump type guide

| Change | Bump |
|---|---|
| Bug fix with no API change | patch |
| New exported function or type | minor |
| Changed or removed export, changed proof format | major |
| Performance improvement with no observable API change | patch |
| New platform support (e.g. new architecture) | minor |
| Breaking change to DiscreteLogSolver interface | major |

### What does NOT require a changeset

- CI workflow changes (`.github/workflows/`)
- Tooling config changes (`biome.json`, `tsconfig.json`, `.mise.toml`, etc.)
- Documentation changes (`docs/`, `README.md`, `CONTRIBUTING.md`)
- Test-only changes (no production code modified)
- Internal refactors with no observable behaviour change — though add a changeset if you are unsure

## Release workflow

1. **Add a changeset** during your feature or fix branch (see above).
2. **Open a pull request** to `main`. CI must pass.
3. **Merge the PR.** The `release.yml` workflow runs on push to `main`.
4. **Changesets action evaluates pending changesets:**
   - If there are pending changesets, it opens or updates a pull request titled "Version Packages". This PR bumps version numbers and updates `CHANGELOG.md`.
   - If there are no pending changesets, nothing happens.
5. **Review and merge the "Version Packages" PR** when you are ready to publish. CI runs again.
6. **On merge, `changesets/action` publishes to npm** by running `npm run release`. The package appears on the npm registry under `@aptos-labs/confidential-asset-bindings`.

## GitHub App bot

The release workflow authenticates to GitHub using the Aptos Labs Bot GitHub App. The app provides a token with permission to create and merge PRs on the repository. You do not need to configure this manually; it is set up in `release.yml`.

## Verifying a release

After the "Version Packages" PR is merged and the publish step completes:

1. **Check the npm registry:**

   ```bash
   npm view @aptos-labs/confidential-asset-bindings version
   ```

   The version should match the one in the merged "Version Packages" PR.

2. **Check `CHANGELOG.md`** in `main` — it should contain a new entry for the released version with all changeset descriptions included.

3. **Spot-check the published package:**

   ```bash
   npm pack @aptos-labs/confidential-asset-bindings
   tar -tf aptos-labs-confidential-asset-bindings-*.tgz | head -40
   ```

   Verify that `dist/` contains the ESM bundle, CJS bundle, type declarations, and `.wasm` file.

## Pre-publishing checklist

Before merging a "Version Packages" PR, confirm the following:

- [ ] All CI jobs pass on `main` (lint, typecheck, test-rust, test-js, build).
- [ ] Cross-version compatibility tests pass (`rust/core/tests/cross_version_compat.rs`). This is mandatory if any change touched `rust/core/src/range_proof.rs`.
- [ ] The examples (browser, node, expo) work against the current build.
- [ ] `CHANGELOG.md` in the "Version Packages" PR accurately describes the release.
- [ ] If this is a major release, the Aptos network team has been notified of any proof format or DST changes that affect the on-chain verifier.
