import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Mobile Components (without routing)
import { TimeTrackerComponent } from './time-tracker/time-tracker.component';

/**
 * Mobile Shared Module
 * 
 * Exports mobile components without routing configuration.
 * This allows other modules to use mobile components (like TimeTrackerComponent)
 * without importing the mobile routing configuration.
 * 
 * Use this module when you need mobile components in other feature modules.
 * Use MobileModule when you need the full mobile feature with routing.
 */
@NgModule({
  declarations: [
    TimeTrackerComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule
  ],
  exports: [
    TimeTrackerComponent
  ]
})
export class MobileSharedModule { }
