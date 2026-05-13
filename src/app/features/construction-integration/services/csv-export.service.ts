import { Injectable } from '@angular/core';
import { Project, ResourceAllocation, Issue } from '../models/construction.models';

@Injectable()
export class CsvExportService {

  exportForecast(projects: Project[], allocations: ResourceAllocation[], year: number): void {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const header = ['Project', 'Client', 'Location', 'Category', ...months, 'Total'];

    const rows = projects.map(project => {
      const projectAllocations = allocations.filter(a => a.projectId === project.id);
      const monthValues = Array.from({ length: 12 }, (_, i) => {
        const alloc = projectAllocations.find(a => a.month === i + 1);
        return alloc ? alloc.headcount : 0;
      });
      const total = monthValues.reduce((sum, v) => sum + v, 0);
      return [project.name, project.clientName, project.location, project.category, ...monthValues, total];
    });

    const csv = [header, ...rows].map(row => row.map(cell => this.escapeCsvCell(String(cell))).join(',')).join('\n');
    this.triggerDownload(csv, `forecast-${year}-${this.formatDate(new Date())}.csv`);
  }

  exportIssues(issues: Issue[]): void {
    const header = ['Project ID', 'Description', 'Severity', 'Status', 'Assigned User', 'Created Date'];

    const rows = issues.map(issue => [
      issue.projectId,
      issue.description,
      issue.severity,
      issue.status,
      issue.assignedUserId ?? '',
      issue.createdDate
    ]);

    const csv = [header, ...rows].map(row => row.map(cell => this.escapeCsvCell(String(cell))).join(',')).join('\n');
    this.triggerDownload(csv, `issues-${this.formatDate(new Date())}.csv`);
  }

  private escapeCsvCell(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private triggerDownload(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
