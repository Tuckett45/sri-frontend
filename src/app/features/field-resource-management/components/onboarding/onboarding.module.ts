import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { OnboardingRoutingModule } from './onboarding-routing.module';

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
    OnboardingChecklistComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    OnboardingRoutingModule
  ]
})
export class OnboardingModule { }
