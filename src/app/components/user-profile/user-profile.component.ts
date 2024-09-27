import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-user-profile',  // Update selector
  templateUrl: './user-profile.component.html',  // Update file reference
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent {

  @ViewChild('editProfileModal')
  editProfileModal!: TemplateRef<any>;

  // For storing dialog reference
  dialogRef!: MatDialogRef<any>;

  // User profile data (initial data could come from an API)
  profileData = {
    username: 'john_doe',
    email: 'john@example.com'
  };

  constructor(private dialog: MatDialog) {}

   // Method to open the modal
   openEditModal(): void {
    this.dialogRef = this.dialog.open(this.editProfileModal);
  }

  // Method to close the modal
  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  // Method to save changes (e.g., update the profile data)
  saveChanges(): void {
    console.log('Saved profile data:', this.profileData);
    
    // Close the modal after saving changes
    this.closeModal();
    
    // Optionally, you could send the updated data to a server via an API call
    // this.profileService.updateProfile(this.profileData).subscribe(response => {
    //   console.log('Profile updated:', response);
    // });
  }
}