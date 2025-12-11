import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-user-approval',
  templateUrl: './admin-user-approval.component.html',
  styleUrls: ['./admin-user-approval.component.scss']
})
export class AdminUserApprovalComponent implements OnInit {
  pendingUsers: any[] = [];
  filteredUsers: any[] = [];
  loading = false;
  selectedMarket = 'all';
  markets = ['all', 'AZ', 'CO', 'ID', 'NV', 'TX', 'UT', 'RG'];
  searchTerm = '';
  displayedColumns: string[] = ['name', 'email', 'role', 'market', 'company', 'createdDate', 'actions'];

  constructor(
    public authService: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadPendingUsers();
  }

  loadPendingUsers(): void {
    this.loading = true;
    const marketFilter = this.selectedMarket === 'all' ? undefined : this.selectedMarket;
    
    this.authService.getPendingUsers(marketFilter).subscribe({
      next: (users) => {
        this.pendingUsers = users;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading pending users:', error);
        this.toastr.error('Failed to load pending users');
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.pendingUsers];
    
    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search)
      );
    }
    
    this.filteredUsers = filtered;
  }

  onMarketChange(): void {
    this.loadPendingUsers();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  approveUser(user: any): void {
    if (confirm(`Are you sure you want to approve ${user.name}?`)) {
      this.authService.approveUser(user.id).subscribe({
        next: () => {
          this.toastr.success(`${user.name} has been approved`);
          this.loadPendingUsers();
        },
        error: (error) => {
          console.error('Error approving user:', error);
          this.toastr.error('Failed to approve user');
        }
      });
    }
  }

  rejectUser(user: any): void {
    const reason = prompt(`Enter a reason for rejecting ${user.name} (optional):`);
    if (reason !== null) { // null means cancelled, empty string is ok
      this.authService.rejectUser(user.id, reason).subscribe({
        next: () => {
          this.toastr.success(`${user.name} has been rejected`);
          this.loadPendingUsers();
        },
        error: (error) => {
          console.error('Error rejecting user:', error);
          this.toastr.error('Failed to reject user');
        }
      });
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getRoleDisplayName(role: number): string {
    const roleMap: { [key: number]: string } = {
      0: 'Admin',
      1: 'Project Manager',
      2: 'Superintendent',
      3: 'Foreman',
      4: 'Lead Technician',
      5: 'Technician',
      6: 'Warehouse',
      7: 'Accounting',
      8: 'Sales',
      9: 'Engineering',
      10: 'Customer Service',
      11: 'HR',
      12: 'Other'
    };
    return roleMap[role] || 'Unknown';
  }
}

