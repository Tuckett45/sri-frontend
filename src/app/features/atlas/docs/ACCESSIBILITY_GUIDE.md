# ATLAS Accessibility Guide

## Overview

This guide documents the accessibility features implemented across ATLAS components to ensure WCAG 2.1 AA compliance. All ATLAS components follow these accessibility standards to provide an inclusive experience for all users.

## Table of Contents

1. [ARIA Labels and Roles](#aria-labels-and-roles)
2. [Keyboard Navigation](#keyboard-navigation)
3. [Screen Reader Support](#screen-reader-support)
4. [Color Contrast](#color-contrast)
5. [Focus Indicators](#focus-indicators)
6. [Testing Accessibility](#testing-accessibility)

## ARIA Labels and Roles

### Semantic HTML

All ATLAS components use semantic HTML elements with appropriate ARIA roles:

```html
<!-- Main content area -->
<div role="main" aria-labelledby="page-title">
  <h1 id="page-title">Page Title</h1>
</div>

<!-- Navigation -->
<nav aria-label="Main navigation">
  <!-- navigation items -->
</nav>

<!-- Search/Filter region -->
<div role="search" aria-label="Filter deployments">
  <!-- filter controls -->
</div>
```

### Tables

Tables include proper ARIA attributes for accessibility:

```html
<table 
  role="table" 
  [attr.aria-label]="'Deployments table with ' + totalCount + ' total deployments'"
  [attr.aria-busy]="loading">
  <thead>
    <tr role="row">
      <th role="columnheader" scope="col" [attr.aria-sort]="sortDirection">
        Column Name
      </th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" [attr.aria-label]="rowDescription">
      <td role="cell">Cell content</td>
    </tr>
  </tbody>
</table>
```

### Forms

Form fields include proper labels and ARIA attributes:

```html
<div class="atlas-form-field">
  <label for="field-id">Field Label</label>
  <input 
    id="field-id"
    type="text"
    [attr.aria-invalid]="hasError"
    [attr.aria-describedby]="hasError ? 'field-error' : 'field-hint'"
    aria-required="true">
  <span id="field-hint" class="atlas-form-hint">Helpful hint text</span>
  <span id="field-error" class="atlas-form-error" role="alert">
    Error message
  </span>
</div>
```

### Loading States

Loading indicators include proper ARIA attributes:

```html
<div 
  role="status" 
  aria-live="polite"
  aria-label="Loading deployments">
  <p-progressSpinner aria-label="Loading indicator"></p-progressSpinner>
  <p aria-hidden="true">Loading...</p>
</div>
```

### Error States

Error messages use role="alert" for immediate announcement:

```html
<div role="alert" aria-live="assertive" class="error-container">
  <p-message severity="error" [text]="errorMessage"></p-message>
</div>
```

## Keyboard Navigation

### Focus Management

All interactive elements are keyboard accessible:

- **Tab**: Move forward through focusable elements
- **Shift+Tab**: Move backward through focusable elements
- **Enter**: Activate buttons and links
- **Space**: Activate buttons and checkboxes
- **Escape**: Close modals and dropdowns
- **Arrow Keys**: Navigate within lists and menus

### Skip Links

Skip links allow keyboard users to bypass repetitive navigation:

```html
<a href="#main-content" class="atlas-skip-link">Skip to main content</a>
<a href="#deployment-table" class="atlas-skip-link">Skip to deployments table</a>
```

### Focus Trap

Modals and dialogs trap focus within their boundaries:

```typescript
import { AtlasFocusDirective } from '../directives/atlas-focus.directive';

// In component
<div 
  atlasFocus 
  [atlasFocusTrapEnabled]="true"
  [atlasFocusOnInit]="true"
  role="dialog">
  <!-- modal content -->
</div>
```

### Table Row Navigation

Table rows are keyboard navigable:

```html
<tr 
  tabindex="0"
  (keydown.enter)="onRowClick(item)"
  (keydown.space)="onRowClick(item); $event.preventDefault()"
  [attr.aria-label]="rowDescription">
  <!-- row content -->
</tr>
```

## Screen Reader Support

### Live Regions

The `AtlasAccessibilityService` provides screen reader announcements:

```typescript
import { AtlasAccessibilityService } from '../utils/accessibility.service';

constructor(private a11y: AtlasAccessibilityService) {}

// Announce success
this.a11y.announce('Deployment created successfully', 'polite');

// Announce error (assertive for immediate attention)
this.a11y.announce('Error loading deployments', 'assertive');
```

### Descriptive Labels

All interactive elements have descriptive labels:

```typescript
// In component
getRowAriaLabel(deployment: DeploymentDto): string {
  return `Deployment: ${deployment.title}, ` +
         `State: ${this.formatStateLabel(deployment.currentState)}, ` +
         `Type: ${this.formatTypeLabel(deployment.type)}`;
}
```

### Status Indicators

Status badges include screen reader text:

```html
<p-tag 
  [value]="statusLabel" 
  [severity]="severity"
  [attr.aria-label]="'Status: ' + statusLabel">
</p-tag>
```

### Hidden Decorative Content

Decorative icons are hidden from screen readers:

```html
<i class="pi pi-inbox" aria-hidden="true"></i>
```

## Color Contrast

### WCAG 2.1 AA Compliance

All text and interactive elements meet WCAG 2.1 AA contrast ratios:

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+ or 14pt+ bold): Minimum 3:1 contrast ratio
- **Interactive elements**: Minimum 3:1 contrast ratio with adjacent colors

### Color Palette

ATLAS uses accessible color combinations:

```scss
// Primary colors (4.5:1 contrast on white)
$atlas-primary: #0d47a1;
$atlas-primary-light: #5472d3;
$atlas-primary-dark: #002171;

// Status colors (4.5:1 contrast on white)
$atlas-success: #2e7d32;
$atlas-warning: #f57c00;
$atlas-error: #c62828;
$atlas-info: #0277bd;

// Text colors
$atlas-text-primary: #212121; // 16:1 contrast on white
$atlas-text-secondary: #666666; // 5.7:1 contrast on white
```

### High Contrast Mode

ATLAS supports high contrast mode:

```scss
@media (prefers-contrast: high) {
  *:focus,
  *:focus-visible {
    outline-width: 3px;
    outline-offset: 3px;
  }
}
```

### Color Independence

Information is never conveyed by color alone:

```html
<!-- Bad: Color only -->
<span class="red-text">Error</span>

<!-- Good: Color + icon + text -->
<span class="error-text">
  <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
  Error
</span>
```

## Focus Indicators

### Visible Focus

All focusable elements have visible focus indicators:

```scss
// Default focus indicator
*:focus,
*:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

// Enhanced focus for interactive elements
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #1976d2;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.2);
}
```

### Focus Styles

Focus indicators are:
- **Visible**: Minimum 2px outline
- **High contrast**: 3:1 contrast ratio with background
- **Consistent**: Same style across all components
- **Not removed**: Never use `outline: none` without replacement

### Skip Link Focus

Skip links become visible on focus:

```scss
.atlas-skip-link {
  position: absolute;
  top: -40px;
  
  &:focus {
    top: 0;
    outline: 3px solid #ffd740;
    outline-offset: 2px;
  }
}
```

## Testing Accessibility

### Automated Testing

Use automated tools to catch common issues:

```bash
# Install axe-core for automated testing
npm install --save-dev @axe-core/playwright

# Run accessibility tests
npm run test:a11y
```

### Manual Testing

#### Keyboard Navigation Test

1. Use only keyboard (no mouse)
2. Tab through all interactive elements
3. Verify focus indicators are visible
4. Activate elements with Enter/Space
5. Navigate modals and dropdowns with arrow keys

#### Screen Reader Test

Test with popular screen readers:
- **NVDA** (Windows, free)
- **JAWS** (Windows, commercial)
- **VoiceOver** (macOS/iOS, built-in)
- **TalkBack** (Android, built-in)

#### Color Contrast Test

Use browser extensions:
- **axe DevTools** (Chrome/Firefox)
- **WAVE** (Chrome/Firefox)
- **Lighthouse** (Chrome DevTools)

### Accessibility Checklist

- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] All buttons have descriptive text or aria-label
- [ ] Tables have proper headers and scope
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Focus indicators are visible
- [ ] Keyboard navigation works
- [ ] Screen reader announces content correctly
- [ ] Error messages are announced
- [ ] Loading states are announced
- [ ] Modals trap focus
- [ ] Skip links are present

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM WCAG 2 Checklist](https://webaim.org/standards/wcag/checklist)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Screen Readers
- [NVDA Download](https://www.nvaccess.org/download/)
- [VoiceOver Guide](https://www.apple.com/accessibility/voiceover/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)

### Angular Accessibility
- [Angular Accessibility Guide](https://angular.io/guide/accessibility)
- [Angular CDK A11y](https://material.angular.io/cdk/a11y/overview)

## Support

For accessibility questions or issues, contact the ATLAS development team or file an issue in the project repository.
