import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-street-sheet-modal',
  templateUrl: './street-sheet-modal.component.html',
  styleUrls: ['./street-sheet-modal.component.scss']
})
export class StreetSheetModalComponent implements OnInit {
  streetSheetForm!: FormGroup;
  isEditMode: boolean = false;

  pmOptions: { name: string, email: string }[] = [];
  deploymentOptions: string[] = ['Micro tench', 'Mastech', 'Fiber'];


  @ViewChild('swpppImageInput') swpppImageInput!: ElementRef;
  @ViewChild('ppeImageInput') ppeImageInput!: ElementRef;
  @ViewChild('trafficControlImageInput') trafficControlImageInput!: ElementRef;
  @ViewChild('signageImageInput') signageImageInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<StreetSheetModalComponent>,
    private toastr: ToastrService,
    public streetSheetService: StreetSheetService,
    @Inject(MAT_DIALOG_DATA) public data: StreetSheet
  ) {}

  ngOnInit(): void {
    this.fetchPMOptions();
    this.isEditMode = !!this.data;

    this.streetSheetForm = this.fb.group({
      id: [this.data?.id || ''],
      segmentId: [this.data?.segmentId || '', Validators.required],
      pm: [this.data?.pm || '', Validators.required],
      vendorName: [this.data?.vendorName || '', Validators.required],
      streetAddress: [this.data?.streetAddress || '', Validators.required],
      city: [this.data?.city || '', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]], 
      state: [this.data?.state || '', [Validators.required, Validators.pattern('^[A-Za-z]{2}$')]], 
      deployment: [this.data?.deployment || '', Validators.required],
      date: [this.data?.date || new Date().toISOString(), Validators.required],
      swpppImage: [this.data?.swpppImage || '', Validators.required],
      ppeImage: [this.data?.ppeImage || '', Validators.required],
      trafficControlImage: [this.data?.trafficControlImage || '', Validators.required],
      signageImage: [this.data?.signageImage || '', Validators.required]
    });
  }

  triggerSWPPPImageUpload(): void {
    this.swpppImageInput.nativeElement.click();
  }

  triggerPPEImageUpload(): void {
    this.ppeImageInput.nativeElement.click();
  }

  // Trigger method for Traffic Control Image upload
  triggerTrafficControlImageUpload(): void {
    this.trafficControlImageInput.nativeElement.click();
  }

  // Trigger method for Signage Image upload
  triggerSignageImageUpload(): void {
    this.signageImageInput.nativeElement.click();
  }

  uploadImage(event: Event, field: string): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      const maxFileSizeInMB = 5;
      const maxFileSizeInBytes = maxFileSizeInMB * 1024 * 1024;

      if (file.size > maxFileSizeInBytes) {
        this.toastr.error(`File size should not exceed ${maxFileSizeInMB} MB`);
        return;
      }

      reader.onload = () => {
        const base64String = reader.result as string;
        this.streetSheetForm.patchValue({ [field]: base64String });
        this.toastr.success(`${field.replace(/([A-Z])/g, ' $1')} uploaded`);
      };

      reader.onerror = (error) => {
        console.error('Error converting image: ', error);
      };

      reader.readAsDataURL(file);
    }
  }

  removeImage(field: string): void {
    this.streetSheetForm.patchValue({ [field]: null });
    this.toastr.warning(`${field.replace(/([A-Z])/g, ' $1')} removed`);
  }

  fetchPMOptions() {
    // Call a service method to get PMs based on address/location
    // For now, adding hard-coded values
    this.pmOptions = [
      { name: 'Austin Tuckett', email: 'pm1@example.com' },
      { name: 'Jake Sergant', email: 'pm2@example.com' },
      { name: 'Britton Mickelson', email: 'pm3@example.com' }
    ];
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.streetSheetForm.valid) {
      const streetSheet = this.streetSheetForm.getRawValue();
      if (streetSheet.id === '') {
        streetSheet.id = uuidv4();
      }
      this.dialogRef.close(streetSheet);
    } else {
      console.error('Form is invalid');
    }
  }
}
