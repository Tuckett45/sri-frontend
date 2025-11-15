import { Component, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { UserProfileModalComponent } from '../modals/user-profile-modal/user-profile-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { FeatureFlagService, FeatureFlagKey, FeatureFlagView } from 'src/app/services/feature-flag.service';

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
  profileData: User | null = null;
  featureFlagsForm!: FormGroup<Record<FeatureFlagKey, FormControl<boolean>>>;
  readonly flagViews = this.featureFlagsService.flags;

  constructor(
    private dialog: MatDialog,
    public authService: AuthService,
    private featureFlagsService: FeatureFlagService,
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
    const flags = this.readFeatureFlagValues();
    const controls: Partial<Record<FeatureFlagKey, FormControl<boolean>>> = {};
    (Object.keys(flags) as FeatureFlagKey[]).forEach(key => {
      controls[key] = this.fb.nonNullable.control(flags[key]);
    });
    this.featureFlagsForm = new FormGroup(controls as Record<FeatureFlagKey, FormControl<boolean>>);
  }

  onFlagsSubmit(): void {
    const updated = this.featureFlagsForm.getRawValue();
    (Object.keys(updated) as FeatureFlagKey[]).forEach(key => {
      this.featureFlagsService.setFlag(key, updated[key]);
    });
  }

  resetFlags(): void {
    this.featureFlagsService.reset();
    const refreshed = this.readFeatureFlagValues();
    this.featureFlagsForm.patchValue(refreshed);
  }

  private readFeatureFlagValues(): Record<FeatureFlagKey, boolean> {
    const result = {} as Record<FeatureFlagKey, boolean>;

    (this.flagViews() as FeatureFlagView[]).forEach(view => {
      const valueSignal = this.featureFlagsService.flagEnabled(view.key);
      result[view.key] = valueSignal();
    });

    return result;
  }
}
