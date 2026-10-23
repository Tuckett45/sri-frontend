import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewHireOnboardingComponent } from './new-hire-onboarding.component';

const routes: Routes = [
  { path: '', component: NewHireOnboardingComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminNewHireRoutingModule {}
