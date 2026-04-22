# AI Analysis State Management

This directory contains the NgRx state management implementation for AI analysis features in the ATLAS integration.

## Overview

The AI analysis state manages:
- Analysis results for deployments
- Risk assessments
- Recommendation sets
- Available AI agents
- Loading states for all operations
- Error states for all operations

## Files

### `ai-analysis.state.ts`
Defines the state interface and initial state for AI analysis management.

**Key Interfaces:**
- `AIAnalysisState` - Main state interface
- `AIAnalysisLoadingState` - Loading states for different operations
- `AIAnalysisErrorState` - Error states for different operations

**State Structure:**
```typescript
{
  analysisResults: Record<string, AnalysisResult>,
  riskAssessments: Record<string, RiskAssessment>,
  recommendationSets: Record<string, RecommendationSet>,
  availableAgents: AgentMetadata[],
  selectedDeploymentId: string | null,
  loading: AIAnalysisLoadingState,
  error: AIAnalysisErrorState,
  lastAnalyzed: Record<string, number>,
  lastRiskAssessed: Record<string, number>,
  lastRecommendationsGenerated: Record<string, number>
}
```

### `ai-analysis.actions.ts`
Defines all actions for AI analysis state mutations.

**Action Categories:**
- Analyze Deployment (analyze, success, failure)
- Assess Risk (assess, success, failure)
- Generate Recommendations (generate, success, failure)
- Load Available Agents (load, success, failure)
- Validate Agent Operation (validate, success, failure)
- Selection Management (select, clear)
- Cache Management (clear, refresh)

### `ai-analysis.reducer.ts`
Implements pure, immutable state transitions for all actions.

**Key Features:**
- Stores results keyed by deployment ID
- Maintains loading and error states
- Tracks timestamps for cache invalidation
- Supports clearing individual deployment data

### `ai-analysis.effects.ts`
Handles side effects including API calls.

**Effects:**
- `analyzeDeployment$` - Trigger AI analysis
- `assessRisk$` - Perform risk assessment
- `generateRecommendations$` - Generate recommendations
- `loadAvailableAgents$` - Load available agents
- `validateAgentOperation$` - Validate agent operations
- `refreshAnalysis$` - Refresh analysis data

### `ai-analysis.selectors.ts`
Provides memoized selectors for accessing state.

**Selector Categories:**
- Base selectors (results, assessments, recommendations, agents)
- Loading state selectors
- Error state selectors
- Cache timestamp selectors
- Deployment-specific selectors (factory selectors)
- Derived selectors (critical findings, high-priority recommendations)
- Risk selectors (critical risks, high-severity risks)
- Agent selectors (active agents, by domain)

**Key Derived Selectors:**
- `selectCriticalFindings` - Critical severity findings
- `selectHighPriorityRecommendations` - High/critical priority recommendations
- `selectCriticalRisks` - Critical severity risks
- `selectFindingsBySeverity` - Findings grouped by severity
- `selectRecommendationsByPriority` - Recommendations grouped by priority
- `selectRisksByCategory` - Risks grouped by category

### `index.ts`
Barrel export for convenient imports.

## Usage

### In Components

```typescript
import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import {
  analyzeDeployment,
  assessRisk,
  generateRecommendations,
  selectAnalysisResultForDeployment,
  selectRiskAssessmentForDeployment,
  selectHighPriorityRecommendations,
  selectAnalyzing
} from '../state/ai-analysis';
import { AnalysisResult, RiskAssessment } from '../models/ai-analysis.model';

@Component({
  selector: 'app-ai-analysis',
  template: `
    <div *ngIf="analyzing$ | async">Analyzing...</div>
    <div *ngIf="analysisResult$ | async as result">
      <h3>Analysis Result</h3>
      <p>Readiness: {{ result.readinessAssessment.status }}</p>
    </div>
  `
})
export class AIAnalysisComponent implements OnInit {
  analysisResult$: Observable<AnalysisResult | null>;
  riskAssessment$: Observable<RiskAssessment | null>;
  highPriorityRecs$: Observable<any[]>;
  analyzing$: Observable<boolean>;

  constructor(private store: Store) {
    const deploymentId = 'deployment-123';
    
    this.analysisResult$ = this.store.select(
      selectAnalysisResultForDeployment(deploymentId)
    );
    this.riskAssessment$ = this.store.select(
      selectRiskAssessmentForDeployment(deploymentId)
    );
    this.highPriorityRecs$ = this.store.select(
      selectHighPriorityRecommendations(deploymentId)
    );
    this.analyzing$ = this.store.select(selectAnalyzing);
  }

  ngOnInit() {
    const deploymentId = 'deployment-123';
    
    // Trigger analysis
    this.store.dispatch(analyzeDeployment({ deploymentId }));
    
    // Trigger risk assessment
    this.store.dispatch(assessRisk({ deploymentId }));
    
    // Generate recommendations
    this.store.dispatch(generateRecommendations({ deploymentId }));
  }
}
```

### Dispatching Actions

```typescript
// Analyze deployment
this.store.dispatch(analyzeDeployment({
  deploymentId: 'deployment-123',
  targetState: 'READY'
}));

// Assess risk
this.store.dispatch(assessRisk({
  deploymentId: 'deployment-123'
}));

// Generate recommendations
this.store.dispatch(generateRecommendations({
  deploymentId: 'deployment-123'
}));

// Load available agents
this.store.dispatch(loadAvailableAgents());

// Clear analysis for deployment
this.store.dispatch(clearAnalysisForDeployment({
  deploymentId: 'deployment-123'
}));
```

### Selecting State

```typescript
// Select analysis result
const analysisResult$ = this.store.select(
  selectAnalysisResultForDeployment('deployment-123')
);

// Select critical findings
const criticalFindings$ = this.store.select(
  selectCriticalFindings('deployment-123')
);

// Select high-priority recommendations
const highPriorityRecs$ = this.store.select(
  selectHighPriorityRecommendations('deployment-123')
);

// Select loading state
const analyzing$ = this.store.select(selectAnalyzing);

// Select error state
const error$ = this.store.select(selectAnalyzingError);
```

## Requirements Mapping

- **Requirement 3.1**: NgRx Store for state management
- **Requirement 3.2**: Actions for all state mutations
- **Requirement 3.3**: Pure, immutable reducers
- **Requirement 3.4**: Effects for API calls
- **Requirement 3.5**: Loading state handling
- **Requirement 3.6**: Success handling
- **Requirement 3.7**: Error handling
- **Requirement 3.8**: Memoized selectors
- **Requirement 3.9**: Separate state slices
- **Requirement 11.3**: Memoization to prevent unnecessary re-renders

## Testing

Unit tests should cover:
- Reducer state transitions
- Selector memoization
- Effect API call handling
- Error scenarios
- Loading state management

## Notes

- Results are keyed by deployment ID for efficient lookup
- Timestamps track when data was last fetched for cache invalidation
- Derived selectors provide filtered views (critical findings, high-priority recommendations)
- All selectors are memoized for performance
- State is cleared on logout via `clearAIAnalysisState` action
