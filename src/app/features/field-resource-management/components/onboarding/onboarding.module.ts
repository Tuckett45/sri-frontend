import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { OnboardingRoutingModule } from './onboarding-routing.module';
import { SharedMaterialModule } from '../../shared-material.module';

import { OnboardingNavComponent } from './onboarding-nav/onboarding-nav.component';
import { CandidateListComponent } from './candidate-list/candidate-list.component';
import { CandidateFormComponent } from './candidate-form/candidate-form.component';
import { PipelineDashboardComponent } from './pipeline-dashboard/pipeline-dashboard.component';
import { CredentialsListComponent } from './credentials-list/credentials-list.component';
import { CredentialDetailComponent } from './credential-detail/credential-detail.component';
import { CredentialFormComponent } from './credential-form/credential-form.component';
import { EquipmentSectionComponent } from './equipment-section/equipment-section.component';
import { CompetencySectionComponent } from './competency-section/competency-section.component';
import { PRCSectionComponent } from './prc-section/prc-section.component';
import { OnboardingChecklistComponent } from './onboarding-checklist/onboarding-checklist.component';
import { ReferralTrackerComponent } from './referral-tracker/referral-tracker.component';
import { OnboardingInfoModalComponent } from './onboarding-info-modal/onboarding-info-modal.component';
import { CandidateDetailComponent } from './candidate-detail/candidate-detail.component';
import { OnboardingProgressHeaderComponent } from './onboarding-progress-header/onboarding-progress-header.component';
import { CredentialFormModalComponent } from './credential-form-modal/credential-form-modal.component';
import { AddCandidateModalComponent } from './add-candidate-modal/add-candidate-modal.component';
import { EquipmentEditModalComponent } from './equipment-edit-modal/equipment-edit-modal.component';
import { CompetencyEditModalComponent } from './competency-edit-modal/competency-edit-modal.component';
import { GoalEditModalComponent } from './goal-edit-modal/goal-edit-modal.component';
import { ConfirmDeleteModalComponent } from './confirm-delete-modal/confirm-delete-modal.component';

@NgModule({
  declarations: [
    OnboardingNavComponent,
    CandidateListComponent,
    CandidateFormComponent,
    PipelineDashboardComponent,
    CredentialsListComponent,
    CredentialDetailComponent,
    CredentialFormComponent,
    EquipmentSectionComponent,
    CompetencySectionComponent,
    PRCSectionComponent,
    OnboardingChecklistComponent,
    ReferralTrackerComponent,
    OnboardingInfoModalComponent,
    CandidateDetailComponent,
    OnboardingProgressHeaderComponent,
    CredentialFormModalComponent,
    AddCandidateModalComponent,
    EquipmentEditModalComponent,
    CompetencyEditModalComponent,
    GoalEditModalComponent,
    ConfirmDeleteModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    OnboardingRoutingModule,
    SharedMaterialModule
  ]
})
export class OnboardingModule { }
