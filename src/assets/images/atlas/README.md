# ATLAS Logos

This directory contains the official ATLAS (Advanced Technology Logistics and Automation System) brand assets.

## Available Logos

### 1. atlas-logo-light.png
- **Usage**: Light backgrounds, default theme
- **Colors**: Blue text (#1E5A8E) with gray orbital ring
- **Background**: Light/white backgrounds
- **Best for**: Main application header, light-themed pages, documentation

### 2. atlas-logo-dark.png
- **Usage**: Dark backgrounds, dark theme
- **Colors**: White text with light gray orbital ring
- **Background**: Dark/black backgrounds
- **Best for**: Dark mode, presentations, marketing materials

## Brand Guidelines

### Logo Specifications
- **Full Name**: ATLAS - Advanced Technology Logistics and Automation System
- **Primary Color**: Blue (#1E5A8E)
- **Secondary Color**: Gray (#8B9DAF)
- **Typography**: Bold sans-serif for "ATLAS", regular for tagline

### Usage Rules

1. **Minimum Size**: 
   - Digital: 150px width minimum
   - Print: 1.5 inches width minimum

2. **Clear Space**: 
   - Maintain clear space equal to the height of the "A" in ATLAS on all sides

3. **Backgrounds**:
   - Light logo: Use on backgrounds lighter than 50% gray
   - Dark logo: Use on backgrounds darker than 50% gray

4. **Don'ts**:
   - Don't stretch or distort the logo
   - Don't change the colors
   - Don't separate the text from the orbital ring
   - Don't add effects (shadows, gradients, etc.)

## Implementation in Angular

### Using in Components

```typescript
// In your component template
<img src="assets/images/atlas/atlas-logo-light.png" 
     alt="ATLAS - Advanced Technology Logistics and Automation System"
     class="atlas-logo">

// For dark mode support
<img [src]="isDarkMode ? 'assets/images/atlas/atlas-logo-dark.png' : 'assets/images/atlas/atlas-logo-light.png'"
     alt="ATLAS - Advanced Technology Logistics and Automation System"
     class="atlas-logo">
```

### CSS Styling

```css
.atlas-logo {
  height: 48px;
  width: auto;
  object-fit: contain;
}

.atlas-logo-small {
  height: 32px;
  width: auto;
}

.atlas-logo-large {
  height: 64px;
  width: auto;
}
```

### Angular Material Toolbar

```html
<mat-toolbar color="primary">
  <img src="assets/images/atlas/atlas-logo-dark.png" 
       alt="ATLAS" 
       class="atlas-logo">
  <span class="spacer"></span>
  <!-- Other toolbar content -->
</mat-toolbar>
```

## File Naming Convention

- `atlas-logo-light.png` - For light backgrounds
- `atlas-logo-dark.png` - For dark backgrounds
- `atlas-icon.png` - Icon-only version (if needed)
- `atlas-logo-light.svg` - Vector version for light backgrounds (if available)
- `atlas-logo-dark.svg` - Vector version for dark backgrounds (if available)

## Notes

- Place the provided logo images in this directory
- Ensure images are optimized for web (compressed but high quality)
- Consider creating SVG versions for better scalability
- Update angular.json if logos need to be included in build assets
