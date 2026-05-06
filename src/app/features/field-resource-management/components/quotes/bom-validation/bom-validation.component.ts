import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BomRejectionDialogComponent } from './bom-rejection-dialog.component';

@Component({
  selector: 'app-bom-validation',
  templateUrl: './bom-validation.component.html',
  styleUrls: ['./bom-validation.component.scss']
})
export class BomValidationComponent {
  bomItems: any[] = [
    { name: 'Cat6 Cable (1000ft)', qty: 2, unitCost: 85, total: 170 },
    { name: 'Patch Panel 48-port', qty: 1, unitCost: 220, total: 220 }
  ];
  status: 'pending' | 'approved' | 'rejected' = 'pending';
  rejectionReason = '';
  displayedColumns = ['name', 'qty', 'unitCost', 'total'];

  get grandTotal(): number {
    return this.bomItems.reduce((sum, item) => sum + item.total, 0);
  }

  constructor(private dialog: MatDialog) {}

  approve(): void {
    this.status = 'approved';
  }

  openRejectionDialog(): void {
    const ref = this.dialog.open(BomRejectionDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe(reason => {
      if (reason) {
        this.status = 'rejected';
        this.rejectionReason = reason;
      }
    });
  }
}
