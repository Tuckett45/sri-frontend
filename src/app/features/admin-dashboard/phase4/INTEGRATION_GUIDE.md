# Phase 4 Template UI Components - Integration Guide

This guide shows how to integrate the template selector and metadata components into your application.

## Quick Start

### 1. Import the Phase 4 Module

```typescript
// app.module.ts or your feature module
import { Phase4Module } from './features/admin-dashboard/phase4/phase4.module';

@NgModule({
  imports: [
    // ... other imports
    Phase4Module
  ]
})
export class AppModule { }
```

### 2. Use Template Selector in Your Component

```typescript
// your-component.component.ts
import { Component } from '@angular/core';
import { WorkflowTemplate } from './features/admin-dashboard/phase4/models/template.models';

@Component({
  selector: 'app-workflow-creator',
  template: `
    <app-template-selector
      [workflowType]="workflowType"
      [currentTemplateId]="selectedTemplateId"
      (templateSelected)="onTemplateSelected($event)"
      (templatePreview)="onTemplatePreview($event)"
    ></app-template-selector>
  `
})
export class WorkflowCreatorComponent {
  workflowType = 'job';
  selectedTemplateId?: string;

  onTemplateSelected(template: WorkflowTemplate): void {
    console.log('Template selected:', template);
    this.selectedTemplateId = template.id;
    // Apply template to your workflow
  }

  onTemplatePreview(template: WorkflowTemplate): void {
    console.log('Preview template:', template);
    // Show preview modal or navigate to preview page
  }
}
```

## Advanced Usage

### Custom Filtering

The template selector automatically handles filtering through NgRx state. To programmatically set filters:

```typescript
import { Store } from '@ngrx/store';
import * as TemplateActions from './features/admin-dashboard/phase4/state/workflow-templates/workflow-templates.actions';

constructor(private store: Store) {}

applyCustomFilters(): void {
  this.store.dispatch(TemplateActions.setFilters({
    filters: {
      category: 'job',
      minRating: 4.0,
      author: 'System'
    }
  }));
}
```

### Template Comparison

Enable comparison mode to compare multiple templates:

```typescript
// The component handles comparison mode internally
// Users can toggle comparison mode via the UI button
// When 2+ templates are selected, they can click "Compare"
// This dispatches the compareTemplates action

// Listen for comparison results in your component:
import { selectComparisonResult } from './features/admin-dashboard/phase4/state/workflow-templates/workflow-templates.selectors';

comparisonResult$ = this.store.select(selectComparisonResult);
```

### Standalone Template Metadata Display

Use the metadata component independently to display template information:

```typescript
<div class="template-list">
  <div *ngFor="let template of templates">
    <app-template-metadata
      [template]="template"
      [compact]="true"
    ></app-template-metadata>
  </div>
</div>
```

## Styling Customization

### Override Component Styles

```scss
// your-component.component.scss

// Customize template card appearance
::ng-deep .template-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

// Customize category colors
::ng-deep .category-badge {
  font-weight: 600;
  text-transform: uppercase;
}

// Customize grid layout
::ng-deep .templates-container.grid-view {
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}
```

### Theme Integration

The components use CSS variables for easy theming:

```scss
// styles.scss (global)
:root {
  --template-primary-color: #4a90e2;
  --template-success-color: #28a745;
  --template-warning-color: #ffc107;
  --template-danger-color: #f44336;
  --template-border-radius: 8px;
  --template-spacing: 1rem;
}
```

## State Management Integration

### Subscribe to Template State

```typescript
import { Store } from '@ngrx/store';
import * as TemplateSelectors from './features/admin-dashboard/phase4/state/workflow-templates/workflow-templates.selectors';

export class YourComponent implements OnInit {
  templates$ = this.store.select(TemplateSelectors.selectFilteredTemplates);
  loading$ = this.store.select(TemplateSelectors.selectTemplatesLoading);
  error$ = this.store.select(TemplateSelectors.selectTemplatesError);
  selectedTemplate$ = this.store.select(TemplateSelectors.selectSelectedTemplate);

  constructor(private store: Store) {}

  ngOnInit(): void {
    // Templates are loaded automatically by the selector component
    // But you can also load them manually:
    this.store.dispatch(TemplateActions.loadTemplates({ 
      workflowType: 'job' 
    }));
  }
}
```

### Apply Selected Template

```typescript
import * as TemplateActions from './features/admin-dashboard/phase4/state/workflow-templates/workflow-templates.actions';

applyTemplate(templateId: string, customizations?: TemplateCustomization): void {
  this.store.dispatch(TemplateActions.applyTemplate({
    templateId,
    customizations
  }));
}
```

## Backend Integration

The components expect the following API endpoints (configured in TemplateEngineService):

```typescript
// GET /api/templates?workflowType={type}
// Returns: WorkflowTemplate[]

// GET /api/templates/{id}
// Returns: WorkflowTemplate

// GET /api/templates/categories
// Returns: TemplateCategory[]

// POST /api/templates/{id}/apply
// Body: { customizations?: TemplateCustomization }
// Returns: AppliedTemplate

// POST /api/templates/compare
// Body: { templateIds: string[] }
// Returns: TemplateDiff
```

## Error Handling

The components handle errors gracefully and display user-friendly messages:

```typescript
// Error states are automatically displayed in the UI
// You can also handle errors in your component:

this.error$.subscribe(error => {
  if (error) {
    console.error('Template error:', error);
    // Show custom error notification
  }
});
```

## Accessibility

The components are built with accessibility in mind:

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Color contrast compliance

### Keyboard Shortcuts

- `Tab` - Navigate between elements
- `Enter` - Select template or activate button
- `Space` - Toggle checkboxes in comparison mode
- `Escape` - Close modals (if implemented)

## Performance Optimization

### Lazy Loading

Load Phase 4 module only when needed:

```typescript
// app-routing.module.ts
{
  path: 'templates',
  loadChildren: () => import('./features/admin-dashboard/phase4/phase4.module')
    .then(m => m.Phase4Module)
}
```

### Virtual Scrolling

For large template lists, consider using CDK virtual scrolling:

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

// In your template:
<cdk-virtual-scroll-viewport itemSize="200" class="template-viewport">
  <div *cdkVirtualFor="let template of templates">
    <app-template-metadata [template]="template"></app-template-metadata>
  </div>
</cdk-virtual-scroll-viewport>
```

## Testing

### Component Testing

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { TemplateSelectorComponent } from './template-selector.component';

describe('Template Integration', () => {
  let component: YourComponent;
  let fixture: ComponentFixture<YourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [YourComponent],
      imports: [Phase4Module],
      providers: [
        provideMockStore({
          initialState: {
            workflowTemplates: {
              templates: mockTemplates,
              loading: false,
              error: null
            }
          }
        })
      ]
    }).compileComponents();
  });

  it('should display template selector', () => {
    fixture.detectChanges();
    const selector = fixture.nativeElement.querySelector('app-template-selector');
    expect(selector).toBeTruthy();
  });
});
```

## Troubleshooting

### Templates Not Loading

1. Check that Phase4Module is imported
2. Verify NgRx store is configured with workflowTemplates feature
3. Check browser console for API errors
4. Verify backend endpoints are accessible

### Styles Not Applying

1. Ensure component styles are not being overridden
2. Check that SCSS is properly compiled
3. Verify no conflicting global styles
4. Use browser dev tools to inspect computed styles

### State Not Updating

1. Check that actions are being dispatched
2. Verify effects are registered
3. Check reducer is handling actions correctly
4. Use Redux DevTools to inspect state changes

## Support

For issues or questions:
- Check component README files
- Review unit tests for usage examples
- Consult the design document for requirements
- Check the tasks.md file for implementation details
