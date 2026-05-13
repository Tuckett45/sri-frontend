import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedMaterialModule } from '../../shared-material.module';

import { TimecardEntryComponent } from './timecard-entry/timecard-entry.component';

@NgModule({
  declarations: [
    TimecardEntryComponent
  ],
  imports: [
    CommonModule,
    SharedMaterialModule
  ],
  exports: [
    TimecardEntryComponent
  ]
})
export class TimecardsModule { }
