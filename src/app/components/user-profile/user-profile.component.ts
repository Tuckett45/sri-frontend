import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UserProfileModalComponent } from './user-profile-modal/user-profile-modal.component';

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

  openEditModal(): void {
    const dialogRef = this.dialog.open(UserProfileModalComponent, {
      width: '400px',
      data: this.profileData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.profileData = result;
      }
    });
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