#!/bin/bash
# Build MultiView for Chrome and Firefox

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Building MultiView..."

# ExtensionPay SDK must be vendored at src/shared/ExtPay.js
if [ ! -f "$DIR/src/shared/ExtPay.js" ]; then
  echo "ERROR: src/shared/ExtPay.js is missing." >&2
  echo "  Get it with one of:" >&2
  echo "    curl -L https://unpkg.com/extpay/dist/ExtPay.js -o src/shared/ExtPay.js" >&2
  echo "    npm pack extpay && tar -xzf extpay-*.tgz package/dist/ExtPay.js -O > src/shared/ExtPay.js" >&2
  echo "  Then register the extension at https://extensionpay.com and set EXTENSION_ID in src/shared/license.js" >&2
  exit 1
fi

# Chrome build
echo "  -> Chrome (Manifest V3)"
rm -rf "$DIR/dist-chrome"
mkdir -p "$DIR/dist-chrome"
cp -r "$DIR/src" "$DIR/dist-chrome/src"
cp -r "$DIR/icons" "$DIR/dist-chrome/icons"
cp "$DIR/manifest.json" "$DIR/dist-chrome/manifest.json"

# Firefox build
echo "  -> Firefox (Manifest V2)"
rm -rf "$DIR/dist-firefox"
mkdir -p "$DIR/dist-firefox"
cp -r "$DIR/src" "$DIR/dist-firefox/src"
cp -r "$DIR/icons" "$DIR/dist-firefox/icons"
cp "$DIR/manifest.firefox.json" "$DIR/dist-firefox/manifest.json"

echo "Done!"
echo "  Chrome:  $DIR/dist-chrome/"
echo "  Firefox: $DIR/dist-firefox/"
echo ""
echo "To load in Chrome:"
echo "  1. Go to chrome://extensions"
echo "  2. Enable Developer mode"
echo "  3. Click 'Load unpacked' and select dist-chrome/"
echo ""
echo "To load in Firefox:"
echo "  1. Go to about:debugging#/runtime/this-firefox"
echo "  2. Click 'Load Temporary Add-on'"
echo "  3. Select dist-firefox/manifest.json"
