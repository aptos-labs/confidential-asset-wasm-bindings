#!/usr/bin/env bash
# Run cross-binding parity checks (Rust core + Go).
# From repo root; requires CGO + FFI staticlib for Go tests.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LIBC_HINT="${APTOS_GO_LIBC:-auto}" # auto | gnu | musl (Linux only)

detect_linux_libc() {
  if [[ "${LIBC_HINT}" == "gnu" || "${LIBC_HINT}" == "musl" ]]; then
    echo "${LIBC_HINT}"
    return
  fi
  if command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then
    echo "musl"
  else
    echo "gnu"
  fi
}

echo "== Rust: aptos_confidential_asset_core cross-version compatibility =="
CARGO_TARGET_DIR="$ROOT/rust/target" cargo test -p aptos_confidential_asset_core --test cross_version_compat --manifest-path rust/Cargo.toml

echo "== Go: aptosconfidential golden tests (requires CGO + FFI staticlib) =="
export CGO_ENABLED=1
if [[ ! -f "$ROOT/rust/target/release/libaptos_confidential_asset_ffi.a" ]]; then
  echo "Building FFI staticlib for cgo..."
  "$ROOT/scripts/build-ffi-for-bindings.sh"
fi

go_test_cmd=(go test -v ./aptosconfidential -count=1 -run "Golden")
if [[ "$(go env GOOS)" == "linux" && "$(detect_linux_libc)" == "musl" ]]; then
  go_test_cmd=(go test -v -tags musl ./aptosconfidential -count=1 -run "Golden")
fi
(cd "$ROOT/bindings/go" && "${go_test_cmd[@]}")

echo "OK: binding parity checks passed."
