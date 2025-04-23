import { Component, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UserProfileModalComponent } from '../modals/user-profile-modal/user-profile-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone: false
})
export class UserProfileComponent implements OnInit {

  @ViewChild('editProfileModal')
  editProfileModal!: TemplateRef<any>;
  dialogRef!: MatDialogRef<any>;
  profileData!: User;

  constructor(private dialog: MatDialog, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);

      this.profileData = new User(
        userObj.id,
        userObj.name,
        userObj.email,
        userObj.password,
        userObj.role,
        userObj.market,
        userObj.company,
        new Date(userObj.createdDate),
        userObj.isApproved,
        userObj.approvalToken
      );
    }
  }

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

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  saveChanges(): void {
    this.closeModal();
  }
}
