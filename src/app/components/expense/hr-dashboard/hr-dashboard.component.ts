import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseApiService } from '../../../services/expense-api.service';
import { ExpenseListItem, ExpenseCategory, ExpenseStatus } from '../../../models/expense.model';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

interface DashboardStats {
  totalExpenses: number;
  totalAmount: number;
  averageExpense: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingAmount: number;
  approvedAmount: number;
}

interface CategoryStats {
  category: string;
  count: number;
  amount: number;
}

interface EmployeeStats {
  employeeName: string;
  count: number;
  amount: number;
}

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ChartModule,
    CardModule,
    TableModule,
    CalendarModule,
    FormsModule
  ],
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.scss']
})
export class HrDashboardComponent implements OnInit {
  // Data
  expenses: ExpenseListItem[] = [];
  stats: DashboardStats = {
    totalExpenses: 0,
    totalAmount: 0,
    averageExpense: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingAmount: 0,
    approvedAmount: 0
  };

  // Date filters
  startDate: Date | null = null;
  endDate: Date | null = null;

  // Charts data
  categoryChartData: any;
  statusChartData: any;
  trendChartData: any;
  employeeChartData: any;

  // Chart options
  chartOptions: any;
  barChartOptions: any;
  pieChartOptions: any;

  // Table data
  categoryStats: CategoryStats[] = [];
  employeeStats: EmployeeStats[] = [];
  recentExpenses: ExpenseListItem[] = [];

  loading = true;

  constructor(
    private expenseService: ExpenseApiService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Set default date range to current month
    const now = new Date();
    this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.initializeChartOptions();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Load all expenses for HR
    this.expenseService.listAllExpensesForHR().subscribe({
      next: (response: any) => {
        this.expenses = response.items || [];
        this.filterAndCalculateStats();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading expenses:', err);
        this.toastr.error('Failed to load expense data');
        this.loading = false;
      }
    });
  }

  onDateRangeChange(): void {
    this.filterAndCalculateStats();
  }

  filterAndCalculateStats(): void {
    // Filter expenses by date range
    let filteredExpenses = this.expenses;
    
    if (this.startDate || this.endDate) {
      filteredExpenses = this.expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        
        if (this.startDate && expenseDate < this.startDate) {
          return false;
        }
        if (this.endDate && expenseDate > this.endDate) {
          return false;
        }
        return true;
      });
    }

    // Calculate stats
    this.calculateStats(filteredExpenses);
    this.calculateCategoryStats(filteredExpenses);
    this.calculateEmployeeStats(filteredExpenses);
    this.prepareChartData(filteredExpenses);
    this.getRecentExpenses(filteredExpenses);
  }

  calculateStats(expenses: ExpenseListItem[]): void {
    this.stats = {
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      averageExpense: 0,
      pendingCount: expenses.filter(e => e.status === ExpenseStatus.Pending).length,
      approvedCount: expenses.filter(e => e.status === ExpenseStatus.Approved).length,
      rejectedCount: expenses.filter(e => e.status === ExpenseStatus.Rejected).length,
      pendingAmount: expenses.filter(e => e.status === ExpenseStatus.Pending).reduce((sum, e) => sum + (e.amount || 0), 0),
      approvedAmount: expenses.filter(e => e.status === ExpenseStatus.Approved).reduce((sum, e) => sum + (e.amount || 0), 0)
    };

    this.stats.averageExpense = this.stats.totalExpenses > 0 
      ? this.stats.totalAmount / this.stats.totalExpenses 
      : 0;
  }

  calculateCategoryStats(expenses: ExpenseListItem[]): void {
    const categoryMap = new Map<string, CategoryStats>();

    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      const existing = categoryMap.get(category);

      if (existing) {
        existing.count++;
        existing.amount += expense.amount || 0;
      } else {
        categoryMap.set(category, {
          category,
          count: 1,
          amount: expense.amount || 0
        });
      }
    });

    this.categoryStats = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount);
  }

  calculateEmployeeStats(expenses: ExpenseListItem[]): void {
    const employeeMap = new Map<string, EmployeeStats>();

    expenses.forEach(expense => {
      const employeeName = expense.createdBy || 'Unknown';
      const existing = employeeMap.get(employeeName);

      if (existing) {
        existing.count++;
        existing.amount += expense.amount || 0;
      } else {
        employeeMap.set(employeeName, {
          employeeName,
          count: 1,
          amount: expense.amount || 0
        });
      }
    });

    this.employeeStats = Array.from(employeeMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Top 10 employees
  }

  prepareChartData(expenses: ExpenseListItem[]): void {
    // Category chart (Pie)
    const categoryLabels = this.categoryStats.map(c => c.category);
    const categoryAmounts = this.categoryStats.map(c => c.amount);

    this.categoryChartData = {
      labels: categoryLabels,
      datasets: [{
        data: categoryAmounts,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ]
      }]
    };

    // Status chart (Doughnut)
    this.statusChartData = {
      labels: ['Pending', 'Approved', 'Rejected'],
      datasets: [{
        data: [this.stats.pendingCount, this.stats.approvedCount, this.stats.rejectedCount],
        backgroundColor: ['#FFA726', '#66BB6A', '#EF5350']
      }]
    };

    // Employee chart (Bar)
    const employeeLabels = this.employeeStats.map(e => e.employeeName);
    const employeeAmounts = this.employeeStats.map(e => e.amount);

    this.employeeChartData = {
      labels: employeeLabels,
      datasets: [{
        label: 'Total Amount',
        data: employeeAmounts,
        backgroundColor: '#42A5F5'
      }]
    };

    // Trend chart (Line) - Group by month
    this.prepareTrendChartData(expenses);
  }

  prepareTrendChartData(expenses: ExpenseListItem[]): void {
    // Group expenses by month
    const monthMap = new Map<string, number>();

    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = monthMap.get(monthKey);
      monthMap.set(monthKey, (existing || 0) + (expense.amount || 0));
    });

    // Sort by month
    const sortedMonths = Array.from(monthMap.keys()).sort();
    const amounts = sortedMonths.map(month => monthMap.get(month) || 0);

    // Format labels (e.g., "Jan 2024")
    const labels = sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    this.trendChartData = {
      labels,
      datasets: [{
        label: 'Monthly Expenses',
        data: amounts,
        fill: false,
        borderColor: '#42A5F5',
        tension: 0.4
      }]
    };
  }

  getRecentExpenses(expenses: ExpenseListItem[]): void {
    this.recentExpenses = [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }

  initializeChartOptions(): void {
    this.pieChartOptions = {
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      responsive: true,
      maintainAspectRatio: false
    };

    this.barChartOptions = {
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => '$' + value.toLocaleString()
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    };

    this.chartOptions = {
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => '$' + value.toLocaleString()
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    };
  }

  formatCurrency(value: number): string {
    return '$' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case ExpenseStatus.Approved:
        return 'status-approved';
      case ExpenseStatus.Rejected:
        return 'status-rejected';
      case ExpenseStatus.Pending:
        return 'status-pending';
      default:
        return '';
    }
  }
}

