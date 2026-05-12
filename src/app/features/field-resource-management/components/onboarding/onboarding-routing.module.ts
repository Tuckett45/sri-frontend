import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OnboardingNavComponent } from './onboarding-nav/onboarding-nav.component';
import { CandidateListComponent } from './candidate-list/candidate-list.component';
import { CandidateFormComponent } from './candidate-form/candidate-form.component';
import { PipelineDashboardComponent } from './pipeline-dashboard/pipeline-dashboard.component';
import { CredentialsListComponent } from './credentials-list/credentials-list.component';
import { CredentialDetailComponent } from './credential-detail/credential-detail.component';
import { CredentialFormComponent } from './credential-form/credential-form.component';
import { OnboardingChecklistComponent } from './onboarding-checklist/onboarding-checklist.component';
import { ReferralTrackerComponent } from './referral-tracker/referral-tracker.component';
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
      },
      {
        path: 'referrals',
        component: ReferralTrackerComponent,
        data: { title: 'Referral Tracker', breadcrumb: 'Referrals' }
      },
      {
        path: 'credentials',
        component: CredentialsListComponent,
        data: { title: 'Tech Credentials', breadcrumb: 'Credentials' }
      },
      {
        path: 'credentials/:technicianId',
        component: CredentialDetailComponent,
        data: { title: 'Credential Detail', breadcrumb: 'Credential Detail' }
      },
      {
        path: 'credentials/:technicianId/checklist',
        component: OnboardingChecklistComponent,
        data: { title: 'Onboarding Checklist', breadcrumb: 'Checklist' }
      },
      {
        path: 'credentials/:technicianId/new',
        component: CredentialFormComponent,
        canDeactivate: [UnsavedChangesGuard],
        data: { title: 'Add Credential', breadcrumb: 'New Credential' }
      },
      {
        path: 'credentials/:technicianId/edit/:credentialId',
        component: CredentialFormComponent,
        canDeactivate: [UnsavedChangesGuard],
        data: { title: 'Edit Credential', breadcrumb: 'Edit Credential' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OnboardingRoutingModule { }
