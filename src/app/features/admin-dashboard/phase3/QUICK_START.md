# AI Advisory Panel - Quick Start Guide

## 🚀 Accessing AI Features

### 1. Admin Dashboard Widget (Primary Integration)

Navigate to the Admin Dashboard Overview:

```
http://localhost:4200/admin-dashboard
```

The AI Insights & Analytics widget is embedded directly in the main dashboard, providing:
- **AI Recommendations Panel**: Job-specific AI recommendations with confidence scores
- **System Insights Panel**: Performance, efficiency, and risk insights
- **Integrated View**: Works seamlessly with existing ATLAS analytics and system metrics

**Features**:
- View AI recommendations with confidence scores
- Accept or reject recommendations with feedback
- View insights in cards mode
- Real-time system insights
- Integrated with system health and metrics

### 2. Workflow Wizard with AI Sidebar

Navigate to the workflow wizard:

```
http://localhost:4200/admin-dashboard/workflow-wizard
```

The AI Advisory Panel will appear as a sticky sidebar on the right, providing context-aware recommendations as you create workflows.

### 3. Embedding in Your Components

You can embed the AI components anywhere in your application:

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-my-component',
  template: `
    <div class="my-layout">
      <div class="main-content">
        <!-- Your main content -->
      </div>
      
      <div class="ai-sidebar">
        <app-ai-advisory-panel
          [context]="'job'"
          [autoRefresh]="true"
          (recommendationAccepted)="onAccept($event)"
          (recommendationRejected)="onReject($event)">
        </app-ai-advisory-panel>
      </div>
    </div>
  `
})
export class MyComponent {
  onAccept(recommendation: any) {
    console.log('Accepted:', recommendation);
  }
  
  onReject(event: any) {
    console.log('Rejected:', event);
  }
}
```

## 📊 Component APIs

### AIAdvisoryPanelComponent

```html
<app-ai-advisory-panel
  [context]="'job'"              <!-- Required: 'job' | 'scheduling' | 'resource-allocation' | 'forecasting' -->
  [entityId]="'123'"             <!-- Optional: specific entity ID -->
  [autoRefresh]="true"           <!-- Optional: enable 60-second auto-refresh -->
  (recommendationAccepted)="onAccept($event)"
  (recommendationRejected)="onReject($event)">
</app-ai-advisory-panel>
```

### InsightsDisplayComponent

```html
<app-insights-display
  [insights]="(insights$ | async) || []"  <!-- Required: array of insights (use || [] to handle null) -->
  [displayMode]="'cards'"                 <!-- Optional: 'cards' | 'list' | 'timeline' -->
  [showCharts]="true"                     <!-- Optional: show chart visualizations -->
  (insightSelected)="onSelect($event)">
</app-insights-display>
```

**Important**: Always use `|| []` when passing async observables to handle null values.

## 🎯 Current Features

### AI Recommendations
- ✅ Context-based recommendations (Job, Scheduling, Resource Allocation, Forecasting)
- ✅ Confidence score visualization
- ✅ Priority-based sorting
- ✅ Accept/Reject controls with reason collection
- ✅ Expandable recommendation details
- ✅ Auto-refresh capability
- ✅ Expired recommendation handling

### Insights Display
- ✅ Three display modes (cards, list, timeline)
- ✅ Filtering by category and severity
- ✅ Search functionality
- ✅ Sorting by priority, date, or category
- ✅ Metric trend visualization (up/down/stable)
- ✅ Change percentage display
- ✅ Chart rendering support

### Trend Calculation
- ✅ Automatic trend determination from change percentages
- ✅ Trend consistency validation
- ✅ Metric normalization
- ✅ 40 unit tests validating correctness

## 🔧 State Management

### Dispatching Actions

```typescript
import { Store } from '@ngrx/store';
import { loadRecommendations, acceptRecommendation } from './state/ai-recommendations/ai-recommendations.actions';

constructor(private store: Store) {}

loadRecommendations() {
  this.store.dispatch(loadRecommendations({ 
    context: { type: 'job', entityId: '123' } 
  }));
}

acceptRecommendation(id: string) {
  this.store.dispatch(acceptRecommendation({ 
    id, 
    metadata: { acceptedAt: new Date() } 
  }));
}
```

### Selecting Data

```typescript
import { selectRecommendations, selectInsights } from './state/...';

recommendations$ = this.store.select(selectRecommendations);
insights$ = this.store.select(selectInsights);
```

## 📝 Next Steps

1. **View the Widget**: Navigate to `/admin-dashboard` to see the AI Insights & Analytics widget
2. **Backend Integration**: Connect to actual AI backend services (currently using mock data)
3. **Customize Contexts**: Adjust contexts based on your application's needs
4. **Add More Embeddings**: Embed AI panels in other relevant pages
5. **Implement Global Widget**: Add floating AI assistant for global access

## 🐛 Troubleshooting

### Components Not Showing
- Ensure `AdminDashboardModule` is imported in your module
- Check that routes are properly configured
- Verify NgRx store is set up correctly

### Mock Data
- Currently using mock data for insights
- Recommendations come from backend (if configured)
- Update selectors when connecting to real data sources

### Styling Issues
- Components use standard Angular Material design patterns
- Customize SCSS files in component directories
- Responsive breakpoints at 1200px and 768px

## 📚 Documentation

For more detailed information, see:
- [AI Integration Guide](./AI_INTEGRATION_GUIDE.md) - Comprehensive integration documentation
- [Phase 3 README](../README.md) - Phase 3 overview and architecture
- [Requirements](../../../../.kiro/specs/frontend-phase-enhancements/requirements.md) - Full requirements specification
