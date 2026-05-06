import { Component } from '@angular/core';

interface BomItem {
  name: string;
  qty: number;
  unitCost: number;
  total: number;
}

@Component({
  selector: 'app-bom-builder',
  templateUrl: './bom-builder.component.html',
  styleUrls: ['./bom-builder.component.scss']
})
export class BomBuilderComponent {
  bomItems: BomItem[] = [
    { name: 'Cat6 Cable (1000ft)', qty: 2, unitCost: 85, total: 170 },
    { name: 'Patch Panel 48-port', qty: 1, unitCost: 220, total: 220 }
  ];
  displayedColumns = ['name', 'qty', 'unitCost', 'total', 'actions'];

  get grandTotal(): number {
    return this.bomItems.reduce((sum, item) => sum + item.total, 0);
  }

  addItem(): void {
    this.bomItems = [...this.bomItems, { name: 'New Item', qty: 1, unitCost: 0, total: 0 }];
  }

  removeItem(index: number): void {
    this.bomItems = this.bomItems.filter((_, i) => i !== index);
  }

  updateTotal(item: BomItem): void {
    item.total = item.qty * item.unitCost;
    this.bomItems = [...this.bomItems];
  }
}
