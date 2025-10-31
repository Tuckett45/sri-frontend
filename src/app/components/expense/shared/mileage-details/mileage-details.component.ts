import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MileageDetail } from 'src/app/models/expense.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-mileage-details',
  templateUrl: './mileage-details.component.html',
  styleUrls: ['./mileage-details.component.scss'],
  standalone: false
})
export class MileageDetailsComponent implements OnInit {
  @Input() mileageEntries: MileageDetail[] = [];
  @Input() expenseId: string = '';
  @Output() mileageChanged = new EventEmitter<MileageDetail[]>();

  mileageForm!: FormGroup;
  isEditing = false;
  editingIndex: number | null = null;
  displayedColumns: string[] = ['date', 'from', 'to', 'reason', 'beginning', 'ending', 'total', 'actions'];

  reasonOptions: string[] = [
    'Customer Visit',
    'Job Site',
    'Office',
    'Airport',
    'Home',
    'Meeting',
    'Training',
    'Other'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.mileageForm = this.fb.group({
      date: ['', Validators.required],
      customerJobNumber: [''],
      fromLocation: ['', Validators.required],
      toLocation: ['', Validators.required],
      reasonForTravel: ['', Validators.required],
      beginningMileage: [0, [Validators.required, Validators.min(0)]],
      endingMileage: [0, [Validators.required, Validators.min(0)]]
    });

    // Auto-calculate total miles when odometer values change
    this.mileageForm.get('beginningMileage')?.valueChanges.subscribe(() => {
      this.calculateTotalMiles();
    });
    this.mileageForm.get('endingMileage')?.valueChanges.subscribe(() => {
      this.calculateTotalMiles();
    });
  }

  calculateTotalMiles(): number {
    const beginning = this.mileageForm.get('beginningMileage')?.value || 0;
    const ending = this.mileageForm.get('endingMileage')?.value || 0;
    return Math.max(0, ending - beginning);
  }

  addEntry(): void {
    this.isEditing = true;
    this.editingIndex = null;
    this.mileageForm.reset({
      date: '',
      customerJobNumber: '',
      fromLocation: '',
      toLocation: '',
      reasonForTravel: '',
      beginningMileage: 0,
      endingMileage: 0
    });
  }

  editEntry(index: number): void {
    this.isEditing = true;
    this.editingIndex = index;
    const entry = this.mileageEntries[index];
    
    this.mileageForm.patchValue({
      date: entry.date,
      customerJobNumber: entry.customerJobNumber || '',
      fromLocation: entry.fromLocation,
      toLocation: entry.toLocation,
      reasonForTravel: entry.reasonForTravel,
      beginningMileage: entry.beginningMileage,
      endingMileage: entry.endingMileage
    });
  }

  saveEntry(): void {
    if (this.mileageForm.invalid) {
      this.mileageForm.markAllAsTouched();
      return;
    }

    const totalMiles = this.calculateTotalMiles();
    
    // Validate that ending mileage >= beginning mileage
    if (totalMiles < 0) {
      this.mileageForm.get('endingMileage')?.setErrors({ 'invalidMileage': true });
      return;
    }

    const newEntry: MileageDetail = {
      id: this.editingIndex !== null ? this.mileageEntries[this.editingIndex].id : uuidv4(),
      expenseId: this.expenseId,
      date: this.mileageForm.value.date,
      customerJobNumber: this.mileageForm.value.customerJobNumber || undefined,
      fromLocation: this.mileageForm.value.fromLocation,
      toLocation: this.mileageForm.value.toLocation,
      reasonForTravel: this.mileageForm.value.reasonForTravel,
      beginningMileage: this.mileageForm.value.beginningMileage,
      endingMileage: this.mileageForm.value.endingMileage,
      totalMiles: totalMiles
    };

    if (this.editingIndex !== null) {
      // Update existing entry
      this.mileageEntries[this.editingIndex] = newEntry;
    } else {
      // Add new entry
      this.mileageEntries.push(newEntry);
    }

    this.mileageChanged.emit([...this.mileageEntries]);
    this.cancelEdit();
  }

  deleteEntry(index: number): void {
    if (confirm('Are you sure you want to delete this mileage entry?')) {
      this.mileageEntries.splice(index, 1);
      this.mileageChanged.emit([...this.mileageEntries]);
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingIndex = null;
    this.mileageForm.reset();
  }

  getTotalMiles(): number {
    return this.mileageEntries.reduce((sum, entry) => sum + entry.totalMiles, 0);
  }

  hasError(fieldName: string, errorType?: string): boolean {
    const field = this.mileageForm.get(fieldName);
    if (!field) return false;

    if (errorType) {
      return field.hasError(errorType) && (field.dirty || field.touched);
    }
    return field.invalid && (field.dirty || field.touched);
  }
}

