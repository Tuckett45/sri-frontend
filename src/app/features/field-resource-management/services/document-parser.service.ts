import { Injectable } from '@angular/core';
import {
  ParsedJobDocument,
  PerDiemTier,
  PhaseCode,
  DocumentContact
} from '../models/job-document-import.model';

/**
 * Client-side document parser service.
 *
 * Extracts text from DOCX, PDF, and TXT files, then uses pattern matching
 * to identify structured job documentation fields (addresses, contacts,
 * per diem rules, phase codes, safety info, etc.).
 */
@Injectable({ providedIn: 'root' })
export class DocumentParserService {

  /**
   * Extracts raw text from a file based on its type.
   */
  async extractText(file: File): Promise<string> {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
      return this.extractFromDocx(file);
    }
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return this.extractFromPdf(file);
    }
    // Default: treat as plain text
    return this.extractFromTxt(file);
  }

  /**
   * Parses raw text into structured job document data.
   */
  parseText(text: string): ParsedJobDocument {
    const result: ParsedJobDocument = {
      rawText: text
    };

    // Normalize line endings
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    this.extractSiteAddress(normalized, result);
    this.extractSiteLead(normalized, result);
    this.extractScopOfWork(normalized, result);
    this.extractWorkSchedule(normalized, result);
    this.extractPerDiem(normalized, result);
    this.extractPhaseCodes(normalized, result);
    this.extractContacts(normalized, result);
    this.extractOrientation(normalized, result);
    this.extractPPE(normalized, result);
    this.extractTools(normalized, result);
    this.extractSafety(normalized, result);
    this.extractWorkAttire(normalized, result);
    this.extractPTO(normalized, result);
    this.extractHolidayPay(normalized, result);
    this.extractClientName(normalized, result);

    return result;
  }

  /**
   * Full pipeline: extract text then parse it.
   */
  async parseFile(file: File): Promise<ParsedJobDocument> {
    const text = await this.extractText(file);
    return this.parseText(text);
  }

  // ---------------------------------------------------------------------------
  // Text Extraction
  // ---------------------------------------------------------------------------

  private async extractFromDocx(file: File): Promise<string> {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  private async extractFromPdf(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source
    const pdfjsVersion = (pdfjsLib as any).version || '4.4.168';
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      pages.push(pageText);
    }

    return pages.join('\n');
  }

  private async extractFromTxt(file: File): Promise<string> {
    return file.text();
  }

  // ---------------------------------------------------------------------------
  // Field Extraction (Pattern Matching)
  // ---------------------------------------------------------------------------

  private extractClientName(text: string, result: ParsedJobDocument): void {
    // Look for patterns like "SRI - Huntsville" or "SRI - IES Huntsville"
    // The first line often contains the project/client name
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // If it looks like "Company - Location" or just a title
      if (firstLine.length < 100) {
        result.siteName = firstLine;
      }
    }
  }

  private extractSiteAddress(text: string, result: ParsedJobDocument): void {
    // Look for "Jobsite Address:" or "Site Address:" pattern
    const addressMatch = text.match(/(?:Jobsite|Site|Job\s*Site)\s*Address\s*[:：]\s*(.+)/i);
    if (addressMatch) {
      const addressStr = addressMatch[1].trim();
      const parsed = this.parseAddressString(addressStr);
      if (parsed) {
        result.siteAddress = parsed;
      }
    }
  }

  private extractSiteLead(text: string, result: ParsedJobDocument): void {
    // Look for "Site Lead:" pattern with name and phone
    const leadMatch = text.match(/Site\s*Lead\s*[:：]\s*([^\n(]+)\s*\(?([\d\-() ]+)\)?/i);
    if (leadMatch) {
      result.siteLead = {
        name: leadMatch[1].trim(),
        phone: leadMatch[2].trim()
      };
    }

    // Also check contacts section for site lead email
    const emailMatch = text.match(/Site\s*Lead\s*[–\-—]\s*(\S+@\S+)/i);
    if (emailMatch && result.siteLead) {
      result.siteLead.email = emailMatch[1].trim();
    }
  }

  private extractScopOfWork(text: string, result: ParsedJobDocument): void {
    const scopeMatch = text.match(/Scope\s*(?:of\s*Work)?\s*[:：]\s*([^\n]+)/i);
    if (scopeMatch) {
      result.scopeOfWork = scopeMatch[1].trim();
    }
  }

  private extractWorkSchedule(text: string, result: ParsedJobDocument): void {
    const scheduleMatch = text.match(/Work\s*Schedule\s*[:：]\s*([^\n]+)/i);
    if (scheduleMatch) {
      result.workSchedule = scheduleMatch[1].trim();
    }
  }

  private extractPerDiem(text: string, result: ParsedJobDocument): void {
    const tiers: PerDiemTier[] = [];

    // Match patterns like "0-60 miles – NO PER DIEM" or "90+ miles - $150 per overnight stay"
    const tierRegex = /(\d+[\-–—]\d+|\d+\+)\s*miles?\s*[–\-—:]\s*(?:NO PER DIEM|\$?(\d+)\s*(?:per\s+)?([^\n·•]+))/gi;
    let match: RegExpExecArray | null;

    while ((match = tierRegex.exec(text)) !== null) {
      const tier: PerDiemTier = {
        distanceRange: match[1].replace(/[–—]/g, '-') + ' miles',
        amount: match[2] ? parseInt(match[2], 10) : 0,
        frequency: match[3]?.trim() || 'N/A'
      };
      tiers.push(tier);
    }

    if (tiers.length > 0) {
      result.perDiemRules = tiers;
      // Use the highest tier as the main per diem value
      const maxTier = tiers.reduce((max, t) => t.amount > max.amount ? t : max, tiers[0]);
      if (maxTier.amount > 0) {
        result.perDiem = maxTier.amount;
      }
    }
  }

  private extractPhaseCodes(text: string, result: ParsedJobDocument): void {
    const codes: PhaseCode[] = [];

    // Match patterns like "Daily Work – 410 ** Job # 46437 / Type "R""
    const codeRegex = /([A-Za-z\s]+?)\s*[–\-—]\s*(\d{3})\s*\*{0,2}\s*(?:Job\s*#?\s*(\d+))?\s*(?:\/\s*Type\s*[""]?(\w+)[""]?)?/gi;
    let match: RegExpExecArray | null;

    while ((match = codeRegex.exec(text)) !== null) {
      const desc = match[1].trim();
      // Skip if description is too short or looks like noise
      if (desc.length < 2 || desc.length > 50) continue;

      codes.push({
        description: desc,
        code: match[2],
        jobNumber: match[3] || undefined,
        type: match[4] || undefined
      });
    }

    if (codes.length > 0) {
      result.payroll = {
        ...result.payroll,
        phaseCodes: codes
      };
    }

    // Extract pay frequency
    const payFreqMatch = text.match(/(?:employees?\s+are\s+)?paid\s+(weekly|bi-?weekly|monthly)/i);
    if (payFreqMatch) {
      result.payroll = {
        ...result.payroll,
        payFrequency: payFreqMatch[1]
      };
    }

    // Extract timesheet deadline
    const deadlineMatch = text.match(/(?:Deadline|due)\s+(?:for\s+)?timesheets?\s+(?:is\s+)?([^\n.]+)/i);
    if (deadlineMatch) {
      result.payroll = {
        ...result.payroll,
        timesheetDeadline: deadlineMatch[1].trim()
      };
    }
  }

  private extractContacts(text: string, result: ParsedJobDocument): void {
    const contacts: DocumentContact[] = [];

    // Match patterns like "Human Resources – Humanresources@sritelecom.net Olivia Cunningham"
    // or "Role – email Name"
    const contactRegex = /([A-Za-z\s&]+?)\s*[–\-—]\s*(\S+@\S+)\s+([A-Za-z\s]+?)(?:\n|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = contactRegex.exec(text)) !== null) {
      const role = match[1].trim();
      if (role.length < 2 || role.length > 40) continue;

      contacts.push({
        role,
        name: match[3].trim(),
        email: match[2].trim()
      });
    }

    if (contacts.length > 0) {
      result.contacts = contacts;
    }
  }

  private extractOrientation(text: string, result: ParsedJobDocument): void {
    const orientMatch = text.match(/Orientation\s*[:：]\s*([^\n/]+)(?:\s*\/\s*(.+))?/i);
    if (orientMatch) {
      result.orientation = {
        address: orientMatch[1].trim(),
        arrivalTime: orientMatch[2]?.trim()
      };
    }

    // Also look for "Arrive by" pattern
    if (!result.orientation?.arrivalTime) {
      const arriveMatch = text.match(/Arrive\s+by\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      if (arriveMatch) {
        result.orientation = {
          ...result.orientation,
          arrivalTime: arriveMatch[1].trim()
        };
      }
    }
  }

  private extractPPE(text: string, result: ParsedJobDocument): void {
    const ppeMatch = text.match(/Required\s*PPE\s*[:：]\s*([^\n]+)/i);
    if (ppeMatch) {
      const items = ppeMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
      result.requiredPPE = items;
    }

    // Also look for PPE mentioned in safety section
    const safetyPPE = text.match(/(?:wear|required).*?(hard\s*hat|steel[- ]toe(?:d)?\s*boots|safety\s*glasses|cut\s*resistant\s*gloves)/gi);
    if (safetyPPE && !result.requiredPPE) {
      result.requiredPPE = [...new Set(safetyPPE.map(s => s.replace(/^.*?(?=hard|steel|safety|cut)/i, '').trim()))];
    }
  }

  private extractTools(text: string, result: ParsedJobDocument): void {
    const toolsMatch = text.match(/Required\s*Tools?\s*[:：]\s*([^\n]+)/i);
    if (toolsMatch) {
      const items = toolsMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
      result.requiredTools = items;
    }
  }

  private extractSafety(text: string, result: ParsedJobDocument): void {
    // Extract the safety section
    const safetyStart = text.search(/\bSAFETY\b/i);
    if (safetyStart > -1) {
      // Grab text from SAFETY header until next major section or end
      const afterSafety = text.substring(safetyStart);
      const nextSection = afterSafety.search(/\n(?:CONTACTS|PAYROLL|PTO|HOLIDAY|REFERRAL)\b/i);
      const safetyText = nextSection > -1
        ? afterSafety.substring(0, nextSection)
        : afterSafety.substring(0, 500);
      result.safetyNotes = safetyText.trim();
    }
  }

  private extractWorkAttire(text: string, result: ParsedJobDocument): void {
    const attireMatch = text.match(/Work\s*Attire\s*[:：]\s*([^\n]+)/i);
    if (attireMatch) {
      result.workAttire = attireMatch[1].trim();
    }
  }

  private extractPTO(text: string, result: ParsedJobDocument): void {
    const ptoStart = text.search(/PTO\s*\(?Paid\s*Time\s*Off\)?/i);
    if (ptoStart > -1) {
      const afterPTO = text.substring(ptoStart);
      const nextSection = afterPTO.search(/\n(?:HOLIDAY|REFERRAL|SAFETY|CONTACTS)\b/i);
      const ptoText = nextSection > -1
        ? afterPTO.substring(0, nextSection)
        : afterPTO.substring(0, 400);
      result.ptoRules = ptoText.trim();
    }
  }

  private extractHolidayPay(text: string, result: ParsedJobDocument): void {
    const holidayMatch = text.match(/HOLIDAY\s*PAY\s*\n([\s\S]*?)(?=\n(?:REFERRAL|SAFETY|CONTACTS|$))/i);
    if (holidayMatch) {
      result.holidayPay = holidayMatch[1].trim();
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parseAddressString(address: string): ParsedJobDocument['siteAddress'] | null {
    // Try to parse "1278 Monroe Rd Toney, AL 35773" style addresses
    // Pattern: street, city, state zip
    const match = address.match(/^(.+?)\s*,?\s*([A-Za-z\s]+?)\s*,?\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (match) {
      return {
        street: match[1].trim(),
        city: match[2].trim(),
        state: match[3].trim(),
        zipCode: match[4].trim()
      };
    }

    // Try simpler pattern: everything before last comma-state-zip
    const simpleMatch = address.match(/^(.+?)\s+([A-Za-z\s]+?)\s*,?\s*([A-Z]{2})\s+(\d{5})/);
    if (simpleMatch) {
      return {
        street: simpleMatch[1].trim(),
        city: simpleMatch[2].trim(),
        state: simpleMatch[3].trim(),
        zipCode: simpleMatch[4].trim()
      };
    }

    // Fallback: just store the whole thing as street
    return { street: address };
  }
}
