import { Component, OnInit } from '@angular/core';
import { HierarchyApiService, OrgTreeNode } from '../../services/hierarchy-api.service';
import { SUPPORTED_MARKETS } from '../../models/overtime.models';
import { AuthService } from '../../../../services/auth.service';

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
  markets = SUPPORTED_MARKETS;
  searchQuery = '';
  expandedNodes = new Set<string>();

  // Assign modal
  showAssignModal = false;
  assigningEmployeeId: string | null = null;
  assigningEmployeeName: string | null = null;
  newManagerId = '';

  // All users flat list (for manager selection dropdown)
  allUsers: { userId: string; fullName: string; role: string }[] = [];

  constructor(
    private hierarchyApi: HierarchyApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTree();
  }

  loadTree(): void {
    this.loading = true;
    this.error = null;
    const market = this.selectedMarket || undefined;
    this.hierarchyApi.getTree(market).subscribe({
      next: (tree) => {
        this.tree = tree;
        this.allUsers = this.flattenTree(tree);
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load org structure.';
        this.loading = false;
      }
    });
  }

  filterByMarket(market: string): void {
    this.selectedMarket = market;
    this.loadTree();
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

  // --- Assign Manager ---

  openAssignModal(node: OrgTreeNode): void {
    this.assigningEmployeeId = node.userId;
    this.assigningEmployeeName = node.fullName;
    this.newManagerId = '';
    this.showAssignModal = true;
  }

  confirmAssign(): void {
    if (!this.assigningEmployeeId || !this.newManagerId) return;

    this.hierarchyApi.assignManager({
      employeeUserId: this.assigningEmployeeId,
      managerUserId: this.newManagerId
    }).subscribe({
      next: () => {
        this.showAssignModal = false;
        this.loadTree();
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to assign manager. Check for circular dependency.');
      }
    });
  }

  cancelAssign(): void {
    this.showAssignModal = false;
    this.assigningEmployeeId = null;
  }

  removeManager(node: OrgTreeNode): void {
    if (!confirm(`Remove manager assignment for ${node.fullName}?`)) return;
    this.hierarchyApi.removeManager(node.userId).subscribe({
      next: () => this.loadTree(),
      error: () => alert('Failed to remove manager.')
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

  private flattenTree(nodes: OrgTreeNode[]): { userId: string; fullName: string; role: string }[] {
    const result: { userId: string; fullName: string; role: string }[] = [];
    const walk = (list: OrgTreeNode[]) => {
      for (const n of list) {
        result.push({ userId: n.userId, fullName: n.fullName || 'Unknown', role: n.role || '' });
        if (n.directReports?.length) walk(n.directReports);
      }
    };
    walk(nodes);
    return result;
  }
}
