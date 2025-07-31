import { Component } from '@angular/core';
import { MarketControllerEntry } from 'src/app/models/market-controller-entry.model';

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

  showModal = false;
  activeType: Category | null = null;

  openModal(cat: Category) {
    this.activeType = cat;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  addEntry(entry: MarketControllerEntry) {
    if (this.activeType) {
      this.entries[this.activeType.key].push(entry);
    }
    this.closeModal();
  }

  removeEntry(type: keyof EntryMap, idx: number) {
    this.entries[type].splice(idx, 1);
  }
}
