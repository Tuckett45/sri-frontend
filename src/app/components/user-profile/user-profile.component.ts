import { Component, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UserProfileModalComponent } from '../modals/user-profile-modal/user-profile-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { DeploymentFeatureFlagsService, DeploymentFeatureFlags } from 'src/app/features/deployment/services/deployment-feature-flags.service';

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
  featureFlagsForm!: FormGroup;
  featureFlags!: DeploymentFeatureFlags;
  flagControls = [
    {
      controlName: 'notificationsEnabled',
      title: 'Deployment Notifications',
      description: 'Receive real-time deployment alerts and SignalR messages.'
    },
    {
      controlName: 'autoAssignEnabled',
      title: 'Auto-Assign Roles',
      description: 'Automatically assign deployment roles as phases progress.'
    },
    {
      controlName: 'strictRoleEnforcement',
      title: 'Strict Role Enforcement',
      description: 'Restrict access to phases based on runbook role assignments.'
    },
    {
      controlName: 'showRoleColors',
      title: 'Role Color Highlights',
      description: 'Display deployment roles using the runbook color palette.'
    }
  ];

  constructor(
    private dialog: MatDialog,
    public authService: AuthService,
    private featureFlagsService: DeploymentFeatureFlagsService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.initFeatureFlagsForm();
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

  private initFeatureFlagsForm(): void {
    this.featureFlags = this.featureFlagsService.getFlags()();
    this.featureFlagsForm = this.fb.group({
      notificationsEnabled: [this.featureFlags.notificationsEnabled],
      autoAssignEnabled: [this.featureFlags.autoAssignEnabled],
      strictRoleEnforcement: [this.featureFlags.strictRoleEnforcement],
      showRoleColors: [this.featureFlags.showRoleColors]
    });
  }

  onFlagsSubmit(): void {
    const updated = this.featureFlagsForm.value as DeploymentFeatureFlags;
    (Object.keys(updated) as (keyof DeploymentFeatureFlags)[]).forEach(key => {
      this.featureFlagsService.setFlag(key, updated[key]);
    });
    this.featureFlags = this.featureFlagsService.getFlags()();
  }

  resetFlags(): void {
    this.featureFlagsService.resetFlags();
    this.featureFlags = this.featureFlagsService.getFlags()();
    this.featureFlagsForm.patchValue(this.featureFlags);
  }
}
