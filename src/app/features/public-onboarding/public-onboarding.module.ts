import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PublicOnboardingRoutingModule } from './public-onboarding-routing.module';
import { PublicOnboardingComponent } from './public-onboarding.component';
import { PublicOnboardingService } from './public-onboarding.service';

@NgModule({
  declarations: [PublicOnboardingComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    PublicOnboardingRoutingModule
  ],
  providers: [PublicOnboardingService]
})
export class PublicOnboardingModule {}
