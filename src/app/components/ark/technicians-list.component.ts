import { Component, OnInit } from '@angular/core';
import { ArkService } from '../../services/ark.service';
import { Technician, CreateTechnicianDto } from '../../models/ark.models';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-technicians-list',
  templateUrl: './technicians-list.component.html',
  styleUrls: ['./technicians-list.component.scss']
})
export class TechniciansListComponent implements OnInit {
  technicians: Technician[] = [];
  loading: boolean = false;
  displayDialog: boolean = false;
  isEditing: boolean = false;
  selectedTechnician?: Technician;

  technicianForm: CreateTechnicianDto = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    employeeId: '',
    hireDate: new Date(),
    department: '',
    homeBase: '',
    assignedRegion: ''
  };

  constructor(
    private arkService: ArkService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadTechnicians();
  }

  loadTechnicians(): void {
    this.loading = true;
    this.arkService.getAllTechnicians().subscribe({
      next: (data) => {
        this.technicians = data;
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load technicians'
        });
        this.loading = false;
      }
    });
  }

  showCreateDialog(): void {
    this.isEditing = false;
    this.displayDialog = true;
    this.resetForm();
  }

  showEditDialog(technician: Technician): void {
    this.isEditing = true;
    this.selectedTechnician = technician;
    this.displayDialog = true;
    this.technicianForm = {
      firstName: technician.firstName,
      lastName: technician.lastName,
      email: technician.email,
      phoneNumber: technician.phoneNumber,
      employeeId: technician.employeeId,
      hireDate: new Date(technician.hireDate),
      department: technician.department,
      homeBase: technician.homeBase,
      assignedRegion: technician.assignedRegion
    };
  }

  saveTechnician(): void {
    if (this.isEditing && this.selectedTechnician) {
      this.arkService.updateTechnician(this.selectedTechnician.technicianId, this.technicianForm).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Technician updated successfully'
          });
          this.loadTechnicians();
          this.displayDialog = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update technician'
          });
        }
      });
    } else {
      this.arkService.createTechnician(this.technicianForm).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Technician created successfully'
          });
          this.loadTechnicians();
          this.displayDialog = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create technician'
          });
        }
      });
    }
  }

  deleteTechnician(technician: Technician): void {
    if (confirm(`Are you sure you want to delete ${technician.fullName}?`)) {
      this.arkService.deleteTechnician(technician.technicianId).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Technician deleted successfully'
          });
          this.loadTechnicians();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete technician'
          });
        }
      });
    }
  }

  resetForm(): void {
    this.technicianForm = {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      employeeId: '',
      hireDate: new Date(),
      department: '',
      homeBase: '',
      assignedRegion: ''
    };
  }
}

