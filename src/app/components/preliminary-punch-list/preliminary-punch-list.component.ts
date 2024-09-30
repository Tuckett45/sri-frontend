import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreliminaryPunchListModalComponent } from './preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';


@Component({
  selector: 'app-preliminary-punch-list',
  templateUrl: './preliminary-punch-list.component.html',
  styleUrls: ['./preliminary-punch-list.component.scss']
})
export class PreliminaryPunchListComponent {
  // Array to store issue reports
  preliminaryPunchList: PreliminaryPunchList[] = [];

  // Table column headers
  displayedColumns: string[] = ['segmentId', 'streetAddress', 'city', 'state', 'vaultIssues', 'dbIssues', 'trenchIssues', 'siteCleanUp', 'sidewalkPanels', 'sealantIssues', 'additionalConcerns', 'notifiedTo', 'notifiedHow', 'dateReported', 'issueImage', 'pmResolved', 'cmResolved', 'resolvedDate', 'actions'];

  constructor(private dialog: MatDialog) { }

  // Open modal to add a new entry
  openModal(): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Add the result (new issue report) to the preliminaryPunchList array
        this.preliminaryPunchList.push(result);
      }
    });
  }

  // Method to remove a report (for simplicity)
  removeReport(index: number): void {
    this.preliminaryPunchList.splice(index, 1);
  }
}