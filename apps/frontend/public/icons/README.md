# PWA Icons

This directory should contain PWA icons in various sizes.

## Required Icon Sizes

The following icon sizes are needed for the PWA manifest:

- icon-16x16.png
- icon-32x32.png
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-180x180.png (Apple Touch Icon)
- icon-192x192.png (Android Chrome)
- icon-384x384.png
- icon-512x512.png (Android Chrome)

## How to Generate Icons

### Option 1: Use an Online Tool
1. Go to https://realfavicongenerator.net/
2. Upload your logo/icon (512x512px recommended)
3. Download the generated package
4. Copy all icons to this directory

### Option 2: Use Command Line (ImageMagick)
```bash
# Install ImageMagick first
# From a 512x512 source image:
convert logo-512.png -resize 16x16 icon-16x16.png
convert logo-512.png -resize 32x32 icon-32x32.png
convert logo-512.png -resize 72x72 icon-72x72.png
convert logo-512.png -resize 96x96 icon-96x96.png
convert logo-512.png -resize 128x128 icon-128x128.png
convert logo-512.png -resize 144x144 icon-144x144.png
convert logo-512.png -resize 152x152 icon-152x152.png
convert logo-512.png -resize 180x180 icon-180x180.png
convert logo-512.png -resize 192x192 icon-192x192.png
convert logo-512.png -resize 384x384 icon-384x384.png
convert logo-512.png -resize 512x512 icon-512x512.png
```

### Option 3: Use PWA Asset Generator
```bash
npm install -g pwa-asset-generator
pwa-asset-generator logo.png ./public/icons
```

## Design Guidelines

- Use a simple, recognizable design
- Ensure good contrast against both light and dark backgrounds
- Consider using a maskable icon design (safe zone in center)
- Test on multiple devices and platforms
- Icons should be square (1:1 aspect ratio)

## Current Status

⚠️ **Icons not yet generated**  
Please generate and add icons before deploying to production.
