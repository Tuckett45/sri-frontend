import { Component, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as Papa from 'papaparse';
import { MatDialog } from '@angular/material/dialog';
// import { TpsService } from 'src/app/services/tps.service'; // Assuming you have a service for handling data upload

@Component({
  selector: 'app-tps',
  templateUrl: './tps-home-page.component.html',
  styleUrls: ['./tps-home-page.component.scss']
})
export class TpsComponent {
  csvData: any[] = [];
  displayedColumns: string[] = ['Month', 'SegmentCount', 'EngCosts', 'PermitCosts', 'MaterialCosts']; // Adjust columns as needed
  tpsForm: FormGroup;

  @ViewChild('manualEntryModal') manualEntryModal: TemplateRef<any> | undefined;

//   private tpsService: TpsService
  constructor(private fb: FormBuilder, private dialog: MatDialog) {
    this.tpsForm = this.fb.group({
      month: ['', Validators.required],
      segmentCount: ['', Validators.required],
      engCosts: ['', Validators.required],
      permitCosts: ['', Validators.required],
      materialCosts: ['', Validators.required]
    });
  }

  // Method to handle CSV file change (upload and parse CSV)
  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          this.csvData = result.data;
        },
        header: true, // Assuming the first row contains headers
        skipEmptyLines: true,
      });
    }
  }

  // Method to handle submission of parsed CSV data
  processFile(): void {
    // this.tpsService.uploadCsvData(this.csvData).subscribe(response => {
    //   console.log('CSV data uploaded successfully', response);
    // });
  }

  // Method to open the manual entry modal
  openManualEntryModal(): void {
    // this.dialog.open(this.manualEntryModal);
  }

  // Submit manual form data
  submitForm(): void {
    // if (this.tpsForm.valid) {
    //   const formData = this.tpsForm.value;
    //   this.tpsService.submitManualEntry(formData).subscribe(response => {
    //     console.log('Entry submitted successfully', response);
    //     this.tpsForm.reset(); // Reset form after submission
    //   });
    // }
  }
}
