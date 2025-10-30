import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../services/auth.service';
import { User } from 'src/app/models/user.model';
import { UserRole } from 'src/app/models/role.enum';
import { v4 as uuidv4 } from 'uuid';
import { ToastrService } from 'ngx-toastr';

type RegisterFormValue = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole | string;
  market: string;
  company: string;
  createdDate: Date;
  isApproved?: boolean;
  approvalToken?: string;
};

@Component({
  selector: 'app-register-modal',
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.scss'],
  standalone: false
})
export class RegisterModalComponent {
  registerForm!: FormGroup;
  roles: UserRole[] = [
    UserRole.CM,
    UserRole.PM,
    UserRole.Client,
    UserRole.OSPCoordinator,
    UserRole.Controller,
    UserRole.HR,
    UserRole.Technician,
    UserRole.ComcastDeploymentEngineer,
    UserRole.DcOps,
    UserRole.Vendor
  ];
  companys: string[] = ['Congruex (SCI)', 'Ervin (ECC)', 'Blue Edge (BE)', 'North Star', 'MasTec', 'Bcomm'];
  markets: { name: string, abbreviation: string }[] = [
    { name: 'Arizona', abbreviation: 'AZ' },
    { name: 'Colorado', abbreviation: 'CO' },
    { name: 'Idaho', abbreviation: 'ID' },
    { name: 'Nevada', abbreviation: 'NV' },
    { name: 'Texas', abbreviation: 'TX' },
    { name: 'Utah', abbreviation: 'UT' },
    { name: 'Regional', abbreviation: 'RG' }
  ];

  private readonly autoCompanyByRole: Partial<Record<UserRole, string>> = {
    [UserRole.CM]: 'SRI',
    [UserRole.OSPCoordinator]: 'SRI',
    [UserRole.Controller]: 'SRI',
    [UserRole.HR]: 'SRI',
    [UserRole.Technician]: 'SRI',
    [UserRole.ComcastDeploymentEngineer]: 'Comcast',
    [UserRole.DcOps]: 'Comcast',
    [UserRole.Client]: 'Google',
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegisterModalComponent>,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
  }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['', Validators.required],
      market: ['', Validators.required],
      company: [''],
      createdDate: [new Date],
    }, { validator: this.passwordMatchValidator });

    this.onRoleChange();
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onRoleChange(): void {
    const role = this.registerForm.get('role')?.value as UserRole | string | null;
    const companyControl = this.registerForm.get('company');
    if (!companyControl) {
      return;
    }

    const userRole = this.toUserRole(role);
    const autoCompany = userRole ? this.autoCompanyByRole[userRole] : undefined;

    if (autoCompany) {
      companyControl.setValue(autoCompany);
      companyControl.clearValidators();
    } else if (this.requiresCompanySelection(role)) {
      companyControl.setValue('');
      companyControl.setValidators([Validators.required]);
    } else {
      companyControl.reset('');
      companyControl.clearValidators();
    }

    companyControl.updateValueAndValidity();
  }

  onSubmit(): void {
    const formValues = this.registerForm.getRawValue() as RegisterFormValue;
    const userRole = this.toUserRole(formValues.role);
    const autoCompany = userRole ? this.autoCompanyByRole[userRole] : undefined;

    if (autoCompany) {
      formValues.company = autoCompany;
    } else if (!this.requiresCompanySelection(formValues.role)) {
      formValues.company = formValues.company ?? '';
    }

    const createdDate: Date =
      formValues.createdDate instanceof Date
        ? formValues.createdDate
        : new Date(formValues.createdDate as unknown as string);

    const newUser: User = new User(
      uuidv4(),
      formValues.name,
      formValues.email,
      formValues.password,
      formValues.role as string,
      formValues.market,
      formValues.company,
      createdDate,
      formValues.isApproved ?? false,
      formValues.approvalToken
    );

    if (this.registerForm.valid) {
      this.authService.register(newUser).subscribe({
        next: () => {
          this.toastr.success('Registration successful! Waiting for Approval....', 'Success');
          this.dialogRef.close();
        },
        error: (error) => {
          this.toastr.error(error.error, 'Error');
        }
      });
    }
  }

  requiresCompanySelection(role: UserRole | string | null | undefined): boolean {
    if (!role) {
      return false;
    }
    const value = typeof role === 'string' ? role : (role as string);
    return value === UserRole.PM || value === UserRole.Vendor;
  }

  private toUserRole(role: UserRole | string | null | undefined): UserRole | undefined {
    if (!role) {
      return undefined;
    }
    const value = typeof role === 'string' ? role : (role as string);
    return (Object.values(UserRole) as string[]).includes(value) ? (value as UserRole) : undefined;
  }

  close(): void {
    this.dialogRef.close();
  }
}
