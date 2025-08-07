import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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

interface Category {
  key: keyof EntryMap;
  label: string;
}

@Component({
  selector: 'app-market-controller',
  templateUrl: './market-controller.component.html',
  styleUrls: ['./market-controller.component.scss']
})
export class MarketControllerComponent {
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

  entries: EntryMap = {
    poco: [],
    newPo: [],
    closePo: [],
    budgetUpdate: [],
    contractUpdate: [],
    poScrub: [],
    invoiceScrub: [],
    directedWork: []
  };

  constructor(private dialog: MatDialog, private toastr: ToastrService) {}

  openModal(cat: Category): void {
    const dialogRef = this.dialog.open(MarketControllerModalComponent, {
      width: '500px',
      data: { type: cat.key, entry: null }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.entries[cat.key].push(result);
      }
    });
  }

  editEntry(cat: Category, index: number): void {
    const dialogRef = this.dialog.open(MarketControllerModalComponent, {
      width: '500px',
      data: { type: cat.key, entry: { ...this.entries[cat.key][index] } }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.entries[cat.key][index] = result;
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
    this.entries[catKey].splice(index, 1);
    this.toastr.success('Entry deleted');
  }

  getColumnsForCategory(catKey: keyof EntryMap): string[] {
    switch (catKey) {
      case 'poco':
        return ['poNumber', 'vendor', 'segmentReason', 'date', 'amount', 'notes', 'actions'];
      case 'newPo':
        return ['poNumber', 'vendor', 'date', 'amount', 'notes', 'actions'];
      case 'closePo':
        return ['poNumber', 'vendor', 'date', 'notes', 'actions'];
      case 'budgetUpdate':
        return ['date', 'notes', 'actions'];
      case 'contractUpdate':
        return ['date', 'notes', 'actions'];
      case 'directedWork':
        return ['date', 'notes', 'actions'];
      case 'poScrub':
        return ['poNumber', 'date', 'notes', 'actions'];
      case 'invoiceScrub':
        return ['poNumber', 'segmentReason', 'date', 'notes', 'actions'];
      default:
        return ['date', 'notes', 'actions'];
    }
  }

  getColumnLabel(column: string): string {
  switch (column) {
    case 'poNumber': return 'PO Number';
    case 'segmentReason': return 'Segment / Reason';
    case 'date': return 'Date';
    case 'amount': return 'Amount';
    case 'notes': return 'Notes';
    case 'vendor': return 'Vendor';
    case 'actions': return '';
    default: return column.charAt(0).toUpperCase() + column.slice(1);
  }
}
}
