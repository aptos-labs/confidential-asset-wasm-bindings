#!/bin/bash
#
# Builds all discrete log feature variants and prints a WASM size comparison table.
#
# Each feature is built with wasm-pack into build/wasm/{feature}/ and the
# resulting binary sizes are displayed side by side.
#
# Usage:
#   ./scripts/wasm-sizes.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_CRATE="$REPO_ROOT/rust/wasm"

# Known features and their embedded lookup table sizes
FEATURES=("tbsgs_k"              "bsgs_k"       "bsgs"         "bl12"          )
TABLE_SIZES=("~512 KiB"          "~2.0 MiB"     "~2.0 MiB"     "~258 KiB"      )

echo "Building all features..."

for feature in "${FEATURES[@]}"; do
    out_dir="$REPO_ROOT/build/wasm/$feature"
    echo "  building $feature"
    wasm-pack build "$WASM_CRATE" \
        --target web \
        --out-dir "$out_dir" \
        --release \
        --no-default-features \
        --features "$feature" \
        > /dev/null 2>&1
done

echo ""

humanize_bytes() {
    local bytes=$1
    if (( bytes >= 1048576 )); then
        printf "%.2f MiB" "$(echo "scale=2; $bytes / 1048576" | bc)"
    elif (( bytes >= 1024 )); then
        printf "%.2f KiB" "$(echo "scale=2; $bytes / 1024" | bc)"
    else
        printf "%d B" "$bytes"
    fi
}

# Table layout
COL_FEATURE=12
COL_TABLE=12
COL_WASM=26

sep_seg() { printf '%*s' "$1" '' | tr ' ' '-'; }
SEP_LINE="+-$(sep_seg $COL_FEATURE)-+-$(sep_seg $COL_TABLE)-+-$(sep_seg $COL_WASM)-+"

print_row() {
    printf "| %-${COL_FEATURE}s | %${COL_TABLE}s | %-${COL_WASM}s |\n" "$1" "$2" "$3"
}

echo "$SEP_LINE"
print_row "Feature" "Table Size" "WASM Size"
echo "$SEP_LINE"

for i in "${!FEATURES[@]}"; do
    feature="${FEATURES[$i]}"
    table_size="${TABLE_SIZES[$i]}"

    wasm_file=$(find "$REPO_ROOT/build/wasm/$feature" -maxdepth 1 -name "*.wasm" ! -name "*.d.ts" -print -quit 2>/dev/null)

    if [ -n "$wasm_file" ]; then
        size_bytes=$(stat -f%z "$wasm_file" 2>/dev/null || stat -c%s "$wasm_file")
        wasm_size="$(humanize_bytes "$size_bytes") ($size_bytes bytes)"
    else
        wasm_size="build failed"
    fi

    print_row "$feature" "$table_size" "$wasm_size"
done

echo "$SEP_LINE"
