import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AdminNewHireRoutingModule } from './admin-new-hire-routing.module';
import { NewHireOnboardingComponent } from './new-hire-onboarding.component';
import { NewHireOnboardingService } from './new-hire-onboarding.service';

@NgModule({
  declarations: [NewHireOnboardingComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    AdminNewHireRoutingModule
  ],
  providers: [NewHireOnboardingService]
})
export class AdminNewHireModule {}
