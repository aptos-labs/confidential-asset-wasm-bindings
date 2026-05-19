#!/usr/bin/env bash
# Build aptos_confidential_asset_ffi into rust/target/release/ so Go/cgo and examples
# find libaptos_confidential_asset_ffi.a (or .lib on Windows).
# A globally set CARGO_TARGET_DIR (e.g. IDE sandbox) would send outputs elsewhere; we unset it here.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(
  unset CARGO_TARGET_DIR
  cd "$ROOT/rust"
  cargo build -p aptos_confidential_asset_ffi --release
)
echo "FFI staticlib: $ROOT/rust/target/release/libaptos_confidential_asset_ffi.a (Unix) or .lib (Windows)"
