import { Component, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as Papa from 'papaparse';
import { MatDialog } from '@angular/material/dialog';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';
// import { TpsService } from 'src/app/services/tps.service'; // Assuming you have a service for handling data upload

@Component({
  selector: 'tps-summary',
  templateUrl: './tps-summary.component.html',
  styleUrls: ['./tps-summary.component.scss']
})
export class TpsSummaryComponent {
  csvData: any[] = [];
  displayedColumns: string[] = ['Month', 'SegmentCount', 'EngCosts', 'PermitCosts', 'MaterialCosts']; // Adjust columns as needed
  tpsForm: FormGroup;
  userRole: string = ''; // Store the user role here
  activeTab: number = 0;
  user!: User;

  @ViewChild('manualEntryModal') manualEntryModal: TemplateRef<any> | undefined;

//   private tpsService: TpsService
  constructor(private fb: FormBuilder, 
              private dialog: MatDialog, 
              private authService: AuthService) {
    this.tpsForm = this.fb.group({
      month: ['', Validators.required],
      segmentCount: ['', Validators.required],
      engCosts: ['', Validators.required],
      permitCosts: ['', Validators.required],
      materialCosts: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.userRole = this.authService.getUserRole(); 
    this.user = this.authService.getUser();
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
    // const dialogRef = this.dialog.open({
    //     width: '400px'
    //   });
  
    //   dialogRef.afterClosed().subscribe(result => {
    //     if (result) {
    //     //   this.profileData = result;
    //     }
    //   });
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
