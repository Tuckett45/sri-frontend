import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicOnboardingComponent } from './public-onboarding.component';
import { OnboardingStartComponent } from './onboarding-start.component';

const routes: Routes = [
  { path: 'start', component: OnboardingStartComponent },
  { path: 'apply/:token', component: PublicOnboardingComponent },
  { path: '', redirectTo: 'start', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicOnboardingRoutingModule {}
