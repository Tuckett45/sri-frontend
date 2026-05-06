import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-inventory-manager',
  templateUrl: './inventory-manager.component.html',
  styleUrls: ['./inventory-manager.component.scss']
})
export class InventoryManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  items: any[] = [];
  displayedColumns = ['name', 'sku', 'quantity', 'location', 'assignedTo', 'actions'];
  searchQuery = '';
  selectedCategory = '';

  categories = ['Tools', 'Equipment', 'Parts', 'Consumables', 'Safety'];

  get filteredItems(): any[] {
    return this.items.filter(item => {
      const matchesSearch = !this.searchQuery ||
        item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = !this.selectedCategory || item.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }

  ngOnInit(): void {}

  addItem(): void {
    // Open add item dialog
  }

  assignItem(item: any): void {
    // Open assignment dialog
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
