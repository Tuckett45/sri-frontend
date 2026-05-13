import { Component, Inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  Material,
  Supplier,
  ReorderRecommendation,
  CreatePurchaseOrderDto,
  PurchaseOrderItemDto
} from '../../../models/material.model';

export interface PurchaseOrderDialogData {
  recommendation: ReorderRecommendation | null;
  materials$: Observable<Material[]>;
  suppliers$: Observable<Supplier[]>;
}

@Component({
  selector: 'app-purchase-order-dialog',
  templateUrl: './purchase-order-dialog.component.html',
  styleUrls: ['./purchase-order-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseOrderDialogComponent implements OnInit, OnDestroy {
  purchaseOrderForm: FormGroup;
  materials: Material[] = [];
  suppliers: Supplier[] = [];
  selectedSupplier: Supplier | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<PurchaseOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseOrderDialogData,
    private fb: FormBuilder
  ) {
    this.purchaseOrderForm = this.fb.group({
      supplierId: ['', Validators.required],
      expectedDeliveryDate: [null],
      items: this.fb.array([], Validators.minLength(1))
    });
  }

  ngOnInit(): void {
    this.data.materials$.pipe(takeUntil(this.destroy$)).subscribe(m => this.materials = m);
    this.data.suppliers$.pipe(takeUntil(this.destroy$)).subscribe(s => this.suppliers = s);

    // Pre-populate from recommendation if provided
    if (this.data.recommendation) {
      const rec = this.data.recommendation;
      this.purchaseOrderForm.patchValue({ supplierId: rec.supplierId });
      this.onSupplierChange(rec.supplierId);

      const material = this.materials.find(m => m.id === rec.materialId);
      this.addItem();
      const itemGroup = this.items.at(0) as FormGroup;
      itemGroup.patchValue({
        materialId: rec.materialId,
        quantity: rec.recommendedQuantity,
        unitCost: material ? material.unitCost : 0
      });
    }

    // Update selected supplier when supplier changes
    this.purchaseOrderForm.get('supplierId')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(id => this.onSupplierChange(id));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get items(): FormArray {
    return this.purchaseOrderForm.get('items') as FormArray;
  }

  get totalCost(): number {
    return this.items.controls.reduce((total, control) => {
      const qty = control.get('quantity')?.value || 0;
      const cost = control.get('unitCost')?.value || 0;
      return total + (qty * cost);
    }, 0);
  }

  get expectedDeliveryDisplay(): string | null {
    if (!this.selectedSupplier) return null;
    const date = new Date();
    date.setDate(date.getDate() + this.selectedSupplier.leadTimeDays);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  onSupplierChange(supplierId: string): void {
    this.selectedSupplier = this.suppliers.find(s => s.id === supplierId) || null;
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      materialId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitCost: [0, [Validators.required, Validators.min(0)]]
    });
    this.items.push(itemGroup);
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  onMaterialSelected(index: number, materialId: string): void {
    const material = this.materials.find(m => m.id === materialId);
    if (material) {
      const itemGroup = this.items.at(index) as FormGroup;
      itemGroup.patchValue({ unitCost: material.unitCost });
    }
  }

  getMaterialName(materialId: string): string {
    const material = this.materials.find(m => m.id === materialId);
    return material ? material.name : '';
  }

  getItemTotal(index: number): number {
    const item = this.items.at(index);
    const qty = item.get('quantity')?.value || 0;
    const cost = item.get('unitCost')?.value || 0;
    return qty * cost;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  submit(): void {
    if (this.purchaseOrderForm.valid && this.items.length > 0) {
      const formValue = this.purchaseOrderForm.value;
      const dto: CreatePurchaseOrderDto = {
        supplierId: formValue.supplierId,
        items: formValue.items.map((item: any): PurchaseOrderItemDto => ({
          materialId: item.materialId,
          quantity: item.quantity,
          unitCost: item.unitCost
        })),
        expectedDeliveryDate: formValue.expectedDeliveryDate || undefined
      };
      this.dialogRef.close(dto);
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
