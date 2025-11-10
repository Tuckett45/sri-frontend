import { Component, OnInit } from '@angular/core';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { Expense } from 'src/app/models/expense.model';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseReportModalComponent } from '../modals/expense-report-modal/expense-report-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { UserRole } from 'src/app/models/role.enum';

@Component({
  selector: 'app-expense',
  templateUrl: './expense.component.html',
  styleUrls: ['./expense.component.scss']
})
export class ExpenseComponent implements OnInit {
  expenses: Expense[] = [];
  loading = false;
  isReceiptGalleryVisible = false;
  galleryImages: any[] = [];
  readonly canViewHrTab: boolean;
  readonly canManageTimecards: boolean;
  readonly hrTabValue = 'hr';
  readonly myTabValue = 'my';
  readonly financeExpensesTabValue = 'expenses';
  readonly financeTimecardsTabValue = 'timecards';
  readonly timecardHrTabValue = 'timecard-hr';
  readonly timecardMyTabValue = 'timecard-my';
  readonly timecardDashboardTabValue = 'timecard-dashboard';
  activeFinanceTab = this.financeExpensesTabValue;
  activeExpenseTab: string;
  activeTimecardTab: string;

  constructor(
    private expenseApi: ExpenseApiService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.canViewHrTab = this.isHrUser();
    this.canManageTimecards = this.isHrUser() || this.authService.isAdmin();
    this.activeExpenseTab = this.canViewHrTab ? this.hrTabValue : this.myTabValue;
    this.activeTimecardTab = this.canManageTimecards ? this.timecardHrTabValue : this.timecardMyTabValue;
  }

  ngOnInit(): void {
    if (!this.canViewHrTab) {
      this.activeExpenseTab = this.myTabValue;
    }
    if (!this.canManageTimecards) {
      this.activeTimecardTab = this.timecardMyTabValue;
    }
  }

  private isHrUser(): boolean {
    const roleFromUser = this.authService.getUser()?.role;
    const fallbackRole = this.authService.getUserRole() as unknown as string;
    const role = roleFromUser ?? fallbackRole;
    const hrRoles: Array<string> = [UserRole.HR, 'HR'];
    return !!role && hrRoles.includes(role);
  }

  loadExpenses(): void {
  this.loading = true;

  const opts: any = { page: 1, pageSize: 200 };
  if (!this.canViewHrTab) {
    const me = this.authService.getUser()?.id;
    if (me) opts.createdBy = me;
  }

    this.expenseApi.getExpensesFlat(opts).subscribe({
      next: items => { this.expenses = items; this.loading = false; },
      error: err => { this.toastr.error('Failed to load expenses'); this.loading = false; console.error(err); }
    });
  }

}
