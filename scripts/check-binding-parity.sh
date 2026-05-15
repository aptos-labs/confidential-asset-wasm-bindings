#!/usr/bin/env bash
# Run cross-binding golden parity checks (Rust core + Go).
# From repo root; requires CGO + FFI staticlib for Go tests.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== Rust: aptos_confidential_asset_core binding_golden_fixture =="
cargo test -p aptos_confidential_asset_core --test binding_golden_fixture --manifest-path rust/Cargo.toml

echo "== Go: aptosconfidential golden tests (requires CGO + FFI staticlib) =="
export CGO_ENABLED=1
if [[ ! -f "$ROOT/rust/target/release/libaptos_confidential_asset_ffi.a" ]]; then
  echo "Building FFI staticlib for cgo..."
  cargo build -p aptos_confidential_asset_ffi --release --manifest-path rust/Cargo.toml
fi
(cd "$ROOT/bindings/go" && go test -v ./aptosconfidential -count=1 -run 'Golden')

echo "OK: binding parity checks passed."
