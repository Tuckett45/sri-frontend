import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HierarchyApiService, OrgTreeNode, OrgUser } from '../../services/hierarchy-api.service';
import { SUPPORTED_MARKETS } from '../../models/overtime.models';
import { AuthService } from '../../../../services/auth.service';
import {
  AssignManagerDialogComponent,
  AssignManagerDialogData,
  AssignManagerDialogResult,
  AssignMode
} from './assign-manager-dialog/assign-manager-dialog.component';

@Component({
  selector: 'app-org-structure',
  templateUrl: './org-structure.component.html',
  styleUrls: ['./org-structure.component.scss']
})
export class OrgStructureComponent implements OnInit {
  tree: OrgTreeNode[] = [];
  loading = true;
  error: string | null = null;
  selectedMarket = '';
  selectedRole = '';
  markets = SUPPORTED_MARKETS;
  roles = [
    { value: 'Admin', label: 'Admin' },
    { value: 'CM', label: 'CM' },
    { value: 'Manager', label: 'Manager' },
    { value: 'HR', label: 'HR' },
    { value: 'Payroll', label: 'Payroll' },
    { value: 'Technician', label: 'Technician' },
    { value: 'SRITech', label: 'SRI Tech' },
    { value: 'DeploymentEngineer', label: 'Deployment Engineer' },
    { value: 'PM', label: 'PM' },
    { value: 'OSPCoordinator', label: 'OSP Coordinator' },
    { value: 'Controller', label: 'Controller' },
    { value: 'EngineeringFieldSupport', label: 'Engineering Field Support' },
    { value: 'MaterialsManager', label: 'Materials Manager' },
    { value: 'VendorRep', label: 'Vendor Rep' },
    { value: 'DCOps', label: 'DC Ops' }
  ];
  searchQuery = '';
  expandedNodes = new Set<string>();

  // All users flat list (for manager selection)
  allUsers: { userId: string; fullName: string; role: string; market: string | null }[] = [];

  constructor(
    private hierarchyApi: HierarchyApiService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    const market = this.selectedMarket || undefined;

    // Load the tree first (critical)
    this.hierarchyApi.getTree(market).subscribe({
      next: (tree) => {
        this.tree = tree;
        this.loading = false;

        // Then try to load full user list (non-blocking — falls back to tree users)
        this.hierarchyApi.getAllUsers(market).pipe(
          catchError(() => of([] as OrgUser[]))
        ).subscribe(users => {
          if (users.length > 0) {
            this.allUsers = this.mergeUsers(users, tree);
          } else {
            // Fallback: use users from the tree itself
            this.allUsers = this.flattenTree(tree);
          }
          // Ensure the current Admin user is always available as a manager
          // candidate, even if the users endpoint omits admin-role accounts.
          this.ensureCurrentAdminIncluded();
        });
      },
      error: () => {
        this.error = 'Failed to load org structure.';
        this.loading = false;
      }
    });
  }

  loadTree(): void {
    this.loadData();
  }

  filterByMarket(market: string): void {
    this.selectedMarket = market;
    this.loadTree();
  }

  filterByRole(role: string): void {
    this.selectedRole = role;
  }

  /**
   * Check if a node should be visible based on search query and role filter.
   */
  isNodeVisible(node: OrgTreeNode): boolean {
    const matchesSearch = !this.searchQuery ||
      (node.fullName || '').toLowerCase().includes(this.searchQuery.toLowerCase());
    const matchesRole = !this.selectedRole ||
      (node.role || '').toLowerCase() === this.selectedRole.toLowerCase();
    return matchesSearch && matchesRole;
  }

  /**
   * Check if a node or any of its descendants match the current filters.
   * Used to keep parent nodes visible when children match.
   */
  hasVisibleDescendants(node: OrgTreeNode): boolean {
    if (this.isNodeVisible(node)) return true;
    if (node.directReports?.length) {
      return node.directReports.some(child => this.hasVisibleDescendants(child));
    }
    return false;
  }

  toggleNode(userId: string): void {
    if (this.expandedNodes.has(userId)) {
      this.expandedNodes.delete(userId);
    } else {
      this.expandedNodes.add(userId);
    }
  }

  isExpanded(userId: string): boolean {
    return this.expandedNodes.has(userId);
  }

  expandAll(): void {
    const addAll = (nodes: OrgTreeNode[]) => {
      for (const node of nodes) {
        this.expandedNodes.add(node.userId);
        if (node.directReports?.length) addAll(node.directReports);
      }
    };
    addAll(this.tree);
  }

  collapseAll(): void {
    this.expandedNodes.clear();
  }

  // --- Assignment Actions ---

  openAssignDialog(node: OrgTreeNode, mode: AssignMode = 'assign'): void {
    const currentManager = this.findManagerOf(node.userId);

    const dialogData: AssignManagerDialogData = {
      mode,
      employee: node,
      allUsers: this.allUsers,
      currentManagerId: currentManager?.userId,
      currentManagerName: currentManager?.fullName || undefined
    };

    const dialogRef = this.dialog.open(AssignManagerDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: dialogData,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((result: AssignManagerDialogResult) => {
      if (result?.confirmed && result.employeeUserId && result.managerUserId) {
        this.performAssignment(result.employeeUserId, result.managerUserId);
      }
    });
  }

  openCreateAssignmentDialog(): void {
    const dialogData: AssignManagerDialogData = {
      mode: 'create',
      allUsers: this.allUsers
    };

    const dialogRef = this.dialog.open(AssignManagerDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: dialogData,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((result: AssignManagerDialogResult) => {
      if (result?.confirmed && result.employeeUserId && result.managerUserId) {
        this.performAssignment(result.employeeUserId, result.managerUserId);
      }
    });
  }

  /**
   * Create a new top-level manager (no parent manager assigned).
   * Opens the dialog in 'createManager' mode where you only pick the person to promote.
   */
  openCreateManagerDialog(): void {
    const dialogData: AssignManagerDialogData = {
      mode: 'createManager',
      allUsers: this.allUsers
    };

    const dialogRef = this.dialog.open(AssignManagerDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: dialogData,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((result: AssignManagerDialogResult) => {
      if (!result?.confirmed || !result.employeeUserId) return;

      if (result.managerUserId) {
        // Assigned under an existing manager
        this.performAssignment(result.employeeUserId, result.managerUserId);
      } else {
        // Top-level manager (no parent)
        this.hierarchyApi.createTopLevelManager(result.employeeUserId).subscribe({
          next: () => {
            const name = this.allUsers.find(u => u.userId === result.employeeUserId)?.fullName || 'User';
            this.snackBar.open(`${name} added as top-level manager`, 'OK', { duration: 3000 });
            this.loadTree();
          },
          error: (err) => {
            const msg = err?.error?.message || 'Failed to create manager.';
            this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
          }
        });
      }
    });
  }

  removeManager(node: OrgTreeNode): void {
    if (!confirm(`Remove manager assignment for ${node.fullName}?`)) return;
    this.hierarchyApi.removeManager(node.userId).subscribe({
      next: () => {
        this.snackBar.open(`Removed manager assignment for ${node.fullName}`, 'OK', { duration: 3000 });
        this.loadTree();
      },
      error: () => {
        this.snackBar.open('Failed to remove manager assignment.', 'Dismiss', { duration: 5000 });
      }
    });
  }

  getRoleBadgeClass(role: string | null): string {
    switch (role?.toLowerCase()) {
      case 'admin': return 'role-admin';
      case 'cm': return 'role-cm';
      case 'hr': return 'role-hr';
      case 'payroll': return 'role-payroll';
      case 'technician': case 'sritech': return 'role-tech';
      case 'deploymentengineer': return 'role-de';
      default: return 'role-default';
    }
  }

  private performAssignment(employeeUserId: string, managerUserId: string): void {
    this.hierarchyApi.assignManager({ employeeUserId, managerUserId }).subscribe({
      next: () => {
        const employeeName = this.allUsers.find(u => u.userId === employeeUserId)?.fullName || 'Employee';
        const managerName = this.allUsers.find(u => u.userId === managerUserId)?.fullName || 'Manager';
        this.snackBar.open(`${employeeName} assigned to ${managerName}`, 'OK', { duration: 3000 });
        this.loadTree();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to assign manager. Check for circular dependency.';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      }
    });
  }

  /**
   * Find the manager (parent node) of a given userId in the tree.
   */
  private findManagerOf(userId: string): OrgTreeNode | null {
    const search = (nodes: OrgTreeNode[], parent: OrgTreeNode | null): OrgTreeNode | null => {
      for (const node of nodes) {
        if (node.userId === userId) return parent;
        if (node.directReports?.length) {
          const found = search(node.directReports, node);
          if (found) return found;
        }
      }
      return null;
    };
    return search(this.tree, null);
  }

  /**
   * Guarantees the currently logged-in Admin appears in the manager-candidate
   * list. The backend users endpoint sometimes omits admin-role accounts, which
   * prevents Admins from being assigned as managers in the org structure.
   */
  private ensureCurrentAdminIncluded(): void {
    const user = this.authService.getUser();
    if (!user?.id || user.role !== 'Admin') {
      return;
    }
    const alreadyPresent = this.allUsers.some(u => u.userId === user.id);
    if (alreadyPresent) {
      return;
    }
    this.allUsers = [
      ...this.allUsers,
      {
        userId: user.id,
        fullName: user.name || 'Admin',
        role: user.role,
        market: user.market ?? null
      }
    ].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  private flattenTree(nodes: OrgTreeNode[]): { userId: string; fullName: string; role: string; market: string | null }[] {
    const result: { userId: string; fullName: string; role: string; market: string | null }[] = [];
    const walk = (list: OrgTreeNode[]) => {
      for (const n of list) {
        result.push({ userId: n.userId, fullName: n.fullName || 'Unknown', role: n.role || '', market: n.market });
        if (n.directReports?.length) walk(n.directReports);
      }
    };
    walk(nodes);
    return result;
  }

  /**
   * Merge the full user list from the API with any users only found in the tree.
   * This ensures all system users are available for selection in dialogs.
   */
  private mergeUsers(
    apiUsers: OrgUser[],
    tree: OrgTreeNode[]
  ): { userId: string; fullName: string; role: string; market: string | null }[] {
    const userMap = new Map<string, { userId: string; fullName: string; role: string; market: string | null }>();

    // Add all API users first
    for (const u of apiUsers) {
      userMap.set(u.userId, {
        userId: u.userId,
        fullName: u.fullName || 'Unknown',
        role: u.role || '',
        market: u.market
      });
    }

    // Supplement with tree users (in case API didn't return them)
    const walkTree = (nodes: OrgTreeNode[]) => {
      for (const n of nodes) {
        if (!userMap.has(n.userId)) {
          userMap.set(n.userId, {
            userId: n.userId,
            fullName: n.fullName || 'Unknown',
            role: n.role || '',
            market: n.market
          });
        }
        if (n.directReports?.length) walkTree(n.directReports);
      }
    };
    walkTree(tree);

    return Array.from(userMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}
