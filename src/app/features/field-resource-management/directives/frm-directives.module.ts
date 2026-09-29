import { NgModule } from '@angular/core';
import { PhoneMaskDirective } from './phone-mask.directive';
import { NameCapitalizeDirective } from './name-capitalize.directive';

/**
 * Shared module that declares and exports the Field Resource Management input
 * directives (phone masking + name capitalization) so they can be reused across
 * multiple feature modules (onboarding, technicians, etc.) without being
 * declared in more than one NgModule.
 */
@NgModule({
  declarations: [PhoneMaskDirective, NameCapitalizeDirective],
  exports: [PhoneMaskDirective, NameCapitalizeDirective]
})
export class FrmDirectivesModule {}
