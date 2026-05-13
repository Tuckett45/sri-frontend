# Phase 4 Components

This directory contains UI components for workflow template switching functionality.

## Components

### TemplateSelectorComponent

**Purpose**: Allows users to browse, preview, and select workflow templates dynamically.

**Features**:
- Grid and list view modes
- Search functionality with debouncing
- Category filtering
- Template sorting (by name, rating, usage, date)
- Template comparison mode (up to 3 templates)
- Template preview
- Responsive design

**Usage**:
```typescript
<app-template-selector
  [workflowType]="'job'"
  [currentTemplateId]="selectedTemplateId"
  (templateSelected)="onTemplateSelected($event)"
  (templatePreview)="onTemplatePreview($event)"
></app-template-selector>
```

**Inputs**:
- `currentTemplateId?: string` - Currently selected template ID
- `workflowType: string` - Type of workflow to filter templates

**Outputs**:
- `templateSelected: EventEmitter<WorkflowTemplate>` - Emitted when a template is selected
- `templatePreview: EventEmitter<WorkflowTemplate>` - Emitted when preview is requested

**Requirements**: 10.1, 10.2, 10.3, 10.4, 10.5

---

### TemplateMetadataComponent

**Purpose**: Displays comprehensive template metadata including name, description, author, version, usage count, ratings, and category organization.

**Features**:
- Star rating display
- Usage count formatting (K, M abbreviations)
- Category badges with color coding
- Template status badges (New, Popular, Top Rated, Public)
- Compact mode for list views
- Date formatting
- Customization indicator
- Additional metadata (tags, industry, complexity)

**Usage**:
```typescript
<app-template-metadata
  [template]="template"
  [compact]="false"
  [showFullDescription]="false"
></app-template-metadata>
```

**Inputs**:
- `template: WorkflowTemplate` - Template to display (required)
- `compact: boolean` - Enable compact display mode (default: false)
- `showFullDescription: boolean` - Show full description without truncation (default: false)

**Requirements**: 10.2

---

## State Management

Both components integrate with NgRx store for state management:

**Selectors Used**:
- `selectFilteredTemplates` - Get filtered templates based on current filters
- `selectTemplateCategories` - Get available template categories
- `selectTemplatesLoading` - Get loading state
- `selectTemplatesError` - Get error state

**Actions Dispatched**:
- `loadTemplates` - Load templates from backend
- `loadTemplateCategories` - Load template categories
- `selectTemplate` - Select a template
- `setSearchQuery` - Update search query
- `setFilters` - Update filters
- `clearFilters` - Clear all filters
- `compareTemplates` - Compare selected templates

---

## Styling

Both components use SCSS with:
- Responsive design (mobile, tablet, desktop)
- Accessibility features (ARIA labels, keyboard navigation)
- Smooth transitions and hover effects
- Color-coded badges and indicators
- Grid and flexbox layouts

---

## Testing

Each component has comprehensive unit tests covering:
- Component initialization
- User interactions
- State management integration
- Filtering and sorting logic
- Comparison mode functionality
- Display formatting
- Edge cases

Run tests:
```bash
ng test --include='**/phase4/components/**/*.spec.ts'
```

---

## Integration

To use Phase 4 components in your module:

```typescript
import { Phase4Module } from './features/admin-dashboard/phase4/phase4.module';

@NgModule({
  imports: [
    Phase4Module
  ]
})
export class YourModule { }
```

---

## Requirements Traceability

| Requirement | Component | Feature |
|-------------|-----------|---------|
| 10.1 | TemplateSelectorComponent | Display available templates |
| 10.2 | TemplateMetadataComponent | Show template metadata |
| 10.3 | TemplateSelectorComponent | Search templates |
| 10.4 | TemplateSelectorComponent | Filter by category |
| 10.5 | TemplateSelectorComponent | Preview templates |
| 10.6 | TemplateSelectorComponent | Select templates |

---

## Future Enhancements

- Template preview modal with step details
- Template comparison side-by-side view
- Template rating and review system
- Template favorites/bookmarks
- Template usage analytics
- Template version history viewer
