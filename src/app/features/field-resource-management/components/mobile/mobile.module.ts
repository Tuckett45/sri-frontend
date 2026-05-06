import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedMaterialModule } from '../../shared-material.module';
import { MobileSharedModule } from './mobile-shared.module';
import { DailyViewComponent } from './daily-view/daily-view.component';
import { JobCardComponent } from './job-card/job-card.component';
import { JobCompletionFormComponent } from './job-completion-form/job-completion-form.component';

const routes: Routes = [
  { path: '', redirectTo: 'daily', pathMatch: 'full' },
  { path: 'daily', component: DailyViewComponent }
];

@NgModule({
  declarations: [DailyViewComponent, JobCardComponent, JobCompletionFormComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedMaterialModule, MobileSharedModule, RouterModule.forChild(routes)]
})
export class MobileModule {}
