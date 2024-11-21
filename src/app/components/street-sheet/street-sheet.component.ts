import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as L from 'leaflet';
import { StreetSheet } from '../../models/street-sheet.model';
import { StreetSheetModalComponent } from '../modals/street-sheet-modal/street-sheet-modal.component';

@Component({
  selector: 'app-street-sheet',
  templateUrl: './street-sheet.component.html',
  styleUrl: './street-sheet.component.scss'
})
  export class StreetSheetComponent {
    constructor(private dialog: MatDialog) {}

  openEntryFormModal() {
    this.dialog.open(StreetSheetModalComponent, {
      width: '600px',
      data: {  }
    });
  }
}
