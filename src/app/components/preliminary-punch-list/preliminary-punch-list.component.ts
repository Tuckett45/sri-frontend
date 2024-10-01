import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreliminaryPunchListModalComponent } from './preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-preliminary-punch-list',
  templateUrl: './preliminary-punch-list.component.html',
  styleUrls: ['./preliminary-punch-list.component.scss']
})
export class PreliminaryPunchListComponent implements OnInit {
  // Observable for punch list entries
  preliminaryPunchList$: Observable<PreliminaryPunchList[]>;

  // Table column headers
  displayedColumns: string[] = [
    'segmentId', 'streetAddress', 'city', 'state', 'vaultIssues', 'dbIssues',
    'trenchIssues', 'siteCleanUp', 'sidewalkPanels', 'sealantIssues',
    'additionalConcerns', 'notifiedTo', 'notifiedHow', 'dateReported',
    'issueImage', 'pmResolved', 'cmResolved', 'actions'
  ];

  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService
  ) {
    this.preliminaryPunchList$ = this.punchListService.getEntries();
  }

  ngOnInit(): void {}

  // Open modal to add a new entry
  openModal(): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: {}
    });

    dialogRef.afterClosed().subscribe((result: PreliminaryPunchList | undefined) => {
      if (result) {
        // Add the result to the shared punch list service
        this.punchListService.addEntry(result);
      }
    });
  }

  // Method to remove a report
  removeReport(index: number): void {
    this.punchListService.removeEntry(index);
  }

  // Convert image file to object URL for display in the table
  getImageUrl(file: File): string {
    return URL.createObjectURL(file);
  }
}