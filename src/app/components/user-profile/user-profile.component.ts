import { Component, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UserProfileModalComponent } from './user-profile-modal/user-profile-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-user-profile',  // Update selector
  templateUrl: './user-profile.component.html',  // Update file reference
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {

  @ViewChild('editProfileModal')
  editProfileModal!: TemplateRef<any>;

  // For storing dialog reference
  dialogRef!: MatDialogRef<any>;

  // User profile data (initial data could come from an API)
  profileData!: User;

  constructor(private dialog: MatDialog, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserProfile(); // Load the user data when the component initializes
  }

  // Method to load the user profile from localStorage
  loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);

      // Instantiate a User object
      this.profileData = new User(
        userObj.id,
        userObj.name,
        userObj.email,
        userObj.password,
        userObj.role,
        new Date(userObj.createdDate)  // Ensure createdDate is a Date object
      );
    } else {
      console.error('User not found in localStorage');
    }
  }

  openEditModal(): void {
    // Open the dialog with the current profile data
    const dialogRef = this.dialog.open(UserProfileModalComponent, {
      width: '400px',
      data: this.profileData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.profileData = result;  // Update profile data if changes were made
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
