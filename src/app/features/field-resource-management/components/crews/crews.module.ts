import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedMaterialModule } from '../../shared-material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { CrewListComponent } from './crew-list/crew-list.component';
import { CrewFormComponent } from './crew-form/crew-form.component';
import { CrewDetailComponent } from './crew-detail/crew-detail.component';

const routes: Routes = [
  { path: '', component: CrewListComponent },
  { path: 'new', component: CrewFormComponent },
  { path: ':id', component: CrewDetailComponent },
  { path: ':id/edit', component: CrewFormComponent }
];

@NgModule({
  declarations: [CrewListComponent, CrewFormComponent, CrewDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    RouterModule.forChild(routes)
  ]
})
export class CrewsModule {}
