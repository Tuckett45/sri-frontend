# ATLAS Logo Setup Instructions

## Quick Start

You have provided two ATLAS logo variants. Please save them to this directory with the following names:

### 1. Light Background Logo
- **File name**: `atlas-logo-light.png`
- **Source**: The logo with blue text and gray orbital ring (light background version)
- **Location**: Save to `src/assets/images/atlas/atlas-logo-light.png`

### 2. Dark Background Logo
- **File name**: `atlas-logo-dark.png`
- **Source**: The logo with white text and light gray orbital ring (dark background version)
- **Location**: Save to `src/assets/images/atlas/atlas-logo-dark.png`

## File Naming Convention

```
src/assets/images/atlas/
├── atlas-logo-light.png    ← Blue logo for light backgrounds
├── atlas-logo-dark.png     ← White logo for dark backgrounds
├── README.md               ← Usage documentation
└── SETUP.md               ← This file
```

## After Placing the Files

1. Verify the files are in the correct location
2. Check file sizes (should be optimized for web, ideally < 100KB each)
3. Test in the application by using the `AtlasLogoComponent`
4. Verify both light and dark variants display correctly

## Next Steps

Once the logo files are in place:

1. Create the `AtlasLogoComponent` (see design.md for implementation)
2. Add the component to the ATLAS feature module
3. Use the component in:
   - Main navigation/toolbar
   - ATLAS feature pages
   - Login/authentication pages (if applicable)
   - Documentation and help pages

## Verification

Run this command to verify the files are in place:

```bash
# Windows PowerShell
Test-Path "src\assets\images\atlas\atlas-logo-light.png"
Test-Path "src\assets\images\atlas\atlas-logo-dark.png"

# Should return: True for both
```

## Image Optimization (Optional)

For better performance, consider:

1. **PNG Optimization**: Use tools like TinyPNG or ImageOptim
2. **SVG Conversion**: If you have vector source files, SVG is preferred for scalability
3. **WebP Format**: Create WebP versions for modern browsers

Example optimized structure:
```
src/assets/images/atlas/
├── atlas-logo-light.png
├── atlas-logo-light.webp
├── atlas-logo-light.svg
├── atlas-logo-dark.png
├── atlas-logo-dark.webp
└── atlas-logo-dark.svg
```

## Troubleshooting

### Logo not displaying
- Check file path is correct
- Verify file names match exactly (case-sensitive)
- Check angular.json includes assets directory
- Clear browser cache

### Logo appears blurry
- Ensure image resolution is at least 2x the display size (for retina displays)
- Recommended minimum width: 600px
- Consider using SVG format for perfect scaling

### Wrong logo variant showing
- Check theme detection logic in `AtlasLogoComponent`
- Verify CSS classes are applied correctly
- Test with both light and dark system preferences

## Support

For questions about logo usage or branding guidelines, refer to:
- `README.md` in this directory
- Design document: `.kiro/specs/atlas-integration/design.md`
- Requirements document: `.kiro/specs/atlas-integration/requirements.md`
