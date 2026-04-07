# Contributing to @aptos-labs/confidential-asset-bindings

## Prerequisites

Install [mise](https://mise.jdx.dev/) to manage exact toolchain versions:

```bash
mise install
```

This installs Node 22 and Rust 1.94.1 as declared in `.mise.toml`. If you prefer to manage toolchains manually, install those versions yourself and also install [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/), [cargo-ndk](https://github.com/bbqsrc/cargo-ndk) (for Android), and Xcode command-line tools (for iOS).

Then install npm dependencies:

```bash
npm install
```

## Build commands

| Command | What it does |
|---|---|
| `npm run build` | Full build: compiles Rust to WASM, Android .so, and iOS xcframework, then bundles JS/TS |
| `npm run build:wasm` | Compiles Rust to WASM via wasm-pack; outputs to `build/wasm/` |
| `npm run build:android` | Compiles Rust to Android shared libraries via cargo-ndk |
| `npm run build:ios` | Builds iOS xcframework via xcodebuild + lipo |
| `npm run build:lib` | Runs tsdown to produce the JS/TS bundle; requires WASM to be pre-built |

Build artifacts:
- `build/wasm/` — intermediate wasm-pack output (gitignored)
- `dist/` — final npm package artifacts: ESM, CJS, type declarations, WASM binary

## Testing

Run Rust tests (includes cross-version Bulletproof compatibility tests):

```bash
cargo test --manifest-path rust/Cargo.toml --workspace
```

Run JS tests (expo-module test runner):

```bash
npm test
```

Lint and format check:

```bash
npm run lint
```

Type check:

```bash
npm run typecheck
```

All four checks must pass before opening a pull request.

## Coding standards

- **Cryptographic logic belongs in `rust/core`.** The `aptos_confidential_asset_core` crate has no WASM dependencies and should remain independently testable in pure Rust.
- **WASM wrappers belong in `rust/wasm`.** The `aptos_confidential_asset_wasm` crate is a thin layer that calls into `core`, handles JS serialization, and maps errors to `JsError`. Do not put algorithmic logic here.
- **Validate inputs at boundaries.** Argument validation (lengths, bit widths, etc.) should happen in the WASM or JS layer before passing data into core functions.
- **Follow Biome rules.** Run `npm run lint` before committing. The project uses Biome for both linting and formatting.

## Branch and PR process

1. Create a feature branch from `main`.
2. Keep PRs focused — one logical change per PR.
3. Use [Conventional Commits](https://www.conventionalcommits.org/) for PR titles and commit messages: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, etc.
4. If your change affects the published package, add a changeset (see below).
5. Ensure all tests, lint, and typecheck pass locally before opening a PR.

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

Add a changeset for any change that affects the published package:

```bash
npm run changeset
```

Follow the prompts to pick a bump type and describe the change. Commit the generated `.changeset/*.md` file alongside your code.

**Bump type guide:**

| Type | When to use |
|---|---|
| `patch` | Bug fixes, internal refactors with no API impact |
| `minor` | New functionality, backwards-compatible |
| `major` | Breaking changes to the public API |

Changes that do **not** need a changeset: CI configuration, dev tooling changes, test-only changes, documentation updates.

## Discussions and issues

Open a [GitHub issue](https://github.com/aptos-labs/confidential-asset-bindings/issues) for bug reports, feature requests, or questions before starting significant work.

For deeper contributor documentation — architecture decisions, project structure, platform-specific build details — see [`docs/contributors/`](docs/contributors/).
