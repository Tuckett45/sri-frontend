import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface BatchOperation {
  type: 'updateStatus' | 'reassign' | 'delete';
  data?: any;
}

@Component({
  selector: 'app-batch-operations-toolbar',
  templateUrl: './batch-operations-toolbar.component.html',
  styleUrls: ['./batch-operations-toolbar.component.scss']
})
export class BatchOperationsToolbarComponent {
  @Input() selectedCount: number = 0;
  @Input() visible: boolean = false;
  
  @Output() clearSelection = new EventEmitter<void>();
  @Output() batchOperation = new EventEmitter<BatchOperation>();

  constructor(private dialog: MatDialog) {}

  onClearSelection(): void {
    this.clearSelection.emit();
  }

  onUpdateStatus(): void {
    // Open status selector dialog
    // For now, emit the operation type
    this.batchOperation.emit({ type: 'updateStatus' });
  }

  onReassign(): void {
    // Open technician selector dialog
    // For now, emit the operation type
    this.batchOperation.emit({ type: 'reassign' });
  }

  onDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Jobs',
        message: `Are you sure you want to delete ${this.selectedCount} selected job(s)? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.batchOperation.emit({ type: 'delete' });
      }
    });
  }
}
