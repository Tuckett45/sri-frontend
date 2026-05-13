import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

// Routing
import { ConstructionIntegrationRoutingModule } from './construction-integration-routing.module';

// Container
import { ConstructionContainerComponent } from './construction-container.component';

// Components (all standalone — imported, not declared)
import { ForecastDashboardComponent } from './components/forecast-dashboard/forecast-dashboard.component';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { ProjectCreateComponent } from './components/project-create/project-create.component';
import { ProjectEditComponent } from './components/project-edit/project-edit.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { IssueCreateComponent } from './components/issue-create/issue-create.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';

// NgRx State
import { projectReducer } from './state/projects/project.reducer';
import { ProjectEffects } from './state/projects/project.effects';
import { allocationReducer } from './state/allocations/allocation.reducer';
import { AllocationEffects } from './state/allocations/allocation.effects';
import { issueReducer } from './state/issues/issue.reducer';
import { IssueEffects } from './state/issues/issue.effects';

// Services
import { ConstructionService } from './services/construction.service';
import { CsvExportService } from './services/csv-export.service';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConstructionIntegrationRoutingModule,

    // Standalone components
    ConstructionContainerComponent,
    ForecastDashboardComponent,
    ProjectDetailComponent,
    ProjectCreateComponent,
    ProjectEditComponent,
    IssueListComponent,
    IssueCreateComponent,
    IssueDetailComponent,

    // NgRx state management
    StoreModule.forFeature('constructionProjects', projectReducer),
    EffectsModule.forFeature([ProjectEffects]),
    StoreModule.forFeature('constructionAllocations', allocationReducer),
    EffectsModule.forFeature([AllocationEffects]),
    StoreModule.forFeature('constructionIssues', issueReducer),
    EffectsModule.forFeature([IssueEffects]),
  ],
  providers: [
    ConstructionService,
    CsvExportService,
  ]
})
export class ConstructionIntegrationModule {}
