import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicOnboardingComponent } from './public-onboarding.component';

const routes: Routes = [
  { path: '', component: PublicOnboardingComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicOnboardingRoutingModule {}
