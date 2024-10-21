import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { User } from 'src/app/models/user.model';
import { v4 as uuidv4 } from 'uuid';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register-modal',
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.scss']
})
export class RegisterModalComponent {
  registerForm: FormGroup;
  roles: string[] = ['CM', 'PM', 'Client'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegisterModalComponent>,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['', Validators.required],
      createdDate: [new Date],
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['', Validators.required],
      createdDate: [new Date],
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onSubmit(): void {
    const formValues = this.registerForm.value;

    const newUser: User = new User(
      uuidv4(),
      formValues.name,
      formValues.email,
      formValues.password,
      formValues.role,
      formValues.createdDate.toISOString()
    );

    if (this.registerForm.valid) {
      this.authService.register(newUser).subscribe({
        next: (response) => {
          this.toastr.success('Registration successful!', 'Success');
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