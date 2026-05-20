# Native bindings (Go)

Experimental **Go** bindings over the same cryptographic core as the npm package (`@aptos-labs/confidential-asset-bindings`).

## Version alignment

- **npm / JS** remains the primary semver surface (`package.json`).
- **Go module**: `github.com/aptos-labs/confidential-asset-bindings/bindings/go` (use your fork path with `replace` when needed).
- **Native FFI static libraries** ship on **GitHub Releases** (not npm). After each successful **npm** publish, [`release.yml`](../.github/workflows/release.yml) calls **[`bindings-release.yml`](../.github/workflows/bindings-release.yml)** (`workflow_call`) to append staticlibs + `SHA256SUMS` to the Changesets Release for the same semver as `package.json`. It also pushes git tag **`vX.Y.Z`** for version pins (tag push does **not** start the FFI workflow).

## Rust layout

Native bindings (Go, iOS, Android) share a single crate — no separate `mobile` crate.

| Crate | Role |
|-------|------|
| [`aptos_confidential_asset_core`](../rust/core) | Pure crypto (Bulletproofs + discrete log) |
| [`aptos_confidential_asset_ffi`](../rust/ffi) | C ABI + Android JNI (`staticlib` / `cdylib`) — **canonical for Go, iOS, Android** |

C header: [`rust/ffi/include/aptos_confidential_asset.h`](../rust/ffi/include/aptos_confidential_asset.h).

## Building the static library

From the repository root:

```bash
./scripts/build-ffi-for-bindings.sh
```

Or manually (ensure `CARGO_TARGET_DIR` is unset so outputs land under `rust/target/release/`):

```bash
cargo build -p aptos_confidential_asset_ffi --release --manifest-path rust/Cargo.toml
```

## Cross-binding parity

- **Single implementation:** Go calls **`aptos_confidential_asset_ffi`** (same `aptos_confidential_asset_core` as WASM/JS). No duplicate Bulletproofs logic in Go.
- **Golden fixture:** [`tests/fixtures/golden_batch_range_proof.json`](../tests/fixtures/golden_batch_range_proof.json) is produced by Rust (`emit_binding_golden_vector`). Go tests verify that fixture and round-trip prove→verify.
- **Local check:** `./scripts/check-binding-parity.sh` runs Rust `cross_version_compat` + Go golden tests (requires built FFI staticlib).

Regenerate the fixture:

```bash
cargo run --manifest-path rust/Cargo.toml --example emit_binding_golden_vector -p aptos_confidential_asset_core
```

## Go

See [bindings/go/README.md](../bindings/go/README.md) and [examples/go](../examples/go).

Install a prebuilt static library from GitHub Releases (must match a published triple — see below):

```bash
./scripts/install-go-ffi-from-release.sh vX.Y.Z
```

On Linux musl, `musl` must be passed explicitly as a Go build tag:

```bash
APTOS_GO_LIBC=musl ./scripts/install-go-ffi-from-release.sh vX.Y.Z
cd bindings/go
go test -tags musl ./aptosconfidential/...
```

`musl` is a custom repository tag (`cgo_linux_*_musl.go`), not an automatic Go platform tag.

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **Bindings (FFI + Go)** on Ubuntu (`go-bindings-smoke`): build FFI, `go test` in `bindings/go`, smoke test in `examples/go`. **Android JNI (FFI arm64-v8a)** cross-compiles the same crate with `cargo-ndk` + NDK so JNI code is exercised on every Linux PR. Together with lint / JS / Rust tests / macOS full build this gates merges to `main`.

Repository admins should mark **Bindings (FFI + Go)** and **Android JNI (FFI arm64-v8a)** as **required** checks under branch protection for `main`.

## Releases (FFI binaries)

**Normal path:** merging **Version Packages** runs **`release.yml`** on `main`: Changesets publishes to npm and creates the GitHub Release (changelog in the Release body, also in `CHANGELOG.md`); the same workflow run calls **`bindings-release.yml`** via **`workflow_call`** to append prebuilt `libaptos_confidential_asset_ffi` archives and **`SHA256SUMS`**. Git tag **`vX.Y.Z`** is pushed for version pins — tag push does **not** start the FFI workflow.

**Manual fallback:** **Actions → Release native FFI binaries** (`workflow_dispatch`) only when a Release for **`vX.Y.Z`** already exists — see [releasing.md](contributors/releasing.md).

### Prebuilt triples (GitHub Release matrix)

Published by [`bindings-release.yml`](../.github/workflows/bindings-release.yml):

| Target | Notes |
|--------|--------|
| `x86_64-unknown-linux-gnu` | glibc Linux amd64 |
| `aarch64-unknown-linux-gnu` | glibc Linux arm64 |
| `x86_64-unknown-linux-musl` | musl Linux amd64 |
| `aarch64-unknown-linux-musl` | musl Linux arm64 |
| `aarch64-apple-darwin` | Apple Silicon macOS |
| `x86_64-pc-windows-msvc` | Windows amd64 |

**Not published today:** `x86_64-apple-darwin` (Intel Mac — CI matrix disabled), `aarch64-pc-windows-msvc` (Windows arm64). On those hosts, build from source with `cargo build -p aptos_confidential_asset_ffi --release` (add `--target` when cross-compiling).

`install-go-ffi-from-release.sh` only supports triples that appear in the table above.

## Platform matrix (prebuilt artifacts)

The repository **does not** commit `.a` / `.lib` binaries; consumers download release assets or build from source.
