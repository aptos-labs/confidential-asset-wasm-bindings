#!/bin/bash
#
# Build the unified WASM crate (discrete log + range proofs combined)
# Default uses tbsgs_k for smallest size with good performance.
#

set -e

cd "$(dirname "$0")/.."

echo "Building unified WASM (discrete log + range proofs)..."

# Build with default features (tbsgs_k)
cd rust/wasm
wasm-pack build --release --target web

echo ""
echo "WASM build complete. Files are available in rust/wasm/pkg:"
ls pkg/*.wasm pkg/*.js pkg/*.d.ts 2>/dev/null | xargs -n1 basename
echo ""
echo "WASM binary size: $(du -h pkg/*.wasm | cut -f1) ($(basename pkg/*.wasm))"
