import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/auth.guard';

// Phase 0 Components
import { AdminViewerComponent } from './phase0/components/admin-viewer/admin-viewer.component';
import { StateVisualizationComponent } from './phase0/components/state-visualization/state-visualization.component';

// Phase 1 Components
import { LifecycleManagementComponent } from './phase1/components/lifecycle-management/lifecycle-management.component';

// Phase 2 Components
import { WorkflowWizardComponent } from './phase2/components/workflow-wizard/workflow-wizard.component';
import { JobProcessingPipelineComponent } from './phase2/components/job-processing-pipeline/job-processing-pipeline.component';

// Phase 3 Pages
import { AiInsightsDashboardComponent } from './phase3/pages/ai-insights-dashboard/ai-insights-dashboard.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      // Phase 0: Admin Viewer and State Visualization
      {
        path: 'overview',
        component: AdminViewerComponent,
        data: { title: 'Admin Dashboard Overview' }
      },
      {
        path: 'state-visualization/:entityType/:entityId',
        component: StateVisualizationComponent,
        data: { title: 'State Visualization' }
      },
      // Phase 1: Lifecycle Management
      {
        path: 'lifecycle/:entityType/:entityId',
        component: LifecycleManagementComponent,
        data: { title: 'Lifecycle Management' }
      },
      // Phase 2: Workflow and Pipeline
      {
        path: 'workflow-wizard',
        component: WorkflowWizardComponent,
        data: { title: 'Workflow Wizard' }
      },
      {
        path: 'workflow-wizard/:workflowType',
        component: WorkflowWizardComponent,
        data: { title: 'Workflow Wizard' }
      },
      {
        path: 'pipeline/:jobId',
        component: JobProcessingPipelineComponent,
        data: { title: 'Job Processing Pipeline' }
      },
      // Phase 3: AI Insights
      {
        path: 'ai-insights',
        component: AiInsightsDashboardComponent,
        data: { title: 'AI Insights & Recommendations' }
      },
      {
        path: 'ai-insights/:context',
        component: AiInsightsDashboardComponent,
        data: { title: 'AI Insights & Recommendations' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminDashboardRoutingModule { }
