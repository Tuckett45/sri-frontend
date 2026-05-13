import {
  Component,
  Input,
  ChangeDetectionStrategy
} from '@angular/core';

import {
  DeploymentChecklist,
  ChecklistStatus,
  ChecklistItemResponse,
  EodEntry,
  REQUIRED_PICTURES_ITEMS,
  FINAL_INSPECTION_ITEMS
} from '../../../models/deployment-checklist.model';

/**
 * Checklist Print Component
 *
 * Renders a print-friendly layout of the entire deployment checklist.
 * Hidden on screen but visible when printing via @media print styles.
 * Also provides a PDF export method using jsPDF + autoTable.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */
@Component({
  selector: 'app-checklist-print',
  templateUrl: './checklist-print.component.html',
  styleUrls: ['./checklist-print.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistPrintComponent {
  @Input() checklist: DeploymentChecklist | null = null;
  @Input() jobId = '';
  @Input() checklistStatus: ChecklistStatus = ChecklistStatus.NotStarted;

  /** Constant references for the template */
  readonly requiredPicturesItems = REQUIRED_PICTURES_ITEMS;
  readonly finalInspectionItems = FINAL_INSPECTION_ITEMS;

  /** Generation timestamp set at render time */
  get generatedAt(): string {
    return new Date().toLocaleString();
  }

  // ---------------------------------------------------------------------------
  // Print
  // ---------------------------------------------------------------------------

  printChecklist(): void {
    window.print();
  }

  // ---------------------------------------------------------------------------
  // PDF Export
  // ---------------------------------------------------------------------------

  async exportPdf(): Promise<void> {
    if (!this.checklist) {
      return;
    }

    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // ---- Title / Header ----
    doc.setFontSize(18);
    doc.text('Deployment Checklist', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Job ID: ${this.jobId}`, 14, y);
    y += 5;
    doc.text(`Status: ${this.formatStatus(this.checklistStatus)}`, 14, y);
    y += 5;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
    y += 10;

    // ---- 1. Job Details Phase ----
    y = this.addSectionHeader(doc, 'Phase 1: Job Details', y);
    y = this.addJobDetailsPdf(doc, y);

    // ---- 2. Pre-Installation Phase ----
    y = this.checkPageBreak(doc, y, 30);
    y = this.addSectionHeader(doc, 'Phase 2: Pre-Installation', y);
    y = this.addPreInstallationPdf(doc, y);

    // ---- 3. EOD Reports Phase ----
    y = this.checkPageBreak(doc, y, 30);
    y = this.addSectionHeader(doc, 'Phase 3: End of Day Reports', y);
    y = this.addEodReportsPdf(doc, y);

    // ---- 4. Close-Out Phase ----
    y = this.checkPageBreak(doc, y, 30);
    y = this.addSectionHeader(doc, 'Phase 4: Close-Out', y);
    y = this.addCloseOutPdf(doc, y);

    doc.save(`deployment-checklist-${this.jobId}.pdf`);
  }

  // ---------------------------------------------------------------------------
  // PDF Helpers
  // ---------------------------------------------------------------------------

  private addSectionHeader(doc: any, title: string, y: number): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, y);
    doc.setFont('helvetica', 'normal');
    return y + 8;
  }

  private addJobDetailsPdf(doc: any, startY: number): number {
    const jd = this.checklist?.jobDetails;
    if (!jd) {
      return startY;
    }

    let y = startY;

    // Site info table
    const siteData = [
      ['Site Name', jd.siteName || '—'],
      ['Suite Number', jd.suiteNumber || '—'],
      ['Street', jd.street || '—'],
      ['City/State', jd.cityState || '—'],
      ['Zip Code', jd.zipCode || '—'],
      ['Job Start Date', this.formatDate(jd.jobStartDate)],
      ['Job Complete Date', this.formatDate(jd.jobCompleteDate)],
      ['Proposed Validation', this.formatDateTime(jd.proposedValidationDateTime)]
    ];

    (doc as any).autoTable({
      startY: y,
      head: [['Field', 'Value']],
      body: siteData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    // Job numbers
    y = this.checkPageBreak(doc, y, 20);
    const numberData: string[][] = [];
    if (jd.sriJobNumbers?.length) {
      numberData.push(['SRI Job Numbers', jd.sriJobNumbers.filter(Boolean).join(', ') || '—']);
    }
    if (jd.customerJobNumbers?.length) {
      numberData.push(['Customer Job Numbers', jd.customerJobNumbers.filter(Boolean).join(', ') || '—']);
    }
    if (jd.changeTickets?.length) {
      numberData.push(['Change Tickets', jd.changeTickets.filter(Boolean).join(', ') || '—']);
    }
    if (jd.siteAccessTickets?.length) {
      numberData.push(['Site Access Tickets', jd.siteAccessTickets.filter(Boolean).join(', ') || '—']);
    }

    if (numberData.length > 0) {
      (doc as any).autoTable({
        startY: y,
        head: [['Category', 'Values']],
        body: numberData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        margin: { left: 14, right: 14 }
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }

    // Contacts
    y = this.checkPageBreak(doc, y, 20);
    const contacts = [
      { label: 'Technical Lead', contact: jd.technicalLead },
      { label: 'Technician 1', contact: jd.technician1 },
      { label: 'Technician 2', contact: jd.technician2 },
      { label: 'SRI Project Lead', contact: jd.sriProjectLead },
      { label: 'Primary Customer Contact', contact: jd.primaryCustomerContact },
      { label: 'Secondary Customer Contact', contact: jd.secondaryCustomerContact }
    ];

    const contactData = contacts.map(c => [
      c.label,
      c.contact?.name || '—',
      c.contact?.phone || '—',
      c.contact?.email || '—'
    ]);

    (doc as any).autoTable({
      startY: y,
      head: [['Role', 'Name', 'Phone', 'Email']],
      body: contactData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    // Statement of Work
    if (jd.statementOfWork) {
      y = this.checkPageBreak(doc, y, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Statement of Work:', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      const lines = doc.splitTextToSize(jd.statementOfWork, doc.internal.pageSize.getWidth() - 28);
      doc.setFontSize(9);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 5;
    }

    return y;
  }

  private addPreInstallationPdf(doc: any, startY: number): number {
    const pi = this.checklist?.preInstallation;
    if (!pi?.items?.length) {
      doc.setFontSize(9);
      doc.text('No pre-installation data available.', 14, startY);
      return startY + 8;
    }

    const tableData = pi.items.map(item => [
      item.label,
      item.playbookReference || '—',
      this.formatResponse(item.response),
      item.notes || '—'
    ]);

    (doc as any).autoTable({
      startY,
      head: [['Item', 'Playbook Ref', 'Response', 'Notes']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 }
    });

    let y = (doc as any).lastAutoTable.finalY + 3;
    doc.setFontSize(9);
    doc.text(`Phase Marked Complete: ${pi.markedComplete ? 'Yes' : 'No'}`, 14, y);
    return y + 8;
  }

  private addEodReportsPdf(doc: any, startY: number): number {
    const entries = this.checklist?.eodEntries;
    if (!entries?.length) {
      doc.setFontSize(9);
      doc.text('No end of day reports submitted.', 14, startY);
      return startY + 8;
    }

    // Sort entries reverse chronological
    const sorted = [...entries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let y = startY;

    sorted.forEach((entry, idx) => {
      y = this.checkPageBreak(doc, y, 40);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`EOD Report ${idx + 1} — ${this.formatDate(entry.date)}`, 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Entry details table
      const entryData = [
        ['Personnel On-site', entry.personnelOnSite || '—'],
        ['Technical Lead', entry.technicalLeadName || '—'],
        ['Technicians', entry.technicianNames || '—'],
        ['Time In', entry.timeIn || '—'],
        ['Time Out', entry.timeOut || '—'],
        ['Customer Notification', `${entry.customerNotificationName || '—'} (${entry.customerNotificationMethod || '—'})`],
        ['Daily Pictures Provided', entry.dailyPicturesProvided ? 'Yes' : 'No'],
        ['EDP Redline Required', entry.edpRedlineRequired ? 'Yes' : 'No']
      ];

      (doc as any).autoTable({
        startY: y,
        body: entryData,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 }
        },
        margin: { left: 14, right: 14 }
      });
      y = (doc as any).lastAutoTable.finalY + 3;

      // Daily progress table
      y = this.checkPageBreak(doc, y, 25);
      const dp = entry.dailyProgress;
      if (dp) {
        const progressData = [
          ['Devices Racked', `${dp.devicesRacked ?? 0}%`],
          ['Devices Powered', `${dp.devicesPowered ?? 0}%`],
          ['Cabling Installed/Dressed', `${dp.cablingInstalledDressed ?? 0}%`],
          ['Cables Tested', `${dp.cablesTested ?? 0}%`],
          ['Labels Installed', `${dp.labelsInstalled ?? 0}%`],
          ['Customer Validation', `${dp.customerValidation ?? 0}%`]
        ];

        (doc as any).autoTable({
          startY: y,
          head: [['Progress Category', 'Completion']],
          body: progressData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [100, 100, 100], textColor: 255 },
          margin: { left: 14, right: 80 }
        });
        y = (doc as any).lastAutoTable.finalY + 3;
      }

      // Narratives
      y = this.checkPageBreak(doc, y, 20);
      const narratives = [
        { label: 'Work Completed Today', text: entry.workCompletedToday },
        { label: 'Issues/Roadblocks', text: entry.issuesRoadblocks },
        { label: 'Plan for Tomorrow', text: entry.planForTomorrow }
      ];

      narratives.forEach(n => {
        if (n.text) {
          y = this.checkPageBreak(doc, y, 15);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`${n.label}:`, 14, y);
          doc.setFont('helvetica', 'normal');
          y += 4;
          const lines = doc.splitTextToSize(n.text, doc.internal.pageSize.getWidth() - 28);
          doc.setFontSize(8);
          doc.text(lines, 14, y);
          y += lines.length * 3.5 + 4;
        }
      });

      y += 5;
    });

    return y;
  }

  private addCloseOutPdf(doc: any, startY: number): number {
    const co = this.checklist?.closeOut;
    if (!co) {
      doc.setFontSize(9);
      doc.text('No close-out data available.', 14, startY);
      return startY + 8;
    }

    let y = startY;

    // Equipment Hand-off
    const handoffData = [
      ['SRI Lead', co.sriLead?.name || '—', co.sriLead?.company || '—', this.formatDate(co.sriLead?.date ?? null)],
      ['Customer Lead', co.customerLead?.name || '—', co.customerLead?.company || '—', this.formatDate(co.customerLead?.date ?? null)]
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipment Hand-off', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 5;

    (doc as any).autoTable({
      startY: y,
      head: [['Role', 'Name', 'Company', 'Date']],
      body: handoffData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    y = (doc as any).lastAutoTable.finalY + 3;

    if (co.otherParticipants) {
      doc.setFontSize(9);
      doc.text(`Other Participants: ${co.otherParticipants}`, 14, y);
      y += 6;
    }

    // Required Pictures
    y = this.checkPageBreak(doc, y, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Required Pictures', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 5;

    if (co.requiredPictures?.length) {
      const picData = co.requiredPictures.map((item, idx) => [
        REQUIRED_PICTURES_ITEMS[idx]?.category || '—',
        item.label,
        this.formatResponse(item.response),
        item.notes || '—'
      ]);

      (doc as any).autoTable({
        startY: y,
        head: [['Category', 'Item', 'Response', 'Notes']],
        body: picData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        margin: { left: 14, right: 14 }
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }

    // Final Inspection
    y = this.checkPageBreak(doc, y, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Documentation & Final Inspection', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 5;

    if (co.finalInspectionItems?.length) {
      const inspData = co.finalInspectionItems.map(item => [
        item.label,
        this.formatResponse(item.response),
        item.notes || '—'
      ]);

      (doc as any).autoTable({
        startY: y,
        head: [['Item', 'Response', 'Notes']],
        body: inspData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        margin: { left: 14, right: 14 }
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }

    // Site Acceptance
    y = this.checkPageBreak(doc, y, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Site Acceptance', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 5;

    const sa = co.siteAcceptance;
    if (sa) {
      const saData = [
        ['Customer Name', sa.customerName || '—'],
        ['Customer Email', sa.customerEmail || '—'],
        ['Customer Phone', sa.customerPhone || '—'],
        ['Date/Time Accepted', this.formatDateTime(sa.dateTimeSiteAccepted)]
      ];

      (doc as any).autoTable({
        startY: y,
        body: saData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 }
        },
        margin: { left: 14, right: 14 }
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }

    return y;
  }

  private checkPageBreak(doc: any, y: number, requiredSpace: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + requiredSpace > pageHeight - 20) {
      doc.addPage();
      return 20;
    }
    return y;
  }

  // ---------------------------------------------------------------------------
  // Template Helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns sorted EOD entries (reverse chronological) for the print template.
   */
  getSortedEodEntries(): EodEntry[] {
    if (!this.checklist?.eodEntries?.length) {
      return [];
    }
    return [...this.checklist.eodEntries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Returns unique categories from REQUIRED_PICTURES_ITEMS, preserving order.
   */
  getPictureCategories(): string[] {
    const seen = new Set<string>();
    const categories: string[] = [];
    for (const item of REQUIRED_PICTURES_ITEMS) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        categories.push(item.category);
      }
    }
    return categories;
  }

  /**
   * Returns the required picture items for a given category, matched against
   * the checklist's close-out requiredPictures data.
   */
  getPictureItemsByCategory(category: string): { label: string; response: ChecklistItemResponse; notes: string }[] {
    const pictures = this.checklist?.closeOut?.requiredPictures ?? [];
    return REQUIRED_PICTURES_ITEMS
      .map((item, index) => ({
        ...item,
        response: pictures[index]?.response ?? null,
        notes: pictures[index]?.notes ?? ''
      }))
      .filter(item => item.category === category);
  }

  formatStatus(status: ChecklistStatus | string): string {
    switch (status) {
      case ChecklistStatus.Completed: return 'Completed';
      case ChecklistStatus.InProgress: return 'In Progress';
      case ChecklistStatus.NotStarted:
      default: return 'Not Started';
    }
  }

  formatResponse(response: ChecklistItemResponse): string {
    switch (response) {
      case 'Yes': return 'Yes';
      case 'No': return 'No';
      case 'NotApplicable': return 'N/A';
      default: return '—';
    }
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    try {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return value;
    }
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return value;
    }
  }

  formatTime(timeStr: string): string {
    if (!timeStr) {
      return '—';
    }
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  }
}
