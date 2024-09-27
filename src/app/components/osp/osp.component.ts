import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-osp',
  templateUrl: './osp.component.html',
  styleUrls: ['./osp.component.scss']
})
export class OSPComponent {
  // Data source for the table
  dataSource: any[] = [
    { id: 1, name: 'Entry 1', description: 'Description for Entry 1' },
    { id: 2, name: 'Entry 2', description: 'Description for Entry 2' }
  ];
  
  displayedColumns: string[] = ['id', 'name', 'description'];

  // Form for the modal
  entryForm: FormGroup;

  // Reference to the modal
  @ViewChild('addEntryModal') addEntryModal!: TemplateRef<any>;
  dialogRef!: MatDialogRef<any>;

  constructor(private dialog: MatDialog, private fb: FormBuilder ) {
    // Initialize the form with controls
    this.entryForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  // Open the modal
  openAddEntryModal(): void {
    this.dialogRef = this.dialog.open(this.addEntryModal);
  }

  // Close the modal
  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  // Save the new entry
  saveEntry(): void {
    if (this.entryForm.valid) {
      debugger;
      const newEntry = {
        id: this.dataSource.length + 1,  // Generate a new ID
        name: this.entryForm.get('name')?.value,
        description: this.entryForm.get('description')?.value
      };

      // Add the new entry to the dataSource
      this.dataSource.push(newEntry);
      
      // Reset the form
      this.entryForm.reset();
      
      // Close the modal
      this.closeModal();
    }
  }
}