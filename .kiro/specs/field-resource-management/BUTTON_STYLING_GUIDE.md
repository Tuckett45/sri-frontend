# Button Styling Guide - Field Resource Management

## Overview
This guide documents the consistent button styling patterns used throughout the FRM module.

## Color Scheme

### Primary (Blue)
- Color: `#144f80`
- Hover: `#0e3453`
- Usage: Main actions, primary CTAs

### Accent (Orange)
- Color: `#e18a25`
- Hover: `#b86404`
- Usage: Secondary actions, warnings, special emphasis

### Warn (Red)
- Color: `#f44336`
- Hover: `#d32f2f`
- Usage: Destructive actions, delete operations

## Button Types

### 1. Raised Buttons (Filled)
Primary actions with solid background color.

```html
<!-- Primary (Dark Blue) -->
<button mat-raised-button color="primary">
  <mat-icon>add</mat-icon>
  Create New
</button>

<!-- Accent (Orange) -->
<button mat-raised-button color="accent">
  <mat-icon>warning</mat-icon>
  Important Action
</button>

<!-- Warn (Red) -->
<button mat-raised-button color="warn">
  <mat-icon>delete</mat-icon>
  Delete
</button>
```

### 2. Stroked Buttons (Outlined)
Secondary actions with border and transparent background.

```html
<!-- Primary Outlined (Dark Blue Border, White Center) -->
<button mat-stroked-button>
  <mat-icon>filter_list</mat-icon>
  Filter
</button>

<!-- Accent Outlined (Orange Border, White Center) -->
<button mat-stroked-button color="accent">
  <mat-icon>export</mat-icon>
  Export
</button>
```

### 3. Text Buttons (Flat)
Tertiary actions with no background or border.

```html
<!-- Primary Text (Dark Blue) -->
<button mat-button color="primary">
  View All
  <mat-icon>arrow_forward</mat-icon>
</button>

<!-- Accent Text (Orange) -->
<button mat-button color="accent">
  Learn More
</button>
```

## Usage Guidelines

### When to Use Each Type

1. **Raised Buttons (Primary)**
   - Main call-to-action on a page
   - Form submit buttons
   - Creating new resources
   - Starting important workflows

2. **Raised Buttons (Accent)**
   - Secondary important actions
   - Status changes that need emphasis
   - Export/download actions
   - Special operations

3. **Raised Buttons (Warn)**
   - Delete operations
   - Destructive actions
   - Actions that cannot be undone

4. **Stroked Buttons**
   - Filter toggles
   - Secondary actions
   - Cancel operations
   - Alternative options

5. **Text Buttons**
   - Navigation links
   - "View more" actions
   - Dialog cancel buttons
   - Low-emphasis actions

## Implementation

### Component-Level Styling
For consistent styling across all buttons in a component, use the global button styling pattern:

```scss
::ng-deep .your-component {
  .mat-raised-button.mat-primary {
    background-color: #144f80 !important;
    color: #ffffff !important;
    border-radius: 5px;
    padding: 10px 20px;
    transition: all 0.2s ease;
    
    &:hover:not([disabled]) {
      background-color: #0e3453 !important;
      transform: scale(1.05);
    }
  }
  
  .mat-raised-button.mat-accent {
    background-color: #e18a25 !important;
    color: #ffffff !important;
    border-radius: 5px;
    padding: 10px 20px;
    transition: all 0.2s ease;
    
    &:hover:not([disabled]) {
      background-color: #b86404 !important;
      transform: scale(1.05);
    }
  }
  
  .mat-stroked-button {
    border: 2px solid #144f80 !important;
    color: #144f80 !important;
    background-color: #ffffff !important;
    border-radius: 5px;
    padding: 10px 20px;
    transition: all 0.2s ease;
    
    &:hover:not([disabled]) {
      background-color: rgba(20, 79, 128, 0.04) !important;
      transform: scale(1.05);
    }
  }
}
```

## Examples from Home Dashboard

### Quick Actions Panel
```html
<button mat-raised-button color="primary" (click)="createNewJob()">
  <mat-icon>add</mat-icon>
  Create New Job
</button>

<button mat-raised-button color="primary" (click)="navigateToJobs()">
  <mat-icon>work</mat-icon>
  View All Jobs
</button>
```

### Recent Jobs Header
```html
<button mat-button color="primary" (click)="navigateToJobs()">
  View All
  <mat-icon>arrow_forward</mat-icon>
</button>
```

### Filter Panel
```html
<button mat-stroked-button (click)="clearFilters()">
  <mat-icon>clear</mat-icon>
  Clear Filters
</button>
```

## Accessibility

- Always include descriptive text or `aria-label`
- Ensure sufficient color contrast (all colors meet WCAG AA standards)
- Use icons to supplement text, not replace it
- Maintain consistent button sizes for touch targets (minimum 44x44px)

## Notes

- The Material theme uses indigo for primary, but we override it to `#144f80` (blue)
- The Material theme uses pink for accent, but we override it to `#e18a25` (orange)
- Always test button styling in both light and dark themes if applicable
- Hover states provide visual feedback with slightly darker shades and scale transform
- Use `!important` to ensure styles override Material's default theme colors
