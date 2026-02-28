import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { AdminDashboardRoutingModule } from './admin-dashboard-routing.module';

// Phase 0 State
import { adminViewerReducer } from './phase0/state/admin-viewer/admin-viewer.reducer';
import { stateHistoryReducer } from './phase0/state/state-history/state-history.reducer';
import { AdminViewerEffects } from './phase0/state/admin-viewer/admin-viewer.effects';
import { StateHistoryEffects } from './phase0/state/state-history/state-history.effects';

// Phase 0 Services
import { AdminMetricsService } from './phase0/services/admin-metrics.service';
import { StateVisualizationService } from './phase0/services/state-visualization.service';

// Phase 0 Components
import { AdminViewerComponent } from './phase0/components/admin-viewer/admin-viewer.component';
import { StateVisualizationComponent } from './phase0/components/state-visualization/state-visualization.component';
import { StateTimelineComponent } from './phase0/components/state-timeline/state-timeline.component';

// Phase 1 Components
import { LifecycleManagementComponent } from './phase1/components/lifecycle-management/lifecycle-management.component';
import { StateTransitionControlsComponent } from './phase1/components/state-transition-controls/state-transition-controls.component';

// Phase 1 Services
import { LifecycleService } from './phase1/services/lifecycle.service';

// Phase 1 State
import { lifecycleTransitionsReducer } from './phase1/state/lifecycle-transitions/lifecycle-transitions.reducer';
import { LifecycleTransitionsEffects } from './phase1/state/lifecycle-transitions/lifecycle-transitions.effects';

// Phase 2 Components
import { WorkflowWizardComponent } from './phase2/components/workflow-wizard/workflow-wizard.component';
import { JobProcessingPipelineComponent } from './phase2/components/job-processing-pipeline/job-processing-pipeline.component';

// Phase 2 Services
import { ValidationEngineService } from './phase2/services/validation-engine.service';
import { PipelineExecutionService } from './phase2/services/pipeline-execution.service';
import { AdminWorkflowService } from './phase2/services/workflow.service';

// Phase 2 State
import { workflowWizardReducer } from './phase2/state/workflow-wizard/workflow-wizard.reducer';
import { WorkflowWizardEffects } from './phase2/state/workflow-wizard/workflow-wizard.effects';

// Phase 3 Services
import { RecommendationEngineService } from './phase3/services/recommendation-engine.service';
import { InsightMetricsService } from './phase3/services/insight-metrics.service';

// Phase 3 Components
import { AIAdvisoryPanelComponent } from './phase3/components/ai-advisory-panel/ai-advisory-panel.component';
import { InsightsDisplayComponent } from './phase3/components/insights-display/insights-display.component';
import { AiInsightsDashboardComponent } from './phase3/pages/ai-insights-dashboard/ai-insights-dashboard.component';

// Phase 3 State
import { aiRecommendationsReducer } from './phase3/state/ai-recommendations/ai-recommendations.reducer';
import { AIRecommendationsEffects } from './phase3/state/ai-recommendations/ai-recommendations.effects';

@NgModule({
  declarations: [
    // Phase 0
    AdminViewerComponent,
    StateVisualizationComponent,
    StateTimelineComponent,
    // Phase 1
    LifecycleManagementComponent,
    StateTransitionControlsComponent,
    // Phase 2
    WorkflowWizardComponent,
    JobProcessingPipelineComponent,
    // Phase 3
    AIAdvisoryPanelComponent,
    InsightsDisplayComponent,
    AiInsightsDashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminDashboardRoutingModule,
    
    // NgRx State Management
    // Phase 0
    StoreModule.forFeature('adminViewer', adminViewerReducer),
    StoreModule.forFeature('stateHistory', stateHistoryReducer),
    EffectsModule.forFeature([AdminViewerEffects, StateHistoryEffects]),
    // Phase 1
    StoreModule.forFeature('lifecycleTransitions', lifecycleTransitionsReducer),
    EffectsModule.forFeature([LifecycleTransitionsEffects]),
    // Phase 2
    StoreModule.forFeature('workflowWizard', workflowWizardReducer),
    EffectsModule.forFeature([WorkflowWizardEffects]),
    // Phase 3
    StoreModule.forFeature('aiRecommendations', aiRecommendationsReducer),
    EffectsModule.forFeature([AIRecommendationsEffects])
  ],
  exports: [
    // Export Phase 3 components for use in standalone components
    AIAdvisoryPanelComponent,
    InsightsDisplayComponent
  ],
  providers: [
    // Phase 0
    AdminMetricsService,
    StateVisualizationService,
    // Phase 1
    LifecycleService,
    // Phase 2
    ValidationEngineService,
    PipelineExecutionService,
    AdminWorkflowService,
    // Phase 3
    RecommendationEngineService,
    InsightMetricsService
  ]
})
export class AdminDashboardModule { }
