import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedMaterialModule } from '../../shared-material.module';
import { TimeTrackerComponent } from './time-tracker/time-tracker.component';

@NgModule({
  declarations: [TimeTrackerComponent],
  imports: [CommonModule, SharedMaterialModule],
  exports: [TimeTrackerComponent]
})
export class MobileSharedModule {}
