import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MarketControllerEntry } from 'src/app/models/market-controller-entry.model';
import { MarketControllerModalComponent } from '../modals/market-controller-modal/market-controller-modal.component';
import { ToastrService } from 'ngx-toastr';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';

interface Category {
  key: keyof EntryMap;
  label: string;
}

interface EntryMap {
  poco: MarketControllerEntry[];
  newPo: MarketControllerEntry[];
  closePo: MarketControllerEntry[];
  budgetUpdate: MarketControllerEntry[];
  contractUpdate: MarketControllerEntry[];
  poScrub: MarketControllerEntry[];
  invoiceScrub: MarketControllerEntry[];
  directedWork: MarketControllerEntry[];
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

  displayedColumns: string[] = [
    'poNumber',
    'vendor',
    'segmentReason',
    'date',
    'amount',
    'notes',
    'actions'
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

  constructor(
    private dialog: MatDialog, 
    private toastr: ToastrService
  ) {}

  openModal(cat: Category) {
    const dialogRef = this.dialog.open(MarketControllerModalComponent, {
      width: '500px',
      data: { type: cat.label, entry: null }
    });

    dialogRef.afterClosed().subscribe((result: MarketControllerEntry | null) => {
      if (result) {
        this.entries[cat.key].push(result);
      }
    });
  }

  editEntry(cat: Category, index: number) {
    const existingEntry = this.entries[cat.key][index];
    const dialogRef = this.dialog.open(MarketControllerModalComponent, {
      width: '500px',
      data: { type: cat.label, entry: { ...existingEntry } }
    });

    dialogRef.afterClosed().subscribe((result: MarketControllerEntry | null) => {
      if (result) {
        this.entries[cat.key][index] = result;
      }
    });
  }

  openDeleteConfirmationDialog(catKey: keyof EntryMap, index: number) {
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
}
