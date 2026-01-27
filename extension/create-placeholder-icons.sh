#!/bin/bash
# Create simple placeholder icons for Whspr Voice Input extension
# Requires ImageMagick (install with: sudo apt-get install imagemagick)

ICON_DIR="/home/twoski/Whspr/extension"
ORANGE="#ff6b35"
BG="#0a0a0f"

echo "Creating placeholder icons for Whspr Voice Input..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed."
    echo "Install it with: sudo apt-get install imagemagick"
    exit 1
fi

# Create 16x16 icon
convert -size 16x16 xc:"$BG" \
    -fill "$ORANGE" \
    -draw "circle 8,8 8,3" \
    -draw "rectangle 6,8 10,12" \
    -draw "rectangle 7,12 9,14" \
    "$ICON_DIR/icon16.png"

# Create 48x48 icon
convert -size 48x48 xc:"$BG" \
    -fill "$ORANGE" \
    -draw "circle 24,24 24,10" \
    -draw "rectangle 18,24 30,36" \
    -draw "rectangle 21,36 27,42" \
    "$ICON_DIR/icon48.png"

# Create 128x128 icon
convert -size 128x128 xc:"$BG" \
    -fill "$ORANGE" \
    -draw "circle 64,64 64,28" \
    -draw "rectangle 48,64 80,96" \
    -draw "rectangle 56,96 72,112" \
    "$ICON_DIR/icon128.png"

echo "✓ Created icon16.png (16x16)"
echo "✓ Created icon48.png (48x48)"
echo "✓ Created icon128.png (128x128)"
echo ""
echo "Placeholder icons created successfully!"
echo "These are simple circular icons. For better icons, use a design tool."
echo ""
echo "Reload the extension in chrome://extensions/ to see the new icons."
