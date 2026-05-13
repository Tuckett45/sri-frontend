# AI Advisory Panel Integration Guide

## Overview

The AI Advisory Panel and Insights Display components have been successfully integrated into the SRI Frontend application using a hybrid approach that provides both dedicated pages and contextual embedding.

## Integration Approach

### 1. Dedicated AI Insights Dashboard

**Route**: `/admin-dashboard/ai-insights` or `/admin-dashboard/ai-insights/:context`

**Location**: `src/app/features/admin-dashboard/phase3/pages/ai-insights-dashboard/`

**Features**:
- Comprehensive dashboard displaying AI recommendations and insights
- Context selector for switching between different recommendation contexts:
  - Job Management
  - Scheduling
  - Resource Allocation
  - Forecasting
- Display mode selector for insights (cards, list, timeline)
- Auto-refresh capability for real-time updates
- Side-by-side layout with recommendations and insights

**Usage**:
```typescript
// Navigate to AI insights dashboard
this.router.navigate(['/admin-dashboard/ai-insights']);

// Navigate with specific context
this.router.navigate(['/admin-dashboard/ai-insights', 'scheduling']);
```

### 2. Embedded in Workflow Wizard

**Location**: `src/app/features/admin-dashboard/phase2/components/workflow-wizard/`

**Integration**: AI Advisory Panel is embedded as a sticky sidebar in the workflow wizard, providing context-aware recommendations as users progress through workflow steps.

**Features**:
- Sticky sidebar that stays visible while scrolling
- Context set to 'job' for job-related recommendations
- Responsive design that stacks on mobile devices

### 3. Component Exports

Both components are exported from the AdminDashboardModule and can be embedded in any other component:

```html
<!-- AI Advisory Panel -->
<app-ai-advisory-panel
  [context]="'job'"
  [entityId]="jobId"
  [autoRefresh]="true"
  (recommendationAccepted)="onRecommendationAccepted($event)"
  (recommendationRejected)="onRecommendationRejected($event)">
</app-ai-advisory-panel>

<!-- Insights Display -->
<app-insights-display
  [insights]="insights$ | async"
  [displayMode]="'cards'"
  [showCharts]="true"
  (insightSelected)="onInsightSelected($event)">
</app-insights-display>
```

## Component APIs

### AIAdvisoryPanelComponent

**Inputs**:
- `context`: 'job' | 'scheduling' | 'resource-allocation' | 'forecasting' - The context for recommendations
- `entityId?: string` - Optional entity ID for context-specific recommendations
- `autoRefresh: boolean` - Enable auto-refresh (default: false, 60-second interval)

**Outputs**:
- `recommendationAccepted: EventEmitter<Recommendation>` - Emitted when user accepts a recommendation
- `recommendationRejected: EventEmitter<{recommendation: Recommendation, reason: string}>` - Emitted when user rejects a recommendation

**Features**:
- Displays recommendations with confidence scores and priority visualization
- Accept/reject controls with reason collection
- Expandable recommendation details
- Expired recommendation handling
- Loading and error states

### InsightsDisplayComponent

**Inputs**:
- `insights: Insight[]` - Array of insights to display
- `displayMode: 'cards' | 'list' | 'timeline'` - Display mode (default: 'cards')
- `showCharts: boolean` - Show chart visualizations (default: true)

**Outputs**:
- `insightSelected: EventEmitter<Insight>` - Emitted when user selects an insight

**Features**:
- Three display modes (cards, list, timeline)
- Filtering by category and severity
- Search functionality
- Sorting by priority, date, or category
- Metric trend visualization (up/down/stable)
- Change percentage display

## State Management

### AI Recommendations State

**Selectors**:
- `selectRecommendations` - Get all recommendations
- `selectLoading` - Get loading state
- `selectError` - Get error state
- `selectIsAccepting(id)` - Check if recommendation is being accepted
- `selectIsRejecting(id)` - Check if recommendation is being rejected

**Actions**:
- `loadRecommendations({ context })` - Load recommendations for context
- `refreshRecommendations({ context })` - Refresh recommendations
- `acceptRecommendation({ id, metadata })` - Accept a recommendation
- `rejectRecommendation({ id, reason })` - Reject a recommendation
- `provideFeedback({ id, feedback })` - Provide feedback on recommendation

### Insights State

**Selectors**:
- `selectInsights` - Get all insights
- `selectInsightsByCategory(category)` - Filter by category
- `selectInsightsBySeverity(severity)` - Filter by severity
- `selectCriticalInsights` - Get only critical insights

**Note**: Currently using mock data. Will be connected to actual state slice in future tasks.

## Services

### RecommendationEngineService

**Methods**:
- `getRecommendations(context)` - Fetch recommendations from backend
- `acceptRecommendation(id, metadata)` - Accept a recommendation
- `rejectRecommendation(id, reason)` - Reject a recommendation
- `provideFeedback(id, feedback)` - Provide user feedback
- `explainRecommendation(id)` - Get explanation for recommendation

### InsightMetricsService

**Methods**:
- `calculateTrend(changePercent)` - Calculate trend from change percentage
- `calculateChangePercent(current, previous)` - Calculate percentage change
- `validateTrendConsistency(metric)` - Validate trend matches change percent
- `normalizeMetric(metric)` - Correct inconsistent trends
- `createMetric(name, value, unit, changePercent)` - Create metric with auto-trend

## Future Enhancements

### Phase 4: Global AI Assistant Widget
- Floating action button (FAB) for global access
- Slide-out panel with general recommendations
- Quick access from any page in the application

### Phase 5: Additional Embeddings
- Embed in Job Processing Pipeline for job-specific recommendations
- Embed in Admin Dashboard Overview for system-wide insights
- Embed in Scheduling pages for scheduling optimization suggestions

## Navigation

Users can access AI features through:

1. **Main Navigation** - Add link to `/admin-dashboard/ai-insights` in main menu
2. **Workflow Wizard** - Sidebar panel automatically visible
3. **Direct URL** - Navigate directly to `/admin-dashboard/ai-insights` or `/admin-dashboard/ai-insights/scheduling`

## Testing

The InsightMetricsService has comprehensive unit tests (40 tests) validating:
- Trend calculation logic
- Change percentage calculations
- Trend consistency validation
- Metric normalization

Additional component tests should be added for:
- AIAdvisoryPanelComponent user interactions
- InsightsDisplayComponent display modes and filtering
- AiInsightsDashboardComponent context switching

## Requirements Validation

This implementation validates the following requirements:
- **Requirement 8.1**: AI recommendations fetched for context
- **Requirement 8.2**: Confidence scores and priorities displayed
- **Requirement 8.5**: Accept/reject controls with feedback
- **Requirement 8.6**: Rejection reason collection
- **Requirement 9.1**: Multiple display modes for insights
- **Requirement 9.2**: Metric visualization with trends
- **Requirement 9.3-9.5**: Trend calculation and consistency
- **Requirement 9.7**: Filtering and sorting controls
