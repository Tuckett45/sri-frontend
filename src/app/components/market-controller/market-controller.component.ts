import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MarketControllerModalComponent } from '../modals/market-controller-modal/market-controller-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';

export interface PocoEntry {
  poNumber: string;
  vendor: string;
  segmentReason: string;
  date: Date;
  amount: number;
  notes: string;
}

export interface NewPoEntry {
  poNumber: string;
  vendor: string;
  date: Date;
  amount: number;
  notes: string;
}

export interface ClosePoEntry {
  poNumber: string;
  vendor: string;
  date: Date;
  notes: string;
}

export interface BudgetUpdateEntry {
  date: Date;
  notes: string;
}

export interface ContractUpdateEntry {
  date: Date;
  notes: string;
}

export interface PoScrubEntry {
  poNumber: string;
  date: Date;
  notes: string;
}

export interface InvoiceScrubEntry {
  poNumber: string;
  segmentReason: string;
  date: Date;
  notes: string;
}

export interface DirectedWorkEntry {
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
export class MarketControllerComponent implements AfterViewInit {
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

  constructor(private dialog: MatDialog, private toastr: ToastrService) {}

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
        const data = this.dataSources[cat.key].data;
        this.dataSources[cat.key].data = [...data, result];
        this.updateAllEntries();
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
        const data = this.dataSources[cat.key].data;
        data[index] = result;
        this.dataSources[cat.key].data = [...data];
        this.updateAllEntries();
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
    const data = this.dataSources[catKey].data;
    data.splice(index, 1);
    this.dataSources[catKey].data = [...data];
    this.toastr.success('Entry deleted');
    this.updateAllEntries();
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
