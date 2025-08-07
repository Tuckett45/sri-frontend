import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MarketControllerModalComponent } from '../modals/market-controller-modal/market-controller-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { MarketControllerService } from '../../services/market-controller.service';
import { MarketControllerEntry } from '../../models/market-controller-entry.model';

export interface PocoEntry {
  id?: string;
  poNumber: string;
  vendor: string;
  segmentReason: string;
  date: Date;
  amount: number;
  notes: string;
}

export interface NewPoEntry {
  id?: string;
  poNumber: string;
  vendor: string;
  date: Date;
  amount: number;
  notes: string;
}

export interface ClosePoEntry {
  id?: string;
  poNumber: string;
  vendor: string;
  date: Date;
  notes: string;
}

export interface BudgetUpdateEntry {
  id?: string;
  date: Date;
  notes: string;
}

export interface ContractUpdateEntry {
  id?: string;
  date: Date;
  notes: string;
}

export interface PoScrubEntry {
  id?: string;
  poNumber: string;
  date: Date;
  notes: string;
}

export interface InvoiceScrubEntry {
  id?: string;
  poNumber: string;
  segmentReason: string;
  date: Date;
  notes: string;
}

export interface DirectedWorkEntry {
  id?: string;
  date: Date;
  notes: string;
}

interface EntryMap {
  poco: PocoEntry[];
  newPo: NewPoEntry[];
  closePo: ClosePoEntry[];
  budgetUpdate: BudgetUpdateEntry[];
  contractUpdate: ContractUpdateEntry[];
  poScrub: PoScrubEntry[];
  invoiceScrub: InvoiceScrubEntry[];
  directedWork: DirectedWorkEntry[];
}

interface DataSourceMap {
  poco: MatTableDataSource<PocoEntry>;
  newPo: MatTableDataSource<NewPoEntry>;
  closePo: MatTableDataSource<ClosePoEntry>;
  budgetUpdate: MatTableDataSource<BudgetUpdateEntry>;
  contractUpdate: MatTableDataSource<ContractUpdateEntry>;
  poScrub: MatTableDataSource<PoScrubEntry>;
  invoiceScrub: MatTableDataSource<InvoiceScrubEntry>;
  directedWork: MatTableDataSource<DirectedWorkEntry>;
}

interface Category {
  key: keyof EntryMap;
  label: string;
}

interface UnifiedEntry {
  id?: string;
  type: string;
  catKey: keyof EntryMap;
  index: number;
  poNumber?: string;
  vendor?: string;
  segmentReason?: string;
  date?: Date;
  amount?: number;
  notes?: string;
}

@Component({
  selector: 'app-market-controller',
  templateUrl: './market-controller.component.html',
  styleUrls: ['./market-controller.component.scss']
})
export class MarketControllerComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  categories: Category[] = [
    { key: 'poco', label: 'POCO' },
    { key: 'newPo', label: 'New PO' },
    { key: 'closePo', label: 'Close PO' },
    { key: 'budgetUpdate', label: 'Budget Update' },
    { key: 'contractUpdate', label: 'Contract Update' },
    { key: 'poScrub', label: 'PO Scrub' },
    { key: 'invoiceScrub', label: 'Invoice Scrub' },
    { key: 'directedWork', label: 'Directed Work' }
  ];

  dataSources: DataSourceMap = {
    poco: new MatTableDataSource<PocoEntry>([]),
    newPo: new MatTableDataSource<NewPoEntry>([]),
    closePo: new MatTableDataSource<ClosePoEntry>([]),
    budgetUpdate: new MatTableDataSource<BudgetUpdateEntry>([]),
    contractUpdate: new MatTableDataSource<ContractUpdateEntry>([]),
    poScrub: new MatTableDataSource<PoScrubEntry>([]),
    invoiceScrub: new MatTableDataSource<InvoiceScrubEntry>([]),
    directedWork: new MatTableDataSource<DirectedWorkEntry>([])
  };

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

  allDataSource = new MatTableDataSource<UnifiedEntry>([]);

  constructor(
    private dialog: MatDialog,
    private toastr: ToastrService,
    private marketControllerService: MarketControllerService
  ) {}

  ngOnInit(): void {
    this.marketControllerService.getEntries().subscribe(entries => {
      entries.forEach(entry => {
        const catKey = entry.type as keyof EntryMap;
        if (this.dataSources[catKey]) {
          const formatted: any = {
            ...entry,
            date: entry.date ? new Date(entry.date) : undefined
          };
          this.dataSources[catKey].data = [
            ...this.dataSources[catKey].data,
            formatted
          ];
        }
      });
      this.updateAllEntries();
    }, () => this.toastr.error('Failed to load entries'));
  }

  ngAfterViewInit(): void {
    this.allDataSource.paginator = this.paginator;
  }

  openModal(cat: Category): void {
    const dialogRef = this.dialog.open(MarketControllerModalComponent, {
      width: '500px',
      data: { type: cat.key, entry: null }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const payload: MarketControllerEntry = { ...result, type: cat.key };
        this.marketControllerService.addEntry(payload).subscribe(saved => {
          const data = this.dataSources[cat.key].data;
          const formatted: any = {
            ...saved,
            date: saved.date ? new Date(saved.date) : undefined
          };
          this.dataSources[cat.key].data = [...data, formatted];
          this.updateAllEntries();
          this.toastr.success('Entry added');
        }, () => this.toastr.error('Failed to add entry'));
      }
    });
  }

  editEntry(cat: Category, index: number): void {
    const dialogRef = this.dialog.open(MarketControllerModalComponent, {
      width: '500px',
      data: { type: cat.key, entry: { ...this.dataSources[cat.key].data[index] } }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const current: any = this.dataSources[cat.key].data[index];
        const payload: MarketControllerEntry = { ...current, ...result, type: cat.key };
        this.marketControllerService.updateEntry(payload).subscribe(() => {
          const data = this.dataSources[cat.key].data;
          data[index] = payload as any;
          this.dataSources[cat.key].data = [...data];
          this.updateAllEntries();
          this.toastr.success('Entry updated');
        }, () => this.toastr.error('Failed to update entry'));
      }
    });
  }

  openDeleteConfirmationDialog(catKey: keyof EntryMap, index: number): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removeEntry(catKey, index);
      }
    });
  }

  removeEntry(catKey: keyof EntryMap, index: number): void {
    const entry: any = this.dataSources[catKey].data[index];
    this.marketControllerService.deleteEntry(entry.id).subscribe(() => {
      const data = this.dataSources[catKey].data;
      data.splice(index, 1);
      this.dataSources[catKey].data = [...data];
      this.toastr.success('Entry deleted');
      this.updateAllEntries();
    }, () => this.toastr.error('Failed to delete entry'));
  }

  private updateAllEntries(): void {
    const all: UnifiedEntry[] = [];
    this.categories.forEach(cat => {
      this.dataSources[cat.key].data.forEach((entry, index) => {
        all.push({ ...entry, type: cat.label, catKey: cat.key, index });
      });
    });
    this.allDataSource.data = all;
  }

  editUnifiedEntry(entry: UnifiedEntry): void {
    const cat = this.categories.find(c => c.key === entry.catKey)!;
    this.editEntry(cat, entry.index);
  }

  removeUnifiedEntry(entry: UnifiedEntry): void {
    this.openDeleteConfirmationDialog(entry.catKey, entry.index);
  }
}
