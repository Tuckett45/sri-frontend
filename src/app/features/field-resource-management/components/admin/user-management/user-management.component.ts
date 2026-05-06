import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: any[] = [
    { id: '1', name: 'Admin User', email: 'admin@company.com', role: 'Admin', status: 'Active' },
    { id: '2', name: 'John Dispatcher', email: 'john@company.com', role: 'Dispatcher', status: 'Active' }
  ];
  displayedColumns = ['name', 'email', 'role', 'status', 'actions'];
  roles = ['Admin', 'Dispatcher', 'CM', 'PM', 'Technician', 'HR', 'Payroll'];
  searchQuery = '';

  get filteredUsers(): any[] {
    if (!this.searchQuery) return this.users;
    const q = this.searchQuery.toLowerCase();
    return this.users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit(): void {}

  inviteUser(): void {
    this.snackBar.open('Invite sent', 'Close', { duration: 3000 });
  }

  deactivateUser(id: string): void {
    const u = this.users.find(u => u.id === id);
    if (u) u.status = 'Inactive';
  }
}
