import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MarketControllerModalComponent } from '../modals/market-controller-modal/market-controller-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { MarketControllerService } from '../../services/market-controller.service';
import { MarketControllerEntry } from '../../models/market-controller-entry.model';
import { MatSort } from '@angular/material/sort';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-market-controller',
  templateUrl: './market-controller.component.html',
  styleUrls: ['./market-controller.component.scss']
})
export class MarketControllerComponent implements OnInit, AfterViewInit {
  user!: User;
  displayedColumns: string[] = [
    'type',
    'poNumber',
    'vendor',
    'market',
    'segmentReason',
    'date',
    'amount',
    'notes',
    'actions'
  ];
  private viewInitialized = false;
  private csvColumns: Array<keyof MarketControllerEntry | 'market' | 'type'> = [
  'type',
  'poNumber',
  'vendor',
  'market',
  'segmentReason',
  'date',
  'amount',
  'notes',
];
  dataSource = new MatTableDataSource<MarketControllerEntry>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    public authService: AuthService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private marketControllerService: MarketControllerService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadEntries();
  }

   ngAfterViewInit(): void {
    this.viewInitialized = true;
  }


  private loadEntries(): void {
  this.marketControllerService.getEntries().subscribe(entries => {
    this.dataSource = new MatTableDataSource(entries);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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

  exportCsv(): void {
  try {
    // Use filtered data (what the user currently sees after filter)
    let rows = [...this.dataSource.filteredData];

    // Apply sort if active (to match visual order)
    if (this.sort?.active && this.sort.direction) {
      const active = this.sort.active as keyof MarketControllerEntry | 'market' | 'type';
      const dir = this.sort.direction === 'asc' ? 1 : -1;
      rows.sort((a: any, b: any) => this.compareForSort(a?.[active], b?.[active]) * dir);
    }

    // Map rows to export columns
    const headers = this.csvColumns; // human labels can be substituted if needed
    const csvLines = [
      headers.map(h => this.escapeCsv(this.headerLabel(h))).join(','), // header row
      ...rows.map(r => headers.map(h => this.formatCell(h, r)).map(this.escapeCsv).join(','))
    ];

    // Prepend BOM for Excel compatibility
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const filename = `market-controller-${this.timestamp()}.csv`;
    this.downloadBlob(blob, filename);
    this.toastr.success('CSV exported');
  } catch {
    this.toastr.error('Failed to export CSV');
  }
}

private headerLabel(key: string): string {
  // Make headers friendly; customize as you like
  const map: Record<string, string> = {
    type: 'Type',
    poNumber: 'PO Number',
    vendor: 'Vendor',
    market: 'Market',
    segmentReason: 'Segment/Reason',
    date: 'Date',
    amount: 'Amount',
    notes: 'Notes'
  };
  return map[key] ?? key;
}

private formatCell(
  key: keyof MarketControllerEntry | 'market' | 'type',
  row: MarketControllerEntry
): string {
  const val: any = (row as any)[key];

  if (key === 'date') {
    // Accept Date or string; output YYYY-MM-DD
    const d = val ? new Date(val) : null;
    return d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
  }

  if (key === 'amount') {
    // Format as plain number (safe for CSV math) OR use currency string.
    // Return numeric to keep CSV formulas friendly; switch to localeString if you prefer.
    return typeof val === 'number' ? val.toFixed(2) : (val ?? '').toString();
  }

  // Default to string
  return (val ?? '').toString();
}

private escapeCsv(value: string): string {
  // Escape commas, quotes, and newlines per RFC 4180
  if (value == null) return '';
  const needsQuotes = /[",\r\n]/.test(value);
  let v = value.replace(/"/g, '""');
  return needsQuotes ? `"${v}"` : v;
}

private compareForSort(a: any, b: any): number {
  // Nulls last
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  // Dates
  const aDate = this.tryDate(a);
  const bDate = this.tryDate(b);
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();

  // Numbers
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNum = !isNaN(aNum) && a !== '';
  const bIsNum = !isNaN(bNum) && b !== '';
  if (aIsNum && bIsNum) return aNum - bNum;

  // String compare
  return a.toString().localeCompare(b.toString(), undefined, { numeric: true, sensitivity: 'base' });
}

private tryDate(v: any): Date | null {
  const d = v instanceof Date ? v : new Date(v);
  return d instanceof Date && !isNaN(d.getTime()) ? d : null;
}

private timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

private downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
}
