import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-purchase-order-dialog',
  templateUrl: './purchase-order-dialog.component.html',
  styleUrls: ['./purchase-order-dialog.component.scss']
})
export class PurchaseOrderDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  poForm!: FormGroup;

  suppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Other'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PurchaseOrderDialogComponent>
  ) {}

  ngOnInit(): void {
    this.poForm = this.fb.group({
      supplier: ['', Validators.required],
      deliveryDate: [null, Validators.required],
      notes: [''],
      items: this.fb.array([this.createItemRow()])
    });
  }

  get items(): FormArray {
    return this.poForm.get('items') as FormArray;
  }

  createItemRow(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitCost: [0, [Validators.required, Validators.min(0)]]
    });
  }

  addItem(): void {
    this.items.push(this.createItemRow());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  get totalCost(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      return sum + (ctrl.get('quantity')?.value || 0) * (ctrl.get('unitCost')?.value || 0);
    }, 0);
  }

  onSubmit(): void {
    if (this.poForm.valid) {
      this.dialogRef.close(this.poForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
