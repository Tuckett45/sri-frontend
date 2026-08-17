import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { OrgTreeNode } from '../../../services/hierarchy-api.service';

export type AssignMode = 'assign' | 'change' | 'create' | 'createManager';

export interface AssignManagerDialogData {
  mode: AssignMode;
  employee?: OrgTreeNode;
  allUsers: { userId: string; fullName: string; role: string; market: string | null }[];
  currentManagerId?: string;
  currentManagerName?: string;
}

export interface AssignManagerDialogResult {
  confirmed: boolean;
  employeeUserId?: string;
  managerUserId?: string | null;
}

@Component({
  selector: 'app-assign-manager-dialog',
  templateUrl: './assign-manager-dialog.component.html',
  styleUrls: ['./assign-manager-dialog.component.scss']
})
export class AssignManagerDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form: FormGroup;
  mode: AssignMode;
  filteredManagers: { userId: string; fullName: string; role: string; market: string | null }[] = [];
  filteredEmployees: { userId: string; fullName: string; role: string; market: string | null }[] = [];
  managerSearchText = '';
  employeeSearchText = '';
  managerRoleFilter = '';
  employeeRoleFilter = '';

  availableRoles: string[] = [];

  // For 'create' mode: users who are not yet in the tree (unassigned)
  unassignedUsers: { userId: string; fullName: string; role: string; market: string | null }[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AssignManagerDialogData,
    private dialogRef: MatDialogRef<AssignManagerDialogComponent>,
    private fb: FormBuilder
  ) {
    this.mode = data.mode;

    // For createManager mode, manager selection is not required (it's a top-level node)
    if (this.mode === 'createManager') {
      this.form = this.fb.group({
        employeeUserId: ['', Validators.required],
        managerUserId: ['']
      });
    } else {
      this.form = this.fb.group({
        employeeUserId: [data.employee?.userId || '', Validators.required],
        managerUserId: ['', Validators.required]
      });
    }
  }

  ngOnInit(): void {
    // Extract unique roles from all users
    const roleSet = new Set(this.data.allUsers.map(u => u.role).filter(r => !!r));
    this.availableRoles = Array.from(roleSet).sort();

    // Initialize filtered lists
    this.filteredManagers = this.getAvailableManagers();
    this.filteredEmployees = this.data.allUsers;
    this.unassignedUsers = this.data.allUsers;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get dialogTitle(): string {
    switch (this.mode) {
      case 'assign': return 'Assign Manager';
      case 'change': return 'Change Manager';
      case 'create': return 'Create Assignment';
      case 'createManager': return 'Create New Manager';
    }
  }

  get dialogDescription(): string {
    switch (this.mode) {
      case 'assign':
        return `Select a manager for ${this.data.employee?.fullName || 'this employee'}`;
      case 'change':
        return `Change the manager for ${this.data.employee?.fullName || 'this employee'}. Current manager: ${this.data.currentManagerName || 'None'}`;
      case 'create':
        return 'Create a new reporting relationship by selecting an employee and their manager';
      case 'createManager':
        return 'Select a person to designate as a new manager. They will appear at the top level of the org chart. Then optionally assign them under an existing manager.';
    }
  }

  get confirmButtonLabel(): string {
    switch (this.mode) {
      case 'assign': return 'Assign';
      case 'change': return 'Change';
      case 'create': return 'Create Assignment';
      case 'createManager': return 'Create Manager';
    }
  }

  get showEmployeeField(): boolean {
    return this.mode === 'create' || this.mode === 'createManager';
  }

  get showManagerField(): boolean {
    return this.mode !== 'createManager' || !!this.form.get('managerUserId')?.value;
  }

  get isManagerOptional(): boolean {
    return this.mode === 'createManager';
  }

  filterManagers(searchText: string): void {
    this.managerSearchText = searchText;
    this.applyManagerFilters();
  }

  filterManagersByRole(role: string): void {
    this.managerRoleFilter = role;
    this.applyManagerFilters();
  }

  filterEmployees(searchText: string): void {
    this.employeeSearchText = searchText;
    this.applyEmployeeFilters();
  }

  filterEmployeesByRole(role: string): void {
    this.employeeRoleFilter = role;
    this.applyEmployeeFilters();
  }

  private applyManagerFilters(): void {
    const text = this.managerSearchText.toLowerCase();
    this.filteredManagers = this.getAvailableManagers().filter(u => {
      const matchesText = !text ||
        u.fullName.toLowerCase().includes(text) ||
        (u.role || '').toLowerCase().includes(text) ||
        (u.market || '').toLowerCase().includes(text);
      const matchesRole = !this.managerRoleFilter ||
        (u.role || '').toLowerCase() === this.managerRoleFilter.toLowerCase();
      return matchesText && matchesRole;
    });
  }

  private applyEmployeeFilters(): void {
    const text = this.employeeSearchText.toLowerCase();
    this.filteredEmployees = this.data.allUsers.filter(u => {
      const matchesText = !text ||
        u.fullName.toLowerCase().includes(text) ||
        (u.role || '').toLowerCase().includes(text) ||
        (u.market || '').toLowerCase().includes(text);
      const matchesRole = !this.employeeRoleFilter ||
        (u.role || '').toLowerCase() === this.employeeRoleFilter.toLowerCase();
      return matchesText && matchesRole;
    });
  }

  selectManager(user: { userId: string; fullName: string }): void {
    this.form.patchValue({ managerUserId: user.userId });
    this.managerSearchText = user.fullName;
  }

  clearManagerSelection(): void {
    this.form.patchValue({ managerUserId: '' });
    this.managerSearchText = '';
  }

  selectEmployee(user: { userId: string; fullName: string }): void {
    this.form.patchValue({ employeeUserId: user.userId });
    this.employeeSearchText = user.fullName;
  }

  getSelectedManagerName(): string {
    const id = this.form.get('managerUserId')?.value;
    if (!id) return '';
    const user = this.data.allUsers.find(u => u.userId === id);
    return user?.fullName || '';
  }

  getSelectedEmployeeName(): string {
    const id = this.form.get('employeeUserId')?.value;
    if (!id) return '';
    const user = this.data.allUsers.find(u => u.userId === id);
    return user?.fullName || '';
  }

  onConfirm(): void {
    if (this.mode === 'createManager') {
      // For createManager, employee is required but manager is optional
      const employeeId = this.form.value.employeeUserId;
      if (!employeeId) return;

      const managerId = this.form.value.managerUserId || null;
      const result: AssignManagerDialogResult = {
        confirmed: true,
        employeeUserId: employeeId,
        managerUserId: managerId
      };
      this.dialogRef.close(result);
    } else {
      if (this.form.invalid) return;

      const result: AssignManagerDialogResult = {
        confirmed: true,
        employeeUserId: this.form.value.employeeUserId,
        managerUserId: this.form.value.managerUserId
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  private getAvailableManagers(): { userId: string; fullName: string; role: string; market: string | null }[] {
    const employeeId = this.form?.get('employeeUserId')?.value;
    return this.data.allUsers.filter(u => u.userId !== employeeId);
  }
}
