#!/bin/bash

# Define paths
BASE_DIR="./"
OUTPUT_DIR="./aptos-confidential-asset-wasm-bindings"
OUTPUT_FILE="$OUTPUT_DIR/index.d.ts"
PACKAGE_JSON="$OUTPUT_DIR/package.json"
PKG_NAME="@aptos-labs/confidential-asset-wasm-bindings"
PKG_VERSION="0.1.0"

# Check and Install Rollup
if ! command -v rollup &> /dev/null; then
  echo "Rollup is not installed. Installing Rollup..."
  npm install --global rollup
fi

# Ensure the base directory exists
if [ ! -d "$BASE_DIR" ]; then
  echo "Error: Directory $BASE_DIR does not exist."
  exit 1
fi

# Step 1: Generate unified subfoldered package
echo "Generating unified subfoldered package in $OUTPUT_DIR..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

CURRENT_VERSION=$(npm view $PKG_NAME version)

# Increase patch
NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')

# Initialize the main package.json
cat <<EOF > "$PACKAGE_JSON"
{
  "name": "$PKG_NAME",
  "version": "$NEW_VERSION",
  "description": "Unified bindings for WASM packages",
  "type": "module",
  "exports": {
EOF

# Process each WASM package in the aptos-wasm folder
for PACKAGE_DIR in "$BASE_DIR"/*; do
  if [ -d "$PACKAGE_DIR" ] && [ -f "$PACKAGE_DIR/Cargo.toml" ]; then
    PACKAGE_NAME=$(basename "$PACKAGE_DIR")
    PACKAGE_OUTPUT_DIR="$OUTPUT_DIR/$PACKAGE_NAME"

    echo "Processing package: $PACKAGE_NAME"

    # Copy the pkg directory to the unified bindings folder
    mkdir -p "$PACKAGE_OUTPUT_DIR"
    cp -r "$PACKAGE_DIR/pkg/"* "$PACKAGE_OUTPUT_DIR"

    # Remove the subfolder's package.json file
    if [ -f "$PACKAGE_OUTPUT_DIR/package.json" ]; then
      rm "$PACKAGE_OUTPUT_DIR/package.json"
      rm "$PACKAGE_OUTPUT_DIR/.gitignore"
    fi

    # Extract the WASM metadata
    MAIN_FILE=$(find "$PACKAGE_OUTPUT_DIR" -name "*.js" -print -quit)
    TYPES_FILE=$(find "$PACKAGE_OUTPUT_DIR" -name "*.d.ts" -not -name "*.wasm.d.ts" -print -quit)

    # Rename main.js to main-esm.js
    ESM_FILE="${MAIN_FILE%.js}-esm.js"
    mv "$MAIN_FILE" "$ESM_FILE"
    echo "Renamed $(basename "$MAIN_FILE") to $(basename "$ESM_FILE")"

    # Step 2: Run Rollup to create CJS format
    CJS_FILE="${ESM_FILE%-esm.js}-cjs.js"
    echo "Creating CJS format for $PACKAGE_NAME..."
    npx rollup "$ESM_FILE" --file "$CJS_FILE" --format cjs

    # Add the package export entry to the main package.json
    cat <<EOF >> "$PACKAGE_JSON"
    "./$PACKAGE_NAME": {
      "import": "./$PACKAGE_NAME/$(basename "$ESM_FILE")",
      "require": "./$PACKAGE_NAME/$(basename "$CJS_FILE")",
      "types": "./$PACKAGE_NAME/$(basename "$TYPES_FILE")"
    },
EOF
  fi
done

# Finalize the main package.json
# Remove the trailing comma in the exports object (compatible with macOS and Linux)
TEMP_FILE=$(mktemp)
sed '$ s/,$//' "$PACKAGE_JSON" > "$TEMP_FILE" && mv "$TEMP_FILE" "$PACKAGE_JSON"

# Add the closing braces to package.json
cat <<EOF >> "$PACKAGE_JSON"
  },
  "typesVersions": {
    "*": {
      "*": ["./index.d.ts"],
EOF

# Append each subdirectory name to the `typesVersions` array
for SUBDIR in "$OUTPUT_DIR"/*; do
  if [ -d "$SUBDIR" ]; then
    SUBDIR_NAME=$(basename "$SUBDIR")

    CURR_TYPES_FILE=$(find "$SUBDIR" -name "*.d.ts" -not -name "*.wasm.d.ts" -print -quit)

    echo "      \"$SUBDIR_NAME\": [\"./$SUBDIR_NAME/$(basename "$CURR_TYPES_FILE")\"]," >> "$PACKAGE_JSON"
  fi
done

# Remove the trailing comma and close the JSON array
sed -i '' -e '$ s/,$//' "$PACKAGE_JSON" # macOS-compatible sed command
cat <<EOF >> "$PACKAGE_JSON"
    }
  }
}
EOF

echo "Unified package.json generated at $PACKAGE_JSON."

# Step 3: Generate index.d.ts file
echo "Generating index.d.ts file..."

# Start the index.d.ts file
echo "// Auto-generated index.d.ts file" > "$OUTPUT_FILE"
echo >> "$OUTPUT_FILE"

# Function to convert kebab-case to camelCase
kebab_to_camel() {
  local str="$1"
  echo "$str" | awk -F'-' '{ for (i=1; i<=NF; i++) { if (i==1) printf $i; else printf toupper(substr($i,1,1)) substr($i,2) } }'
}

# Process each subdirectory with a .d.ts file
for PACKAGE_DIR in "$OUTPUT_DIR"/*; do
  if [ -d "$PACKAGE_DIR" ]; then
    DTS_FILE=$(find "$PACKAGE_DIR" -name "*.d.ts" -not -name "*.wasm.d.ts" -print -quit)

    # If a .d.ts file is found, add its namespace export to the index.d.ts
    if [ -n "$DTS_FILE" ]; then
      PACKAGE_NAME=$(basename "$PACKAGE_DIR")
      CAMEL_CASE_NAME=$(kebab_to_camel "$PACKAGE_NAME")
      DTS_FILE_NO_EXT=${DTS_FILE%.d.ts} # Remove the .d.ts extension

      # Add import and namespace wrapper for each package
      echo "import * as ${CAMEL_CASE_NAME}Module from './$PACKAGE_NAME/$(basename "$DTS_FILE_NO_EXT")';" >> "$OUTPUT_FILE"
      echo "declare namespace $CAMEL_CASE_NAME {" >> "$OUTPUT_FILE"
      echo "  export import Types = ${CAMEL_CASE_NAME}Module;" >> "$OUTPUT_FILE"
      echo "}" >> "$OUTPUT_FILE"
      echo >> "$OUTPUT_FILE"
    fi
  fi
done

echo "index.d.ts file generated at $OUTPUT_FILE."

echo "Script completed successfully."
