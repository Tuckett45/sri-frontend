import { NgModule } from '@angular/core';
import { TimeCardRoutingModule } from './timecard-routing.module';
import { TimeCardComponent } from './timecard.component';
import { TimeCardUiModule } from './timecard-ui.module';

@NgModule({
  declarations: [
    TimeCardComponent
  ],
  imports: [
    TimeCardUiModule,
    TimeCardRoutingModule
  ]
})
export class TimeCardModule { }
