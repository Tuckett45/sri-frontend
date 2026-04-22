import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { OnboardingRoutingModule } from './onboarding-routing.module';

import { OnboardingNavComponent } from './onboarding-nav/onboarding-nav.component';
import { CandidateListComponent } from './candidate-list/candidate-list.component';
import { CandidateFormComponent } from './candidate-form/candidate-form.component';
import { PipelineDashboardComponent } from './pipeline-dashboard/pipeline-dashboard.component';

@NgModule({
  declarations: [
    OnboardingNavComponent,
    CandidateListComponent,
    CandidateFormComponent,
    PipelineDashboardComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    OnboardingRoutingModule
  ]
})
export class OnboardingModule { }
