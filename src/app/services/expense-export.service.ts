// src/app/services/expense-export.service.ts
import { Injectable } from '@angular/core';
import { Expense, ExpenseCategory } from '../models/expense.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportOptions {
  groupBy?: 'employee' | 'job' | 'category' | 'none';
  includeSubtotals?: boolean;
  includeSummary?: boolean;
  dateRange?: { start: string; end: string };
  title?: string;
}

interface GroupedExpenses {
  groupName: string;
  expenses: Expense[];
  subtotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseExportService {

  constructor() {}

  /**
   * Export expenses to CSV with optional grouping and formatting
   */
  exportToCSV(expenses: Expense[], options: ExportOptions = {}): void {
    const {
      groupBy = 'none',
      includeSubtotals = true,
      includeSummary = true,
      dateRange,
      title = 'Expenses Report'
    } = options;

    let csvContent = this.generateCSVHeader(title, dateRange);

    if (groupBy === 'none') {
      csvContent += this.generateCSVRows(expenses);
      if (includeSummary) {
        csvContent += this.generateCSVSummary(expenses);
      }
    } else {
      const grouped = this.groupExpenses(expenses, groupBy);
      grouped.forEach(group => {
        csvContent += `\n"${this.getGroupLabel(groupBy)}: ${group.groupName}"\n`;
        csvContent += this.generateCSVRows(group.expenses);
        if (includeSubtotals) {
          csvContent += `"","","","Subtotal:",${group.subtotal.toFixed(2)}\n`;
        }
      });
      if (includeSummary) {
        csvContent += this.generateCSVSummary(expenses);
      }
    }

    this.downloadCSV(csvContent, `expenses-${groupBy}-${this.getTimestamp()}.csv`);
  }

  /**
   * Export expenses to PDF with optional grouping and formatting
   */
  exportToPDF(expenses: Expense[], options: ExportOptions = {}): void {
    const {
      groupBy = 'none',
      includeSubtotals = true,
      includeSummary = true,
      dateRange,
      title = 'Expenses Report'
    } = options;

    const doc = new jsPDF();
    let yPosition = 20;

    // Add header
    doc.setFontSize(16);
    doc.text(title, 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPosition);
    yPosition += 5;

    if (dateRange) {
      doc.text(`Date Range: ${dateRange.start} to ${dateRange.end}`, 14, yPosition);
      yPosition += 5;
    }

    yPosition += 5;

    if (groupBy === 'none') {
      this.addPDFTable(doc, expenses, yPosition);
    } else {
      const grouped = this.groupExpenses(expenses, groupBy);
      grouped.forEach((group, index) => {
        if (index > 0) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.text(`${this.getGroupLabel(groupBy)}: ${group.groupName}`, 14, yPosition);
        yPosition += 7;

        this.addPDFTable(doc, group.expenses, yPosition);

        if (includeSubtotals) {
          yPosition = (doc as any).lastAutoTable.finalY + 5;
          doc.setFontSize(10);
          doc.text(`Subtotal: $${group.subtotal.toFixed(2)}`, 14, yPosition);
        }
      });
    }

    if (includeSummary) {
      doc.addPage();
      this.addPDFSummary(doc, expenses, 20);
    }

    doc.save(`expenses-${groupBy}-${this.getTimestamp()}.pdf`);
  }

  /**
   * Group expenses by the specified field
   */
  private groupExpenses(expenses: Expense[], groupBy: 'employee' | 'job' | 'category'): GroupedExpenses[] {
    const groupMap = new Map<string, Expense[]>();

    expenses.forEach(expense => {
      let key: string;
      switch (groupBy) {
        case 'employee':
          key = expense.createdBy || 'Unknown Employee';
          break;
        case 'job':
          key = expense.projectId || 'No Job';
          break;
        case 'category':
          key = expense.category || 'Uncategorized';
          break;
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(expense);
    });

    const result: GroupedExpenses[] = [];
    groupMap.forEach((expenses, groupName) => {
      const subtotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      result.push({ groupName, expenses, subtotal });
    });

    return result.sort((a, b) => a.groupName.localeCompare(b.groupName));
  }

  /**
   * Generate CSV header with metadata
   */
  private generateCSVHeader(title: string, dateRange?: { start: string; end: string }): string {
    let header = `"${title}"\n`;
    header += `"Generated: ${new Date().toLocaleString()}"\n`;
    if (dateRange) {
      header += `"Date Range: ${dateRange.start} to ${dateRange.end}"\n`;
    }
    header += '\n';
    header += '"Date","Week Ending","Employee","Job","Category","Vendor","Amount","Notes","Details"\n';
    return header;
  }

  /**
   * Generate CSV rows from expenses
   */
  private generateCSVRows(expenses: Expense[]): string {
    return expenses.map(exp => {
      const date = (exp.date || '').replace(/"/g, '""');
      const weekEnding = (exp.weekEndingDate || '').replace(/"/g, '""');
      const employee = (exp.createdBy || '').replace(/"/g, '""');
      const job = (exp.projectId || '').replace(/"/g, '""');
      const category = (exp.category || '').replace(/"/g, '""');
      const vendor = (exp.vendor || '').replace(/"/g, '""');
      const amount = (exp.amount || 0).toFixed(2);
      const notes = (exp.descriptionNotes || '').replace(/"/g, '""');
      const details = this.buildDetails(exp).replace(/"/g, '""');
      
      return `"${date}","${weekEnding}","${employee}","${job}","${category}","${vendor}",${amount},"${notes}","${details}"`;
    }).join('\n') + '\n';
  }

  /**
   * Generate CSV summary section
   */
  private generateCSVSummary(expenses: Expense[]): string {
    const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const count = expenses.length;
    const average = count > 0 ? total / count : 0;

    let summary = '\n"Summary"\n';
    summary += `"Total Expenses:",${count}\n`;
    summary += `"Total Amount:","$${total.toFixed(2)}"\n`;
    summary += `"Average Amount:","$${average.toFixed(2)}"\n`;

    // Category breakdown
    const categoryTotals = new Map<string, number>();
    expenses.forEach(exp => {
      const cat = exp.category || 'Uncategorized';
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + (exp.amount || 0));
    });

    summary += '\n"Breakdown by Category"\n';
    summary += '"Category","Amount"\n';
    categoryTotals.forEach((amount, category) => {
      summary += `"${category}","$${amount.toFixed(2)}"\n`;
    });

    return summary;
  }

  /**
   * Add table to PDF document
   */
  private addPDFTable(doc: jsPDF, expenses: Expense[], startY: number): void {
    const tableData = expenses.map(exp => [
      exp.date || '',
      exp.weekEndingDate || '',
      exp.createdBy || '',
      exp.projectId || '',
      exp.category || '',
      exp.vendor || '',
      `$${(exp.amount || 0).toFixed(2)}`,
      this.truncateText(exp.descriptionNotes || '', 30)
    ]);

    autoTable(doc, {
      startY,
      head: [['Date', 'Week Ending', 'Employee', 'Job', 'Category', 'Vendor', 'Amount', 'Notes']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      columnStyles: {
        6: { halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    const detailsStartY = ((doc as any).lastAutoTable?.finalY ?? startY) + 10;
    this.addPDFDetailsSection(doc, expenses, detailsStartY);
  }

  /**
   * Add summary section to PDF
   */
  private addPDFSummary(doc: jsPDF, expenses: Expense[], startY: number): void {
    const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const count = expenses.length;
    const average = count > 0 ? total / count : 0;

    doc.setFontSize(14);
    doc.text('Summary', 14, startY);
    startY += 10;

    doc.setFontSize(10);
    doc.text(`Total Expenses: ${count}`, 14, startY);
    startY += 6;
    doc.text(`Total Amount: $${total.toFixed(2)}`, 14, startY);
    startY += 6;
    doc.text(`Average Amount: $${average.toFixed(2)}`, 14, startY);
    startY += 12;

    // Category breakdown
    const categoryTotals = new Map<string, number>();
    expenses.forEach(exp => {
      const cat = exp.category || 'Uncategorized';
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + (exp.amount || 0));
    });

    doc.text('Breakdown by Category:', 14, startY);
    startY += 8;

    const categoryData: any[] = [];
    categoryTotals.forEach((amount, category) => {
      categoryData.push([category, `$${amount.toFixed(2)}`]);
    });

    autoTable(doc, {
      startY,
      head: [['Category', 'Amount']],
      body: categoryData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: {
        1: { halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });
  }

  /**
   * Render detailed sections for entertainment / mileage data on PDF
   */
  private addPDFDetailsSection(doc: jsPDF, expenses: Expense[], startY: number): void {
    let yPosition = startY;
    const pageHeight = doc.internal.pageSize.getHeight();

    const addSectionHeader = () => {
      doc.setFontSize(12);
      doc.text('Expense Details', 14, yPosition);
      yPosition += 6;
    };

    addSectionHeader();

    expenses.forEach(exp => {
      const detail = this.buildDetails(exp);
      if (!detail) {
        return;
      }

      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
        addSectionHeader();
      }

      const label = `${this.formatDisplayDate(exp.date)} • ${exp.vendor || 'Unknown Vendor'}`;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      const detailLines = doc.splitTextToSize(detail, doc.internal.pageSize.getWidth() - 28);
      doc.text(detailLines, 14, yPosition);
      yPosition += detailLines.length * 5 + 6;
    });
  }

  /**
   * Build a detail string combining entertainment + mileage info
   */
  private buildDetails(expense: Expense): string {
    const sections: string[] = [];

    if (expense.entertainment) {
      const ent = expense.entertainment;
      const entParts: string[] = [];
      if (ent.typeOfEntertainment) entParts.push(`Type: ${ent.typeOfEntertainment}`);
      if (ent.nameOfEstablishment) entParts.push(`Establishment: ${ent.nameOfEstablishment}`);
      if (ent.numberInParty != null) entParts.push(`Party: ${ent.numberInParty}`);
      if (ent.businessRelationship) entParts.push(`Relationship: ${ent.businessRelationship}`);
      if (ent.attendees) entParts.push(`Attendees: ${ent.attendees}`);
      if (ent.businessPurpose) entParts.push(`Purpose: ${ent.businessPurpose}`);
      if (entParts.length) {
        sections.push(`Entertainment (${entParts.join(', ')})`);
      }
    }

    if (expense.mileage && expense.mileage.length) {
      const totalMiles = expense.mileage.reduce((sum, entry) => sum + (entry.totalMiles || 0), 0);
      const entryDetails = expense.mileage.map(entry => {
        const segments: string[] = [];
        if (entry.date) segments.push(entry.date);
        const route = [entry.fromLocation, entry.toLocation].filter(Boolean).join(' → ');
        if (route) segments.push(route);
        if (entry.totalMiles != null) segments.push(`${entry.totalMiles} mi`);
        if (entry.reasonForTravel) segments.push(entry.reasonForTravel);
        return segments.join(' | ');
      }).filter(Boolean);

      const mileageParts = [`Total: ${totalMiles} mi`];
      if (entryDetails.length) {
        mileageParts.push(entryDetails.join(' || '));
      }
      sections.push(`Mileage (${mileageParts.join(' | ')})`);
    }

    return sections.join(' | ');
  }

  private formatDisplayDate(value?: string | Date | null): string {
    if (!value) return 'Unknown Date';
    const parsed = value instanceof Date ? value : new Date(value);
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return typeof value === 'string' ? value : 'Unknown Date';
    }
    return parsed.toLocaleDateString();
  }

  /**
   * Download CSV file
   */
  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get human-readable group label
   */
  private getGroupLabel(groupBy: string): string {
    switch (groupBy) {
      case 'employee': return 'Employee';
      case 'job': return 'Job';
      case 'category': return 'Category';
      default: return 'Group';
    }
  }

  /**
   * Generate timestamp for filenames
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

