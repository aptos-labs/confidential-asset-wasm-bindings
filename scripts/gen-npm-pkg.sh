#!/bin/bash
#
# Generates the npm package from the unified WASM build.
# Run this after building the unified WASM package.
#

set -e

# Get the repo root (parent of scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Define paths
OUTPUT_DIR="./aptos-confidential-asset-wasm-bindings"
PACKAGE_JSON="$OUTPUT_DIR/package.json"
PKG_NAME="@aptos-labs/confidential-asset-wasm-bindings"

# Check and Install Rollup
if ! command -v rollup &> /dev/null; then
  echo "Rollup is not installed. Installing Rollup..."
  npm install --global rollup
fi

# Get next version by incrementing patch
CURRENT_VERSION=$(npm view $PKG_NAME version 2>/dev/null || echo "0.1.0")
NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')

echo "Generating npm package (version $NEW_VERSION)..."

# Clean and create output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy wasm pkg files
mkdir -p "$OUTPUT_DIR"
cp -r rust/wasm/pkg/* "$OUTPUT_DIR/"

# Remove unnecessary files
rm -f "$OUTPUT_DIR/package.json"
rm -f "$OUTPUT_DIR/.gitignore"

# Get file names
JS_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.js" -print -quit)
TYPES_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.d.ts" -not -name "*.wasm.d.ts" -print -quit)
WASM_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.wasm" -print -quit)

JS_BASENAME=$(basename "$JS_FILE")
TYPES_BASENAME=$(basename "$TYPES_FILE")
WASM_BASENAME=$(basename "$WASM_FILE")

# Rename JS to ESM format
ESM_FILE="${JS_FILE%.js}-esm.js"
mv "$JS_FILE" "$ESM_FILE"
ESM_BASENAME=$(basename "$ESM_FILE")

# Create CJS format with Rollup
CJS_BASENAME="${ESM_BASENAME%-esm.js}-cjs.js"
CJS_FILE="$OUTPUT_DIR/$CJS_BASENAME"
echo "Creating CJS format..."
npx rollup "$ESM_FILE" --file "$CJS_FILE" --format cjs 2>/dev/null

# Generate package.json
cat <<EOF > "$PACKAGE_JSON"
{
  "name": "$PKG_NAME",
  "version": "$NEW_VERSION",
  "description": "Unified WASM bindings for Aptos confidential assets (discrete log + range proofs)",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "https://github.com/aptos-labs/confidential-asset-wasm-bindings.git"
  },
  "main": "./$CJS_BASENAME",
  "module": "./$ESM_BASENAME",
  "types": "./$TYPES_BASENAME",
  "exports": {
    ".": {
      "import": "./$ESM_BASENAME",
      "require": "./$CJS_BASENAME",
      "types": "./$TYPES_BASENAME"
    },
    "./*.wasm": "./$WASM_BASENAME"
  },
  "files": [
    "$ESM_BASENAME",
    "$CJS_BASENAME",
    "$TYPES_BASENAME",
    "*.wasm",
    "*.wasm.d.ts"
  ],
  "keywords": [
    "aptos",
    "confidential",
    "wasm",
    "bulletproofs",
    "discrete-log",
    "range-proof"
  ],
  "license": "Apache-2.0"
}
EOF

# Create index.js and index.d.ts symlinks for simple import
(cd "$OUTPUT_DIR" && ln -sf "$ESM_BASENAME" index.js && ln -sf "$TYPES_BASENAME" index.d.ts)

echo "Generated npm package at $OUTPUT_DIR/"
echo ""
echo "Files:"
ls -lh "$OUTPUT_DIR"
