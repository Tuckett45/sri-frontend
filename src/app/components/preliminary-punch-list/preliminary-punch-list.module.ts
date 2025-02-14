import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreliminaryPunchListComponent } from './preliminary-punch-list.component';
import { PreliminaryPunchListRoutingModule } from './preliminary-punch-list-routing.module';  // Use your routing module for the child routes
import { MatPaginatorModule } from '@angular/material/paginator';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogContent, MatDialogActions, MatDialogTitle } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSortModule } from '@angular/material/sort';
import { GalleriaModule } from 'primeng/galleria';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TabsModule } from 'primeng/tabs'
import { PreliminaryPunchListUnresolvedComponent } from './preliminary-punch-list-unresolved/preliminary-punch-list-unresolved.component';
import { PreliminaryPunchListResolvedComponent } from './preliminary-punch-list-resolved/preliminary-punch-list-resolved.component';

@NgModule({
  declarations: [
    PreliminaryPunchListComponent,
    PreliminaryPunchListUnresolvedComponent,
    PreliminaryPunchListResolvedComponent
  ],
  imports: [
    CommonModule,
    PreliminaryPunchListRoutingModule,
    FormsModule,
    ButtonModule,
    ChipModule,
    DialogModule,
    DropdownModule,
    GalleriaModule,
    ReactiveFormsModule,
    TabsModule,
    MatAutocompleteModule,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatGridListModule,
    MatDialogContent,
    MatDialogActions,
    MatDialogTitle,
    MatCheckboxModule,
    MatPaginatorModule,
    MatSortModule
  ],
  exports: [PreliminaryPunchListComponent]
})
export class PreliminaryPunchListModule { }
