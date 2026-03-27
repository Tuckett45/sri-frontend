import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OnboardingNavComponent } from './onboarding-nav/onboarding-nav.component';
import { CandidateListComponent } from './candidate-list/candidate-list.component';
import { CandidateFormComponent } from './candidate-form/candidate-form.component';
import { PipelineDashboardComponent } from './pipeline-dashboard/pipeline-dashboard.component';
import { UnsavedChangesGuard } from '../../guards/unsaved-changes.guard';

const routes: Routes = [
  {
    path: '',
    component: OnboardingNavComponent,
    children: [
      {
        path: '',
        redirectTo: 'candidates',
        pathMatch: 'full'
      },
      {
        path: 'candidates',
        component: CandidateListComponent,
        data: { title: 'Candidate List', breadcrumb: 'Candidates' }
      },
      {
        path: 'candidates/new',
        component: CandidateFormComponent,
        canDeactivate: [UnsavedChangesGuard],
        data: { title: 'Add Candidate', breadcrumb: 'New Candidate' }
      },
      {
        path: 'candidates/:candidateId',
        component: CandidateFormComponent,
        canDeactivate: [UnsavedChangesGuard],
        data: { title: 'Edit Candidate', breadcrumb: 'Edit Candidate' }
      },
      {
        path: 'pipeline',
        component: PipelineDashboardComponent,
        data: { title: 'Pipeline Dashboard', breadcrumb: 'Pipeline' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OnboardingRoutingModule { }
