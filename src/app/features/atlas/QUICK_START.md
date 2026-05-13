# ATLAS Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Import the Module

```typescript
// your-feature.module.ts
import { AtlasSharedModule } from '../atlas/atlas-shared.module';

@NgModule({
  imports: [AtlasSharedModule]
})
export class YourFeatureModule { }
```

### Step 2: Use the Logo

```html
<!-- your-component.html -->
<app-atlas-logo size="medium" theme="auto"></app-atlas-logo>
```

### Step 3: Apply Styles

```html
<div class="atlas-card">
  <div class="atlas-card-header">
    <h3 class="atlas-card-title">My Title</h3>
  </div>
  <div class="atlas-card-content">
    <p class="atlas-body-1">Content here</p>
  </div>
</div>
```

## 📦 Common Patterns

### Page Header

```html
<div class="atlas-page-header">
  <div class="atlas-page-header-content">
    <app-atlas-logo></app-atlas-logo>
    <h1 class="atlas-page-title">Page Title</h1>
  </div>
  <div class="atlas-page-actions">
    <button mat-raised-button class="atlas-button atlas-button-primary">
      Action
    </button>
  </div>
</div>
```

### Status Badge

```html
<span class="atlas-badge atlas-badge-success">Active</span>
<span class="atlas-badge atlas-badge-warning">Pending</span>
<span class="atlas-badge atlas-badge-error">Failed</span>
```

### Loading State

```html
<div class="atlas-loading">
  <mat-spinner diameter="40"></mat-spinner>
</div>
```

### Empty State

```html
<div class="atlas-empty-state">
  <mat-icon>inbox</mat-icon>
  <h3 class="atlas-empty-state-title">No items found</h3>
  <p class="atlas-empty-state-message">Get started by creating one</p>
  <button mat-raised-button class="atlas-button atlas-button-primary">
    Create Item
  </button>
</div>
```

## 🎨 Color Classes

```html
<p class="atlas-text-primary">Primary text</p>
<p class="atlas-text-success">Success text</p>
<p class="atlas-text-warning">Warning text</p>
<p class="atlas-text-error">Error text</p>
```

## 📐 Typography Classes

```html
<h1 class="atlas-h1">Heading 1</h1>
<h2 class="atlas-h2">Heading 2</h2>
<h3 class="atlas-h3">Heading 3</h3>
<p class="atlas-body-1">Body text</p>
<p class="atlas-caption">Caption text</p>
<span class="atlas-label">Label</span>
```

## 🔧 SCSS Variables

```scss
@import 'styles/atlas-variables';

.my-component {
  color: $atlas-primary;
  padding: $atlas-spacing-md;
  border-radius: $atlas-border-radius-md;
}
```

## 🎯 Logo Variants

```html
<!-- Small (32px) -->
<app-atlas-logo size="small"></app-atlas-logo>

<!-- Medium (48px) - default -->
<app-atlas-logo size="medium"></app-atlas-logo>

<!-- Large (64px) -->
<app-atlas-logo size="large"></app-atlas-logo>

<!-- Light theme -->
<app-atlas-logo theme="light"></app-atlas-logo>

<!-- Dark theme -->
<app-atlas-logo theme="dark"></app-atlas-logo>

<!-- Auto detect -->
<app-atlas-logo theme="auto"></app-atlas-logo>

<!-- No navigation -->
<app-atlas-logo [routerLink]="null"></app-atlas-logo>
```

## 📚 Full Documentation

- **Complete Guide**: `README.md` (in this directory)
- **Logo Guidelines**: `../../../assets/images/atlas/README.md`
- **Design Spec**: `../../../../.kiro/specs/atlas-integration/design.md`

## ⚡ Pro Tips

1. **Use auto theme** for logos to match system preferences
2. **Import AtlasSharedModule** once per feature module
3. **Use SCSS variables** for consistent styling
4. **Apply atlas-card** for consistent card layouts
5. **Use atlas-badge** for status indicators
6. **Follow atlas-page-header** pattern for page layouts

## 🐛 Troubleshooting

**Logo not showing?**
- Check that logo images are in `src/assets/images/atlas/`
- Verify filenames: `atlas-logo-light.png` and `atlas-logo-dark.png`

**Styles not applying?**
- Ensure `AtlasSharedModule` is imported
- Check that `src/styles.scss` imports ATLAS styles

**Module errors?**
- Make sure Angular Material is installed
- Verify all peer dependencies are met

## 🎓 Learn More

Run the example component to see everything in action:

```typescript
import { AtlasHeaderExampleComponent } from './features/atlas/components/atlas-header-example.component';

// Use in your template
<app-atlas-header-example></app-atlas-header-example>
```
