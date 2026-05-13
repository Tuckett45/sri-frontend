# Field Resource Management - Styling Guide

## Overview
This guide establishes consistent styling patterns across all FRM components to ensure a cohesive user experience.

## Design System Files

### Core Files
- `styles/_frm-variables.scss` - Design tokens (colors, spacing, typography)
- `styles/_frm-mixins.scss` - Reusable SCSS mixins

### Usage in Components
```scss
@import '../../styles/frm-variables';
@import '../../styles/frm-mixins';

.my-component {
  @include frm-card;
  padding: $frm-spacing-md;
}
```

## Color Palette

### Primary Colors
- **Primary**: `$frm-primary` (#1976d2) - Main brand color
- **Accent**: `$frm-accent` (#ff9800) - Highlight color

### Status Colors
- **Success**: `$frm-success` (#4caf50) - Completed, Active, Available
- **Warning**: `$frm-warning` (#ff9800) - Pending, In Progress
- **Error**: `$frm-error` (#f44336) - Failed, Unavailable, Error
- **Info**: `$frm-info` (#2196f3) - Scheduled, Information

### Usage
```scss
.status-badge {
  @include frm-status-badge;
}
```

## Typography

### Font Sizes
- **Extra Small**: `$frm-font-size-xs` (11px) - Labels, badges
- **Small**: `$frm-font-size-sm` (12px) - Secondary text
- **Base**: `$frm-font-size-base` (14px) - Body text
- **Medium**: `$frm-font-size-md` (16px) - Subheadings
- **Large**: `$frm-font-size-lg` (18px) - Headings
- **Extra Large**: `$frm-font-size-xl` (20px) - Page titles

### Font Weights
- **Regular**: `$frm-font-weight-regular` (400) - Body text
- **Medium**: `$frm-font-weight-medium` (500) - Emphasis
- **Semibold**: `$frm-font-weight-semibold` (600) - Subheadings
- **Bold**: `$frm-font-weight-bold` (700) - Headings

## Spacing System

Use consistent spacing values:
- **XS**: `$frm-spacing-xs` (4px)
- **SM**: `$frm-spacing-sm` (8px)
- **MD**: `$frm-spacing-md` (16px) - Default
- **LG**: `$frm-spacing-lg` (24px)
- **XL**: `$frm-spacing-xl` (32px)
- **XXL**: `$frm-spacing-xxl` (48px)

## Component Patterns

### 1. List Views (Technicians, Crews, Jobs)

#### Structure
```html
<div class="frm-list-container">
  <div class="frm-list-header">
    <h2>Title</h2>
    <div class="frm-list-actions">
      <button mat-raised-button color="primary">
        <mat-icon>add</mat-icon>
        Add New
      </button>
    </div>
  </div>

  <div class="frm-list-filters">
    <!-- Filter controls -->
  </div>

  <div class="frm-list-content">
    <table mat-table>
      <!-- Table content -->
    </table>
  </div>
</div>
```

#### Styling
```scss
.frm-list-container {
  @include frm-card;
  
  .frm-list-header {
    @include frm-card-header;
  }

  .frm-list-filters {
    display: flex;
    gap: $frm-spacing-md;
    margin-bottom: $frm-spacing-md;
    flex-wrap: wrap;
  }

  .frm-list-content {
    table {
      @include frm-table;
    }
  }
}
```

### 2. Detail Views

#### Structure
```html
<div class="frm-detail-container">
  <div class="frm-detail-header">
    <button mat-icon-button (click)="goBack()">
      <mat-icon>arrow_back</mat-icon>
    </button>
    <h2>{{ title }}</h2>
    <div class="frm-detail-actions">
      <!-- Action buttons -->
    </div>
  </div>

  <div class="frm-detail-content">
    <div class="frm-detail-section">
      <h3>Section Title</h3>
      <!-- Section content -->
    </div>
  </div>
</div>
```

#### Styling
```scss
.frm-detail-container {
  @include frm-card;

  .frm-detail-header {
    @include frm-flex-between;
    padding-bottom: $frm-spacing-md;
    margin-bottom: $frm-spacing-md;
    border-bottom: $frm-border-width solid $frm-border-light;

    h2 {
      margin: 0;
      font-size: $frm-font-size-xl;
      font-weight: $frm-font-weight-medium;
    }
  }

  .frm-detail-section {
    margin-bottom: $frm-spacing-lg;

    h3 {
      font-size: $frm-font-size-md;
      font-weight: $frm-font-weight-medium;
      margin-bottom: $frm-spacing-md;
      color: $frm-text-secondary;
    }
  }
}
```

### 3. Forms

#### Structure
```html
<form [formGroup]="form" class="frm-form">
  <div class="frm-form-section">
    <h3>Section Title</h3>
    
    <div class="frm-form-row">
      <mat-form-field class="frm-form-field">
        <mat-label>Field Label</mat-label>
        <input matInput formControlName="fieldName">
        <mat-error *ngIf="form.get('fieldName')?.hasError('required')">
          This field is required
        </mat-error>
      </mat-form-field>
    </div>
  </div>

  <div class="frm-form-actions">
    <button mat-button type="button" (click)="cancel()">Cancel</button>
    <button mat-raised-button color="primary" type="submit">Save</button>
  </div>
</form>
```

#### Styling
```scss
.frm-form {
  .frm-form-section {
    margin-bottom: $frm-spacing-xl;

    h3 {
      font-size: $frm-font-size-md;
      font-weight: $frm-font-weight-medium;
      margin-bottom: $frm-spacing-md;
      color: $frm-text-secondary;
    }
  }

  .frm-form-row {
    display: flex;
    gap: $frm-spacing-md;
    margin-bottom: $frm-spacing-md;

    .frm-form-field {
      flex: 1;
    }
  }

  .frm-form-actions {
    @include frm-flex-between;
    padding-top: $frm-spacing-lg;
    border-top: $frm-border-width solid $frm-border-light;
    gap: $frm-spacing-sm;
  }
}
```

### 4. Status Badges

```html
<span class="frm-status-badge status-active">Active</span>
<span class="frm-status-badge status-pending">Pending</span>
<span class="frm-status-badge status-completed">Completed</span>
```

```scss
.frm-status-badge {
  @include frm-status-badge;
}
```

### 5. Action Buttons

```html
<!-- Primary Action -->
<button mat-raised-button color="primary">
  <mat-icon>add</mat-icon>
  Add New
</button>

<!-- Secondary Action -->
<button mat-stroked-button>
  <mat-icon>edit</mat-icon>
  Edit
</button>

<!-- Icon Button -->
<button mat-icon-button>
  <mat-icon>more_vert</mat-icon>
</button>
```

### 6. Data Tables

```scss
.frm-table-container {
  @include frm-card;
  overflow-x: auto;

  table {
    @include frm-table;
  }

  .mat-column-actions {
    width: 120px;
    text-align: right;
  }
}
```

### 7. Filter Panels

```html
<div class="frm-filter-panel">
  <div class="frm-filter-header">
    <h3>Filters</h3>
    <button mat-button (click)="clearFilters()">Clear All</button>
  </div>
  
  <div class="frm-filter-content">
    <!-- Filter controls -->
  </div>
</div>
```

```scss
.frm-filter-panel {
  @include frm-card;
  margin-bottom: $frm-spacing-md;

  .frm-filter-header {
    @include frm-flex-between;
    margin-bottom: $frm-spacing-md;

    h3 {
      margin: 0;
      font-size: $frm-font-size-md;
      font-weight: $frm-font-weight-medium;
    }
  }

  .frm-filter-content {
    display: flex;
    gap: $frm-spacing-md;
    flex-wrap: wrap;

    .mat-form-field {
      min-width: 200px;
    }
  }
}
```

## Responsive Design

### Breakpoints
- **XS**: 0-599px (Mobile)
- **SM**: 600-959px (Tablet)
- **MD**: 960-1279px (Small Desktop)
- **LG**: 1280-1919px (Desktop)
- **XL**: 1920px+ (Large Desktop)

### Usage
```scss
.my-component {
  // Mobile first
  padding: $frm-spacing-sm;

  @include frm-responsive(md) {
    padding: $frm-spacing-md;
  }

  @include frm-responsive(lg) {
    padding: $frm-spacing-lg;
  }
}
```

## Accessibility

### Focus States
Always include visible focus indicators:
```scss
button, a, input {
  @include frm-focus-visible;
}
```

### Color Contrast
- Ensure text meets WCAG AA standards (4.5:1 for normal text)
- Use `$frm-text-primary` for main content
- Use `$frm-text-secondary` for supporting content

### Screen Reader Support
```html
<button aria-label="Delete item">
  <mat-icon>delete</mat-icon>
</button>
```

## Animation Guidelines

### Transitions
- Use `$frm-transition-fast` (150ms) for hover states
- Use `$frm-transition-base` (250ms) for most transitions
- Use `$frm-transition-slow` (350ms) for complex animations

### Reduced Motion
```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Component-Specific Guidelines

### Technicians List
- Use avatar images (40x40px) in list view
- Show status badge (Available/Unavailable/On Job)
- Display skills as chips
- Include quick actions (View, Edit, Assign)

### Crews List
- Show crew size and lead technician
- Display current job assignment
- Use location icon for current location
- Include status indicator

### Jobs List
- Show priority indicator (High/Medium/Low)
- Display job type icon
- Include progress indicator for in-progress jobs
- Show assigned technician/crew

### Scheduling Calendar
- Use color coding for job types
- Show time slots clearly
- Include drag-and-drop visual feedback
- Display conflicts prominently

### Map View
- Use consistent marker colors
- Include clustering for multiple markers
- Show info windows on marker click
- Include legend for marker types

### Reports
- Use charts from Chart.js with consistent colors
- Include export buttons (CSV, PDF)
- Show date range selector
- Include print-friendly styles

## Best Practices

1. **Always import design system files**
   ```scss
   @import '../../styles/frm-variables';
   @import '../../styles/frm-mixins';
   ```

2. **Use mixins for common patterns**
   - Cards: `@include frm-card`
   - Tables: `@include frm-table`
   - Buttons: `@include frm-button-primary`

3. **Follow spacing system**
   - Use predefined spacing variables
   - Maintain consistent gaps and padding

4. **Maintain accessibility**
   - Include ARIA labels
   - Ensure keyboard navigation
   - Test with screen readers

5. **Test responsiveness**
   - Test on mobile, tablet, and desktop
   - Use responsive mixins
   - Ensure touch targets are 44x44px minimum

6. **Performance**
   - Minimize CSS specificity
   - Avoid deep nesting (max 3 levels)
   - Use CSS Grid/Flexbox for layouts

## Migration Checklist

For each component:
- [ ] Import design system files
- [ ] Replace hardcoded colors with variables
- [ ] Apply consistent spacing
- [ ] Use standard mixins for common patterns
- [ ] Ensure responsive design
- [ ] Test accessibility
- [ ] Verify cross-browser compatibility
