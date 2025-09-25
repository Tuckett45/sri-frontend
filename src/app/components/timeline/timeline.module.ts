import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SliderModule } from 'primeng/slider';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { TimelineModeComponent } from './timeline-mode.component';

@NgModule({
  declarations: [TimelineModeComponent],
  imports: [
    CommonModule,
    FormsModule,
    SliderModule,
    ButtonModule,
    CalendarModule,
    TooltipModule,
    TagModule
  ],
  exports: [TimelineModeComponent]
})
export class TimelineModule {}
