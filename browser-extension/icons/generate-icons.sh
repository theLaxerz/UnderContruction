#!/bin/bash
# Generate PNG icons from SVG for the browser extension

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed."
    echo "Install with: sudo apt install imagemagick (Ubuntu/Debian)"
    echo "            : brew install imagemagick (macOS)"
    exit 1
fi

# Navigate to icons directory
cd "$(dirname "$0")"

# Generate icons at different sizes
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 32x32 icon32.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png

echo "Icons generated successfully!"
ls -la *.png
