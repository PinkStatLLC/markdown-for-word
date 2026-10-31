#!/bin/zsh
# Installs "Markdown for Word.app" into ~/Applications (or $INSTALL_DIR).
# Add --set-default to make it the default app for .md files. Safe to rerun.
set -e
HERE="${0:A:h}"
DEST="${INSTALL_DIR:-$HOME/Applications}"
APP="$DEST/Markdown for Word.app"
BUNDLE_ID="io.github.markdown-for-word"
PANDOC_VERSION="3.13"

case "$(uname -m)" in
  arm64)  ARCH=arm64;  SHA=f436d18bebbfb3ddd326597686dacab9fac5dc23bd060495020f35a28a43a7c3 ;;
  x86_64) ARCH=x86_64; SHA=1823278715aa405aaf21b59cde5dc789346aa8d4fc307467f9a9ee84162bedc5 ;;
  *) echo "Unsupported Mac architecture: $(uname -m)"; exit 1 ;;
esac

[ -d "/Applications/Microsoft Word.app" ] || echo "Note: Microsoft Word was not found in /Applications."

WORK="$(mktemp -d)"
ZIP="pandoc-$PANDOC_VERSION-$ARCH-macOS.zip"
echo "Downloading pandoc $PANDOC_VERSION ($ARCH) from github.com/jgm/pandoc ..."
curl -sSfL -o "$WORK/$ZIP" "https://github.com/jgm/pandoc/releases/download/$PANDOC_VERSION/$ZIP"
echo "$SHA  $WORK/$ZIP" | shasum -a 256 -c - >/dev/null || { echo "pandoc download failed its checksum. Stopping."; exit 1; }
unzip -q "$WORK/$ZIP" -d "$WORK"

TMP="$WORK/Markdown for Word.app"
osacompile -s -l JavaScript -o "$TMP" "$HERE/src/main.js"
cp "$WORK/pandoc-$PANDOC_VERSION-$ARCH/bin/pandoc" "$TMP/Contents/Resources/pandoc"
chmod +x "$TMP/Contents/Resources/pandoc"

P="$TMP/Contents/Info.plist"
PB=/usr/libexec/PlistBuddy
$PB -c "Set :CFBundleIdentifier $BUNDLE_ID" "$P" 2>/dev/null || $PB -c "Add :CFBundleIdentifier string $BUNDLE_ID" "$P"
$PB -c "Delete :CFBundleDocumentTypes" "$P" 2>/dev/null || true
$PB -c "Add :CFBundleDocumentTypes array" "$P"
$PB -c "Add :CFBundleDocumentTypes:0 dict" "$P"
$PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeName string Markdown" "$P"
$PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeRole string Editor" "$P"
$PB -c "Add :CFBundleDocumentTypes:0:LSHandlerRank string Alternate" "$P"
$PB -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes array" "$P"
$PB -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:0 string net.daringfireball.markdown" "$P"
$PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeExtensions array" "$P"
for i e in 0 md 1 markdown 2 mdown 3 mkd; do
  $PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeExtensions:$i string $e" "$P"
done

codesign --force --deep --sign - "$TMP"
mkdir -p "$DEST"
rm -rf "$APP"
ditto "$TMP" "$APP"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP"
if [[ "$1" == "--set-default" ]]; then
  osascript -l JavaScript "$HERE/src/set-default.js"
fi
echo "Installed: $APP"
