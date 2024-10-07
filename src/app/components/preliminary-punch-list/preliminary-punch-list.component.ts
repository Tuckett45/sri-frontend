import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreliminaryPunchListModalComponent } from './preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';

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
    'segmentId', 'vendorName','streetAddress', 'city', 'state', 'issues',
    'additionalConcerns', 'dateReported',
    'issueImage', 'pmResolved', 'resolutionImage', 'dateResolved', 'cmResolved', 'actions'
  ];

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource<PreliminaryPunchList>();

  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.preliminaryPunchList$ = this.punchListService.getEntries();
  }

  ngOnInit(): void {
    this.preliminaryPunchList$.subscribe(data => {
      this.dataSource.data = data;
    });
  }

  // Open modal to add a new entry
  openModal(data?: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: data || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (data) {
          // Update an existing entry (edit mode)
          this.punchListService.updateEntry(result);
        } else {
          // Add a new entry (add mode)
          this.punchListService.addEntry(result);
        }
        // Update the data source after changes
        this.punchListService.getEntries().subscribe(entries => {
          this.dataSource.data = entries;
          this.changeDetectorRef.detectChanges();
        });
      }
    });
  }

  // Open modal to edit an existing entry
  editReport(report: PreliminaryPunchList): void {
    this.openModal(report);
  }

  // Method to remove a report
  removeReport(report: PreliminaryPunchList): void {
    this.punchListService.removeEntry(report.segmentId);
  }

  // Convert image file to object URL for display in the table
  getImageUrl(file: string | null): string {
    return file ? URL.createObjectURL(file as any) : '';
  }

  // Filter the data source based on user input
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}