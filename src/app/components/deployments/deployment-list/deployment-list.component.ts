// src/app/components/deployments/deployment-list/deployment-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeploymentApiService } from '../../../services/deployment-api.service';
import { 
  Deployment, 
  DeploymentStatus, 
  DeploymentRole 
} from '../../../features/deployment/models/deployment.models';

@Component({
  selector: 'app-deployment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deployment-list.component.html',
  styleUrls: ['./deployment-list.component.css']
})
export class DeploymentListComponent implements OnInit {
  // Data
  deployments: Deployment[] = [];
  totalDeployments = 0;

  // State
  loading = false;
  error: string | null = null;

  // Filters
  selectedStatus: string = '';
  selectedVendor: string = '';
  selectedDataCenter: string = '';
  dateFrom: string = '';
  dateTo: string = '';

  // Pagination
  currentPage = 1;
  pageSize = 12;
  totalPages = 0;

  // Enums for template
  DeploymentStatus = DeploymentStatus;
  DeploymentRole = DeploymentRole;

  // Dropdown options
  statusOptions = Object.values(DeploymentStatus);
  
  constructor(private deploymentApi: DeploymentApiService) {}

  ngOnInit(): void {
    this.loadDeployments();
  }

  /**
   * Load deployments from API with current filters and pagination
   */
  loadDeployments(): void {
    this.loading = true;
    this.error = null;

    const queryParams = {
      status: this.selectedStatus || undefined,
      vendor: this.selectedVendor || undefined,
      dataCenter: this.selectedDataCenter || undefined,
      from: this.dateFrom || undefined,
      to: this.dateTo || undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.deploymentApi.getMyDeployments(queryParams).subscribe({
      next: (response) => {
        this.deployments = response.rows;
        this.totalDeployments = response.total;
        this.totalPages = Math.ceil(response.total / this.pageSize);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading deployments:', err);
        this.error = 'Failed to load deployments. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Apply filters and reset to page 1
   */
  applyFilters(): void {
    this.currentPage = 1;
    this.loadDeployments();
  }

  /**
   * Clear all filters and reload
   */
  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedVendor = '';
    this.selectedDataCenter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
    this.loadDeployments();
  }

  /**
   * Navigate to previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadDeployments();
    }
  }

  /**
   * Navigate to next page
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadDeployments();
    }
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadDeployments();
    }
  }

  /**
   * Determine the user's role for a deployment to apply color coding
   * Returns the role class name for CSS styling
   */
  getUserRoleClass(deployment: Deployment): string {
    // In a real app, you'd get the current user's ID from an auth service
    // For now, we'll determine based on which role field is populated
    if (deployment.deploymentEngineerId) {
      return 'deployment-engineer';
    }
    if (deployment.dcOpsId) {
      return 'dc-ops';
    }
    if (deployment.vendorRepId) {
      return 'vendor-rep';
    }
    if (deployment.sriTechId) {
      return 'sri-tech';
    }
    return '';
  }

  /**
   * Get the user's role label for display
   */
  getUserRoleLabel(deployment: Deployment): string {
    if (deployment.deploymentEngineerId) {
      return DeploymentRole.DeploymentEngineer;
    }
    if (deployment.dcOpsId) {
      return DeploymentRole.DCOps;
    }
    if (deployment.vendorRepId) {
      return DeploymentRole.VendorRep;
    }
    if (deployment.sriTechId) {
      return DeploymentRole.SRITech;
    }
    return 'Unknown';
  }

  /**
   * Calculate progress percentage based on status
   */
  getProgressPercent(status: DeploymentStatus): number {
    const progressMap: Record<string, number> = {
      [DeploymentStatus.Planned]: 0,
      [DeploymentStatus.Survey]: 15,
      [DeploymentStatus.Inventory]: 30,
      [DeploymentStatus.Install]: 50,
      [DeploymentStatus.Cabling]: 70,
      [DeploymentStatus.Labeling]: 85,
      [DeploymentStatus.Handoff]: 95,
      [DeploymentStatus.Complete]: 100
    };
    return progressMap[status] || 0;
  }

  /**
   * Get status badge class for styling
   */
  getStatusBadgeClass(status: DeploymentStatus): string {
    const classMap: Record<string, string> = {
      [DeploymentStatus.Planned]: 'status-planned',
      [DeploymentStatus.Survey]: 'status-survey',
      [DeploymentStatus.Inventory]: 'status-inventory',
      [DeploymentStatus.Install]: 'status-install',
      [DeploymentStatus.Cabling]: 'status-cabling',
      [DeploymentStatus.Labeling]: 'status-labeling',
      [DeploymentStatus.Handoff]: 'status-handoff',
      [DeploymentStatus.Complete]: 'status-complete'
    };
    return classMap[status] || '';
  }

  /**
   * Format date for display
   */
  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Navigate to deployment detail view
   */
  viewDeploymentDetails(deploymentId: string): void {
    // TODO: Implement navigation to detail view
    console.log('Navigate to deployment:', deploymentId);
  }

  /**
   * Get page numbers for pagination display
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Show all pages
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page and surrounding pages
      const startPage = Math.max(1, this.currentPage - 2);
      const endPage = Math.min(this.totalPages, this.currentPage + 2);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }
}

