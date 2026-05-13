# PWA Icons

This directory contains Progressive Web App (PWA) icons for the Field Resource Management application.

## Required Icons

The following icon sizes are required for optimal PWA support across all devices:

- `icon-72x72.png` - Small devices
- `icon-96x96.png` - Small devices
- `icon-128x128.png` - Medium devices
- `icon-144x144.png` - Medium devices
- `icon-152x152.png` - iOS devices
- `icon-192x192.png` - Standard Android
- `icon-384x384.png` - Large devices
- `icon-512x512.png` - Splash screens

## Icon Design Guidelines

### Colors
- Primary: #1E5A8E (ATLAS Blue)
- Background: #FFFFFF (White)
- Accent: #00A8E8 (Bright Blue)

### Design Elements
- Use the ATLAS logo or FRM branding
- Ensure icons are clear and recognizable at small sizes
- Use high contrast for visibility
- Include padding for "maskable" icons (safe zone)

### Maskable Icons
All icons should support the "maskable" purpose, which means:
- Keep important content within the safe zone (80% of canvas)
- Use full bleed background color
- Avoid text near edges

## Generating Icons

You can generate all required icon sizes from a single source image using tools like:

1. **PWA Asset Generator**
   ```bash
   npx pwa-asset-generator source-icon.png src/assets/icons --icon-only
   ```

2. **Online Tools**
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/

3. **Manual Creation**
   - Use design tools (Figma, Photoshop, GIMP)
   - Export at each required size
   - Optimize with tools like ImageOptim or TinyPNG

## Current Status

⚠️ **Action Required**: Replace placeholder icons with actual ATLAS/FRM branded icons.

The current icons are placeholders. To complete PWA setup:
1. Design or obtain proper FRM/ATLAS icons
2. Generate all required sizes
3. Replace files in this directory
4. Test on multiple devices

## Testing Icons

After adding icons, test on:
- Android Chrome (Add to Home Screen)
- iOS Safari (Add to Home Screen)
- Desktop Chrome (Install App)
- Desktop Edge (Install App)

Verify:
- Icons display correctly
- No distortion or cropping
- Proper contrast and visibility
- Splash screen appearance (Android)
