import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MarketControllerModalComponent } from '../modals/market-controller-modal/market-controller-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { MarketControllerService } from '../../services/market-controller.service';
import { MarketControllerEntry } from '../../models/market-controller-entry.model';

@Component({
  selector: 'app-market-controller',
  templateUrl: './market-controller.component.html',
  styleUrls: ['./market-controller.component.scss']
})
export class MarketControllerComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'type',
    'poNumber',
    'vendor',
    'segmentReason',
    'date',
    'amount',
    'notes',
    'actions'
  ];

  dataSource = new MatTableDataSource<MarketControllerEntry>([]);

  constructor(
    private dialog: MatDialog,
    private toastr: ToastrService,
    private marketControllerService: MarketControllerService
  ) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  private loadEntries(): void {
    this.marketControllerService.getEntries().subscribe(entries => {
      this.dataSource.data = entries.map(e => ({
        ...e,
        date: e.date ? new Date(e.date) : undefined,
        createdDate: e.createdDate ? new Date(e.createdDate) : undefined,
        updatedDate: e.updatedDate ? new Date(e.updatedDate) : undefined
      }));
    }, () => this.toastr.error('Failed to load entries'));
  }

  openModal(entry?: MarketControllerEntry): void {
    const dialogRef = this.dialog.open(MarketControllerModalComponent, {
      width: '500px',
      data: { entry: entry ? { ...entry } : null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (entry && entry.id) {
          const payload: MarketControllerEntry = { id: entry.id, ...result };
          this.marketControllerService.updateEntry(payload).subscribe(() => {
            const index = this.dataSource.data.findIndex(e => e.id === entry.id);
            if (index > -1) {
              this.dataSource.data[index] = { ...payload };
              this.dataSource._updateChangeSubscription();
            }
            this.toastr.success('Entry updated');
          }, () => this.toastr.error('Failed to update entry'));
        } else {
          const payload: MarketControllerEntry = { ...result };
          this.marketControllerService.addEntry(payload).subscribe(saved => {
            const formatted = {
              ...saved,
              date: saved.date ? new Date(saved.date) : undefined,
              createdDate: saved.createdDate ? new Date(saved.createdDate) : undefined,
              updatedDate: saved.updatedDate ? new Date(saved.updatedDate) : undefined
            };
            this.dataSource.data = [...this.dataSource.data, formatted];
            this.toastr.success('Entry added');
          }, () => this.toastr.error('Failed to add entry'));
        }
      }
    });
  }

  openDeleteConfirmationDialog(entry: MarketControllerEntry): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removeEntry(entry);
      }
    });
  }

  removeEntry(entry: MarketControllerEntry): void {
    if (!entry.id) {
      return;
    }
    this.marketControllerService.deleteEntry(entry.id).subscribe(() => {
      this.dataSource.data = this.dataSource.data.filter(e => e.id !== entry.id);
      this.toastr.success('Entry deleted');
    }, () => this.toastr.error('Failed to delete entry'));
  }
}
