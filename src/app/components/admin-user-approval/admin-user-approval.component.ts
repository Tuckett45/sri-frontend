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
        user.Name?.toLowerCase().includes(search) ||
        user.Email?.toLowerCase().includes(search)
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
    if (confirm(`Are you sure you want to approve ${user.Name}?`)) {
      this.authService.approveUser(user.Id).subscribe({
        next: () => {
          this.toastr.success(`${user.Name} has been approved`);
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
    const reason = prompt(`Enter a reason for rejecting ${user.Name} (optional):`);
    if (reason !== null) { // null means cancelled, empty string is ok
      this.authService.rejectUser(user.Id, reason).subscribe({
        next: () => {
          this.toastr.success(`${user.Name} has been rejected`);
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
      0: 'User',
      1: 'Technician',
      2: 'Deployment Engineer',
      3: 'PM',
      4: 'CM',
      5: 'Admin',
      6: 'DCOps',
      7: 'VendorRep',
      8: 'SRITech',
      9: 'HR',
      10: 'Client',
      11: 'OSP Coordinator',
      12: 'Controller'
    };
    return roleMap[role] || 'Unknown';
  }
}

