#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/build/wasm"

wasm-pack build "$REPO_ROOT/rust/wasm" \
    --target web \
    --out-dir "$OUT_DIR" \
    --release

rm "$OUT_DIR"/.gitignore 2>/dev/null || true

wasm_file=$(find "$OUT_DIR" -maxdepth 1 -name "*.wasm" ! -name "*.d.ts" -print -quit 2>/dev/null)

if [ -n "$wasm_file" ]; then
    size_bytes=$(stat -f%z "$wasm_file" 2>/dev/null || stat -c%s "$wasm_file")
    if (( size_bytes >= 1048576 )); then
        size_human=$(printf "%d MiB" "$(( size_bytes / 1048576 ))")
    elif (( size_bytes >= 1024 )); then
        size_human=$(printf "%d KiB" "$(( size_bytes / 1024 ))")
    else
        size_human=$(printf "%d B" "$size_bytes")
    fi
    echo "$(basename "$wasm_file") built - $size_human ($size_bytes bytes)"
fi
