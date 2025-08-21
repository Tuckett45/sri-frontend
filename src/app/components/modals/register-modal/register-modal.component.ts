import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../services/auth.service';
import { User } from 'src/app/models/user.model';
import { v4 as uuidv4 } from 'uuid';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register-modal',
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.scss'],
  standalone: false
})
export class RegisterModalComponent {
  registerForm!: FormGroup;
  roles: string[] = ['CM', 'PM', 'Client', 'OSP Coordinator', 'Controller'];
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
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onRoleChange(): void {
    const role = this.registerForm.get('role')?.value;
    if (role !== 'PM') {
      this.registerForm.get('company')?.reset();
    }
  }

  onSubmit(): void {
    const formValues = this.registerForm.value;

    if (formValues.role == 'CM' || formValues.role == 'OSP Coordinator' || formValues.role == 'Controller') {
      formValues.company = 'SRI';
    }else if(formValues.role == 'Client'){
      formValues.company = 'Google'; 
      //Change values of companies in the future based on role
    }

    const newUser: User = new User(
      uuidv4(),
      formValues.name,
      formValues.email,
      formValues.password,
      formValues.role,
      formValues.market,
      formValues.company,
      formValues.createdDate.toISOString(),
      formValues.isApproved,
      formValues.approvalToken
    );

    if (this.registerForm.valid) {
      this.authService.register(newUser).subscribe({
        next: (response) => {
          this.toastr.success('Registration successful! Waiting for Approval....', 'Success');
          this.dialogRef.close();
        },
        error: (error) => {
          this.toastr.error(error.error, 'Error');
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}