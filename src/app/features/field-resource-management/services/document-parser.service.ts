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

      // Reconstruct text with line breaks by detecting Y-position changes.
      // This preserves the document's line structure instead of joining everything
      // with spaces (which would make newline-based pattern matching fail).
      let lastY: number | null = null;
      const lineFragments: string[] = [];

      for (const item of content.items as any[]) {
        if (!item.str) continue;

        const currentY = item.transform ? item.transform[5] : null;

        // If Y position changed significantly, insert a newline
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 2) {
          lineFragments.push('\n');
        } else if (lineFragments.length > 0 && !lineFragments[lineFragments.length - 1].endsWith('\n')) {
          lineFragments.push(' ');
        }

        lineFragments.push(item.str);
        lastY = currentY;
      }

      pages.push(lineFragments.join(''));
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
    // Look for patterns like "SRI – Columbus, OH" or "SRI - IES Huntsville" or "SRI – FTI Columbus"
    // These typically appear as a title/header line near the top of the document
    const sriPattern = text.match(/\b(SRI\s*[–\-—]\s*[^\n]{3,60})/i);
    if (sriPattern) {
      const fullName = sriPattern[1].trim();
      result.siteName = fullName;
      result.clientName = 'SRI';
      return;
    }

    // Fallback: Look for the first short line that looks like a title
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip very short or very long lines; look for title-like content
      if (trimmed.length >= 5 && trimmed.length < 80) {
        // Check if it looks like a company/project name (contains letters, possibly with dash/location)
        if (/^[A-Z]/.test(trimmed) && !/^(Jobsite|Site\s*Lead|Site\s*Time|Orientation|Work\s*Schedule|Onsite|Scope|Work\s*Attire|Required|PER\s*DIEM|MOB|PAYROLL|SAFETY|CONTACTS|HOLIDAY|PTO|REFERRAL)/i.test(trimmed)) {
          result.siteName = trimmed;
          // Try to extract client name (company before the dash)
          const dashSplit = trimmed.match(/^([^–\-—]+?)\s*[–\-—]/);
          if (dashSplit) {
            result.clientName = dashSplit[1].trim();
          }
          return;
        }
      }
    }
  }

  private extractSiteAddress(text: string, result: ParsedJobDocument): void {
    // Look for "Jobsite Address:" or "Site Address:" pattern.
    // Use a more targeted capture that stops at common next-field labels or newlines.
    const addressMatch = text.match(/(?:Jobsite|Site|Job\s*Site)\s*Address\s*[:：]\s*(.+?)(?=\s*(?:Site\s*Lead|Site\s*Time|Orientation|Work\s*Schedule|\n|$))/i);
    if (addressMatch) {
      const addressStr = addressMatch[1].trim();
      const parsed = this.parseAddressString(addressStr);
      if (parsed) {
        result.siteAddress = parsed;
      }
      return;
    }

    // Fallback: try the simpler pattern (captures to end of line)
    const fallbackMatch = text.match(/(?:Jobsite|Site|Job\s*Site)\s*Address\s*[:：]\s*([^\n]+)/i);
    if (fallbackMatch) {
      const addressStr = fallbackMatch[1].trim();
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
    // Handle various dash types (-, –, —) and optional bullet characters before the distance
    const tierRegex = /(\d+[\-–—]\d+|\d+\+)\s*miles?\s*[–\-—:]\s*(?:NO\s*PER\s*DIEM|\$?\s*(\d+)\s*(?:per\s+)?([^\n·•]{3,60}))/gi;
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

    // Fallback: if no tiers found, look for a standalone dollar amount near "per diem"
    if (!result.perDiem) {
      const perDiemFallback = text.match(/(?:per\s*diem|per\s+diem)[^$\n]*?\$\s*(\d+)/i)
        || text.match(/\$\s*(\d+)\s*(?:per\s+)?(?:day|overnight|diem)/i);
      if (perDiemFallback) {
        result.perDiem = parseInt(perDiemFallback[1], 10);
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
    // Clean up the address string - remove trailing content that isn't part of the address
    let cleaned = address.replace(/\s{2,}/g, ' ').trim();

    // Pattern 1: "13085 Worthington Rd, New Albany OH 43054" (street, city STATE zip)
    const pattern1 = cleaned.match(/^(.+?),\s*([A-Za-z\s]+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:\s|$)/);
    if (pattern1) {
      return {
        street: pattern1[1].trim(),
        city: pattern1[2].trim(),
        state: pattern1[3].trim(),
        zipCode: pattern1[4].trim()
      };
    }

    // Pattern 2: "1278 Monroe Rd Toney, AL 35773" (street city, STATE zip)
    const pattern2 = cleaned.match(/^(.+?)\s+([A-Za-z\s]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:\s|$)/);
    if (pattern2) {
      return {
        street: pattern2[1].trim(),
        city: pattern2[2].trim(),
        state: pattern2[3].trim(),
        zipCode: pattern2[4].trim()
      };
    }

    // Pattern 3: "street, city, state zip" (all comma-separated)
    const pattern3 = cleaned.match(/^(.+?),\s*([A-Za-z\s]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:\s|$)/);
    if (pattern3) {
      return {
        street: pattern3[1].trim(),
        city: pattern3[2].trim(),
        state: pattern3[3].trim(),
        zipCode: pattern3[4].trim()
      };
    }

    // Pattern 4: Look for any address with a state abbreviation and zip code
    const pattern4 = cleaned.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:\s|$)/);
    if (pattern4) {
      // Try to split street and city from the first capture group
      const streetAndCity = pattern4[1];
      const commaIdx = streetAndCity.lastIndexOf(',');
      if (commaIdx > 0) {
        return {
          street: streetAndCity.substring(0, commaIdx).trim(),
          city: streetAndCity.substring(commaIdx + 1).trim(),
          state: pattern4[2].trim(),
          zipCode: pattern4[3].trim()
        };
      }
      // Try to split on the last word group that looks like a city name
      const cityMatch = streetAndCity.match(/^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/);
      if (cityMatch) {
        return {
          street: cityMatch[1].trim(),
          city: cityMatch[2].trim(),
          state: pattern4[2].trim(),
          zipCode: pattern4[3].trim()
        };
      }
      return {
        street: streetAndCity.trim(),
        state: pattern4[2].trim(),
        zipCode: pattern4[3].trim()
      };
    }

    // Fallback: just store the whole thing as street
    if (cleaned.length > 0) {
      return { street: cleaned };
    }
    return null;
  }
}
