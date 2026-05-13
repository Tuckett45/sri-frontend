import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Candidate, OfferStatus, VestSize } from '../models/onboarding.models';
import {
  Technician,
  Certification,
  CertificationStatus,
  TechnicianRole,
} from '../models/technician.model';
import { TypedCredential } from '../models/credential-types.model';
import { EquipmentAssignment } from '../models/equipment.model';
import { TechnicalCompetency } from '../models/competency.model';
import { PRC, PRCGoal } from '../models/prc.model';
import { RoleCredentialTemplate } from '../models/role-credential-template.model';
import { computePRCDueDate } from '../utils/prc-timer.util';

/**
 * Mock Onboarding Interceptor
 *
 * Intercepts HTTP requests to `/onboarding/` and `/technicians` endpoints
 * and returns realistic dummy data so the pipeline dashboard, candidate list,
 * candidate form, and credentials views all work without a live backend.
 *
 * Remove or disable this interceptor once a real API is available.
 */
@Injectable()
export class MockOnboardingInterceptor implements HttpInterceptor {
  private candidates: Candidate[] = buildMockCandidates();
  private technicians: Technician[] = buildMockTechnicians();
  private equipmentAssignments: Map<string, EquipmentAssignment[]> = buildMockEquipmentAssignments();
  private competencies: Map<string, TechnicalCompetency[]> = buildMockCompetencies();
  private prcRecords: Map<string, PRC> = buildMockPRCRecords();
  private roleTemplates: Map<string, RoleCredentialTemplate> = buildMockRoleTemplates();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Handle technician endpoints
    const techResult = this.handleTechnicianRequests(req);
    if (techResult) {
      return techResult;
    }

    if (!req.url.includes('/onboarding/')) {
      return next.handle(req);
    }

    // --- GET /candidates ---
    if (req.method === 'GET' && req.url.endsWith('/candidates')) {
      let results = [...this.candidates];

      const status = req.params.get('offerStatus') as OfferStatus | null;
      if (status) {
        results = results.filter(c => c.offerStatus === status);
      }

      const search = req.params.get('search');
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(
          c =>
            c.techName.toLowerCase().includes(q) ||
            c.techEmail.toLowerCase().includes(q) ||
            c.workSite.toLowerCase().includes(q),
        );
      }

      const incompleteCerts = req.params.get('incompleteCerts');
      if (incompleteCerts === 'true') {
        results = results.filter(
          c => !c.oshaCertified || !c.scissorLiftCertified,
        );
      }

      return ok(results);
    }

    // --- GET /candidates/:id ---
    const getByIdMatch = req.url.match(/\/candidates\/([^/]+)$/);
    if (req.method === 'GET' && getByIdMatch) {
      const candidate = this.candidates.find(c => c.candidateId === getByIdMatch[1]);
      return candidate ? ok(candidate) : notFound(getByIdMatch[1]);
    }

    // --- POST /candidates ---
    if (req.method === 'POST' && req.url.endsWith('/candidates')) {
      const body = req.body;
      const newCandidate: Candidate = {
        candidateId: `cand-${Date.now()}`,
        techName: body.techName,
        techEmail: body.techEmail,
        techPhone: body.techPhone,
        vestSize: body.vestSize,
        drugTestComplete: false,
        oshaCertified: false,
        scissorLiftCertified: false,
        workSite: body.workSite,
        startDate: body.startDate,
        offerStatus: body.offerStatus ?? 'pre_offer',
        createdBy: body.userName ?? 'mock-user',
        createdAt: new Date().toISOString(),
        updatedBy: body.userName ?? 'mock-user',
        updatedAt: new Date().toISOString(),
      };
      this.candidates = [newCandidate, ...this.candidates];
      return ok(newCandidate);
    }

    // --- PUT /candidates/:id ---
    const putMatch = req.url.match(/\/candidates\/([^/]+)$/);
    if (req.method === 'PUT' && putMatch) {
      const idx = this.candidates.findIndex(c => c.candidateId === putMatch[1]);
      if (idx === -1) return notFound(putMatch[1]);

      this.candidates[idx] = {
        ...this.candidates[idx],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      return ok(this.candidates[idx]);
    }

    // --- DELETE /candidates/:id ---
    const delMatch = req.url.match(/\/candidates\/([^/]+)$/);
    if (req.method === 'DELETE' && delMatch) {
      this.candidates = this.candidates.filter(c => c.candidateId !== delMatch[1]);
      return ok(null);
    }

    return next.handle(req);
  }

  /**
   * Handles all /technicians endpoint requests.
   * Returns null if the request does not match any technician endpoint.
   */
  private handleTechnicianRequests(req: HttpRequest<any>): Observable<HttpEvent<any>> | null {
    const url = req.url;

    // Check if this is a technicians endpoint request
    // Match URLs containing /technicians (but not /onboarding/)
    if (!url.match(/\/technicians(\/|$)/)) {
      return null;
    }

    // --- Role Template endpoints (must be before generic :id patterns) ---
    const roleTemplateMatch = url.match(/\/technicians\/role-templates\/([^/]+)$/);
    if (req.method === 'GET' && roleTemplateMatch) {
      const role = roleTemplateMatch[1];
      const template = this.roleTemplates.get(role);
      if (!template) {
        return notFound(role);
      }
      return ok(template);
    }

    // --- Equipment endpoints ---
    const equipmentResult = this.handleEquipmentRequests(req);
    if (equipmentResult) {
      return equipmentResult;
    }

    // --- Competency endpoints ---
    const competencyResult = this.handleCompetencyRequests(req);
    if (competencyResult) {
      return competencyResult;
    }

    // --- PRC endpoints ---
    const prcResult = this.handlePRCRequests(req);
    if (prcResult) {
      return prcResult;
    }

    // --- DELETE /technicians/:id/certifications/:certId ---
    const deleteCertMatch = url.match(/\/technicians\/([^/]+)\/certifications\/([^/]+)$/);
    if (req.method === 'DELETE' && deleteCertMatch) {
      const techId = deleteCertMatch[1];
      const certId = deleteCertMatch[2];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      const certIndex = (technician.certifications || []).findIndex(c => c.id === certId);
      if (certIndex === -1) {
        return notFound(certId);
      }
      technician.certifications!.splice(certIndex, 1);
      return ok(null);
    }

    // --- PUT /technicians/:id/certifications/:certId ---
    const putCertMatch = url.match(/\/technicians\/([^/]+)\/certifications\/([^/]+)$/);
    if (req.method === 'PUT' && putCertMatch) {
      const techId = putCertMatch[1];
      const certId = putCertMatch[2];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      const certIndex = (technician.certifications || []).findIndex(c => c.id === certId);
      if (certIndex === -1) {
        return notFound(certId);
      }
      technician.certifications![certIndex] = {
        ...technician.certifications![certIndex],
        ...req.body,
        id: certId,
      };
      return ok(technician.certifications![certIndex]);
    }

    // --- POST /technicians/:id/certifications ---
    const postCertMatch = url.match(/\/technicians\/([^/]+)\/certifications$/);
    if (req.method === 'POST' && postCertMatch) {
      const techId = postCertMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      const newCert: Certification = {
        id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...req.body,
      };
      if (!technician.certifications) {
        technician.certifications = [];
      }
      technician.certifications.push(newCert);
      return ok(newCert);
    }

    // --- GET /technicians/:id/certifications ---
    const getCertsMatch = url.match(/\/technicians\/([^/]+)\/certifications$/);
    if (req.method === 'GET' && getCertsMatch) {
      const techId = getCertsMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      return ok(technician.certifications || []);
    }

    // --- GET /technicians/:id ---
    const getByIdMatch = url.match(/\/technicians\/([^/]+)$/);
    if (req.method === 'GET' && getByIdMatch) {
      const techId = getByIdMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      return ok(technician);
    }

    // --- PUT /technicians/:id ---
    const putTechMatch = url.match(/\/technicians\/([^/]+)$/);
    if (req.method === 'PUT' && putTechMatch) {
      const techId = putTechMatch[1];
      const idx = this.technicians.findIndex(t => t.id === techId);
      if (idx === -1) {
        return notFound(techId);
      }
      this.technicians[idx] = {
        ...this.technicians[idx],
        ...req.body,
        id: techId,
        updatedAt: new Date(),
      };
      return ok(this.technicians[idx]);
    }

    // --- GET /technicians ---
    if (req.method === 'GET' && url.match(/\/technicians$/)) {
      return ok(this.technicians);
    }

    return null;
  }

  /**
   * Handles all equipment-related endpoint requests.
   * Returns null if the request does not match any equipment endpoint.
   */
  private handleEquipmentRequests(req: HttpRequest<any>): Observable<HttpEvent<any>> | null {
    const url = req.url;

    // --- GET /technicians/equipment/validate/:assetIdentifier ---
    const validateMatch = url.match(/\/technicians\/equipment\/validate\/([^/]+)$/);
    if (req.method === 'GET' && validateMatch) {
      const assetIdentifier = decodeURIComponent(validateMatch[1]);
      const excludeTechnicianId = req.params.get('excludeTechnicianId');

      let isUnique = true;
      this.equipmentAssignments.forEach((assignments, techId) => {
        if (excludeTechnicianId && techId === excludeTechnicianId) {
          return;
        }
        const hasAssigned = assignments.some(
          a => a.assetIdentifier === assetIdentifier && a.status === 'assigned'
        );
        if (hasAssigned) {
          isUnique = false;
        }
      });

      return ok(isUnique);
    }

    // --- PUT /technicians/:id/equipment/:equipmentId ---
    const putEquipMatch = url.match(/\/technicians\/([^/]+)\/equipment\/([^/]+)$/);
    if (req.method === 'PUT' && putEquipMatch) {
      const techId = putEquipMatch[1];
      const equipmentId = putEquipMatch[2];
      const assignments = this.equipmentAssignments.get(techId);
      if (!assignments) {
        return notFound(techId);
      }
      const idx = assignments.findIndex(a => a.id === equipmentId);
      if (idx === -1) {
        return notFound(equipmentId);
      }
      assignments[idx] = {
        ...assignments[idx],
        ...req.body,
        id: equipmentId,
        technicianId: techId,
        updatedAt: new Date().toISOString(),
      };
      return ok(assignments[idx]);
    }

    // --- POST /technicians/:id/equipment ---
    const postEquipMatch = url.match(/\/technicians\/([^/]+)\/equipment$/);
    if (req.method === 'POST' && postEquipMatch) {
      const techId = postEquipMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      const now = new Date().toISOString();
      const newEquipment: EquipmentAssignment = {
        id: `equip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        technicianId: techId,
        ...req.body,
        createdAt: now,
        updatedAt: now,
      };
      if (!this.equipmentAssignments.has(techId)) {
        this.equipmentAssignments.set(techId, []);
      }
      this.equipmentAssignments.get(techId)!.push(newEquipment);
      return ok(newEquipment);
    }

    // --- GET /technicians/:id/equipment ---
    const getEquipMatch = url.match(/\/technicians\/([^/]+)\/equipment$/);
    if (req.method === 'GET' && getEquipMatch) {
      const techId = getEquipMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      return ok(this.equipmentAssignments.get(techId) || []);
    }

    return null;
  }

  /**
   * Handles all competency-related endpoint requests.
   * Returns null if the request does not match any competency endpoint.
   */
  private handleCompetencyRequests(req: HttpRequest<any>): Observable<HttpEvent<any>> | null {
    const url = req.url;

    // --- PUT /technicians/:id/competencies/:competencyId ---
    const putCompMatch = url.match(/\/technicians\/([^/]+)\/competencies\/([^/]+)$/);
    if (req.method === 'PUT' && putCompMatch) {
      const techId = putCompMatch[1];
      const competencyId = putCompMatch[2];
      const assignments = this.competencies.get(techId);
      if (!assignments) {
        return notFound(techId);
      }
      const idx = assignments.findIndex(c => c.id === competencyId);
      if (idx === -1) {
        return notFound(competencyId);
      }
      assignments[idx] = {
        ...assignments[idx],
        ...req.body,
        id: competencyId,
        technicianId: techId,
        updatedAt: new Date().toISOString(),
      };
      return ok(assignments[idx]);
    }

    // --- POST /technicians/:id/competencies ---
    const postCompMatch = url.match(/\/technicians\/([^/]+)\/competencies$/);
    if (req.method === 'POST' && postCompMatch) {
      const techId = postCompMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      const now = new Date().toISOString();
      const newCompetency: TechnicalCompetency = {
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        technicianId: techId,
        ...req.body,
        createdAt: now,
        updatedAt: now,
      };
      if (!this.competencies.has(techId)) {
        this.competencies.set(techId, []);
      }
      this.competencies.get(techId)!.push(newCompetency);
      return ok(newCompetency);
    }

    // --- GET /technicians/:id/competencies ---
    const getCompMatch = url.match(/\/technicians\/([^/]+)\/competencies$/);
    if (req.method === 'GET' && getCompMatch) {
      const techId = getCompMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      return ok(this.competencies.get(techId) || []);
    }

    return null;
  }

  /**
   * Handles all PRC-related endpoint requests.
   * Returns null if the request does not match any PRC endpoint.
   */
  private handlePRCRequests(req: HttpRequest<any>): Observable<HttpEvent<any>> | null {
    const url = req.url;

    // --- PUT /technicians/:id/prc/:prcId/goals/:goalId ---
    const putGoalMatch = url.match(/\/technicians\/([^/]+)\/prc\/([^/]+)\/goals\/([^/]+)$/);
    if (req.method === 'PUT' && putGoalMatch) {
      const techId = putGoalMatch[1];
      const prcId = putGoalMatch[2];
      const goalId = putGoalMatch[3];
      const prc = this.prcRecords.get(techId);
      if (!prc || prc.id !== prcId) {
        return notFound(prcId);
      }
      const goalIdx = prc.goals.findIndex(g => g.id === goalId);
      if (goalIdx === -1) {
        return notFound(goalId);
      }
      prc.goals[goalIdx] = {
        ...prc.goals[goalIdx],
        ...req.body,
        id: goalId,
        prcId: prcId,
        updatedAt: new Date().toISOString(),
      };
      return ok(prc.goals[goalIdx]);
    }

    // --- POST /technicians/:id/prc/:prcId/goals ---
    const postGoalMatch = url.match(/\/technicians\/([^/]+)\/prc\/([^/]+)\/goals$/);
    if (req.method === 'POST' && postGoalMatch) {
      const techId = postGoalMatch[1];
      const prcId = postGoalMatch[2];
      const prc = this.prcRecords.get(techId);
      if (!prc || prc.id !== prcId) {
        return notFound(prcId);
      }
      const now = new Date().toISOString();
      const newGoal: PRCGoal = {
        id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        prcId: prcId,
        ...req.body,
        createdAt: now,
        updatedAt: now,
      };
      prc.goals.push(newGoal);
      return ok(newGoal);
    }

    // --- PUT /technicians/:id/prc/:prcId/complete ---
    const completeMatch = url.match(/\/technicians\/([^/]+)\/prc\/([^/]+)\/complete$/);
    if (req.method === 'PUT' && completeMatch) {
      const techId = completeMatch[1];
      const prcId = completeMatch[2];
      const prc = this.prcRecords.get(techId);
      if (!prc || prc.id !== prcId) {
        return notFound(prcId);
      }
      const now = new Date();
      const completionDate = req.body?.completionDate ? new Date(req.body.completionDate) : now;
      const nextDueDate = computePRCDueDate(completionDate);

      // Mark current PRC as completed
      prc.completionDate = completionDate.toISOString().split('T')[0];
      prc.status = 'completed';
      prc.updatedAt = now.toISOString();

      // Create next PRC cycle
      const nextPrc: PRC = {
        id: `prc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        technicianId: techId,
        dueDate: nextDueDate.toISOString().split('T')[0],
        status: 'upcoming',
        goals: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.prcRecords.set(techId, nextPrc);

      return ok(nextPrc);
    }

    // --- POST /technicians/:id/prc ---
    const postPrcMatch = url.match(/\/technicians\/([^/]+)\/prc$/);
    if (req.method === 'POST' && postPrcMatch) {
      const techId = postPrcMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      const now = new Date().toISOString();
      const newPrc: PRC = {
        id: `prc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        technicianId: techId,
        ...req.body,
        goals: [],
        createdAt: now,
        updatedAt: now,
      };
      this.prcRecords.set(techId, newPrc);
      return ok(newPrc);
    }

    // --- GET /technicians/:id/prc ---
    const getPrcMatch = url.match(/\/technicians\/([^/]+)\/prc$/);
    if (req.method === 'GET' && getPrcMatch) {
      const techId = getPrcMatch[1];
      const technician = this.technicians.find(t => t.id === techId);
      if (!technician) {
        return notFound(techId);
      }
      const prc = this.prcRecords.get(techId) || null;
      return ok(prc);
    }

    return null;
  }
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(body: any): Observable<HttpEvent<any>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(300));
}

function notFound(id: string): Observable<HttpEvent<any>> {
  return of(
    new HttpResponse({
      status: 404,
      body: { message: `Candidate ${id} not found` },
    }),
  ).pipe(delay(200));
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function buildMockCandidates(): Candidate[] {
  const now = new Date();
  const iso = (daysOffset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString();
  };
  const dateOnly = (daysOffset: number) => iso(daysOffset).split('T')[0];

  const vestSizes: VestSize[] = ['S', 'M', 'L', 'XL', '2XL'];
  const statuses: OfferStatus[] = ['pre_offer', 'offer', 'offer_acceptance'];

  const raw: Array<{
    name: string; email: string; phone: string; vest: VestSize;
    drug: boolean; osha: boolean; scissor: boolean;
    site: string; startOffset: number; status: OfferStatus;
  }> = [
    { name: 'Marcus Rivera', email: 'marcus.rivera@email.com', phone: '214-555-1001', vest: 'L', drug: true, osha: true, scissor: true, site: 'Dallas HQ', startOffset: 5, status: 'offer_acceptance' },
    { name: 'Priya Patel', email: 'priya.patel@email.com', phone: '214-555-1002', vest: 'S', drug: true, osha: true, scissor: false, site: 'Plano Tech Center', startOffset: 10, status: 'offer' },
    { name: 'James O\'Connor', email: 'james.oconnor@email.com', phone: '972-555-1003', vest: 'XL', drug: false, osha: true, scissor: true, site: 'Irving Business Park', startOffset: 3, status: 'offer_acceptance' },
    { name: 'Aisha Johnson', email: 'aisha.johnson@email.com', phone: '469-555-1004', vest: 'M', drug: true, osha: false, scissor: false, site: 'Fort Worth DC', startOffset: 18, status: 'pre_offer' },
    { name: 'Carlos Mendez', email: 'carlos.mendez@email.com', phone: '214-555-1005', vest: 'L', drug: true, osha: true, scissor: true, site: 'McKinney Site A', startOffset: 7, status: 'offer' },
    { name: 'Sarah Kim', email: 'sarah.kim@email.com', phone: '972-555-1006', vest: 'S', drug: false, osha: true, scissor: true, site: 'Richardson Data Center', startOffset: 12, status: 'pre_offer' },
    { name: 'Devon Williams', email: 'devon.williams@email.com', phone: '469-555-1007', vest: '2XL', drug: true, osha: true, scissor: true, site: 'Dallas HQ', startOffset: 2, status: 'offer_acceptance' },
    { name: 'Emily Zhang', email: 'emily.zhang@email.com', phone: '214-555-1008', vest: 'M', drug: true, osha: true, scissor: false, site: 'Carrollton Office', startOffset: 20, status: 'pre_offer' },
    { name: 'Robert Taylor', email: 'robert.taylor@email.com', phone: '972-555-1009', vest: 'XL', drug: false, osha: false, scissor: false, site: 'Grand Prairie Warehouse', startOffset: 8, status: 'offer' },
    { name: 'Maria Santos', email: 'maria.santos@email.com', phone: '469-555-1010', vest: 'M', drug: true, osha: true, scissor: true, site: 'Plano Tech Center', startOffset: 4, status: 'offer_acceptance' },
    { name: 'Tyler Brooks', email: 'tyler.brooks@email.com', phone: '214-555-1011', vest: 'L', drug: true, osha: true, scissor: true, site: 'Irving Business Park', startOffset: 15, status: 'offer' },
    { name: 'Jasmine Lee', email: 'jasmine.lee@email.com', phone: '972-555-1012', vest: 'S', drug: false, osha: true, scissor: false, site: 'Fort Worth DC', startOffset: 6, status: 'pre_offer' },
    { name: 'Nathan Cooper', email: 'nathan.cooper@email.com', phone: '469-555-1013', vest: 'XL', drug: true, osha: false, scissor: true, site: 'McKinney Site A', startOffset: 25, status: 'pre_offer' },
    { name: 'Olivia Martinez', email: 'olivia.martinez@email.com', phone: '214-555-1014', vest: 'M', drug: true, osha: true, scissor: true, site: 'Dallas HQ', startOffset: 9, status: 'offer' },
    { name: 'Kwame Asante', email: 'kwame.asante@email.com', phone: '972-555-1015', vest: '2XL', drug: false, osha: false, scissor: false, site: 'Richardson Data Center', startOffset: 11, status: 'pre_offer' },
  ];

  return raw.map((r, i) => ({
    candidateId: `cand-${String(i + 1).padStart(3, '0')}`,
    techName: r.name,
    techEmail: r.email,
    techPhone: r.phone,
    vestSize: r.vest,
    drugTestComplete: r.drug,
    oshaCertified: r.osha,
    scissorLiftCertified: r.scissor,
    workSite: r.site,
    startDate: dateOnly(r.startOffset),
    offerStatus: r.status,
    createdBy: 'system',
    createdAt: iso(-(30 - i * 2)),
    updatedBy: 'system',
    updatedAt: iso(-(15 - i)),
  }));
}


// ---------------------------------------------------------------------------
// Mock Technician Seed Data
// ---------------------------------------------------------------------------

function buildMockTechnicians(): Technician[] {
  const now = new Date();

  /** Helper to create a date offset from now by a number of days */
  const daysFromNow = (days: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  /** Helper to create a date in the past */
  const daysAgo = (days: number): Date => daysFromNow(-days);

  /** Helper to create an ISO date string offset from now */
  const isoDate = (daysOffset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };

  /** Helper to create an ISO timestamp offset from now */
  const isoTimestamp = (daysOffset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString();
  };

  // TypedCredential mock data distributed across technicians
  const typedCredentials: Record<string, TypedCredential[]> = {
    // tech-001: Drivers_License + Drug_Screen + OSHA_Training_Cert
    'tech-001': [
      {
        id: 'cert-001',
        technicianId: 'tech-001',
        credentialType: 'Drivers_License',
        name: 'Texas Drivers License',
        status: CertificationStatus.Active,
        licenseNumber: 'DL-98234571',
        issuingState: 'TX',
        issueDate: isoDate(-180),
        expirationDate: isoDate(185),
        createdAt: isoTimestamp(-365),
        updatedAt: isoTimestamp(-5),
      },
      {
        id: 'cert-002',
        technicianId: 'tech-001',
        credentialType: 'Drug_Screen',
        name: 'Pre-Employment Drug Screen',
        status: CertificationStatus.Active,
        testDate: isoDate(-90),
        result: 'pass',
        testingFacility: 'LabCorp Dallas',
        createdAt: isoTimestamp(-90),
        updatedAt: isoTimestamp(-90),
      },
      {
        id: 'cert-003',
        technicianId: 'tech-001',
        credentialType: 'OSHA_Training_Cert',
        name: 'OSHA 30-Hour Construction',
        status: CertificationStatus.Active,
        certificationNumber: 'OSHA-30-2024-78432',
        issueDate: isoDate(-180),
        expirationDate: isoDate(185),
        trainingProvider: 'National Safety Council',
        createdAt: isoTimestamp(-180),
        updatedAt: isoTimestamp(-5),
      },
    ],
    // tech-002: Background_Check + Offer_Letter
    'tech-002': [
      {
        id: 'cert-004',
        technicianId: 'tech-002',
        credentialType: 'Background_Check',
        name: 'Pre-Employment Background Check',
        status: CertificationStatus.Active,
        submissionDate: isoDate(-400),
        completionDate: isoDate(-390),
        result: 'pass',
        provider: 'Sterling Check',
        createdAt: isoTimestamp(-400),
        updatedAt: isoTimestamp(-390),
      },
      {
        id: 'cert-005',
        technicianId: 'tech-002',
        credentialType: 'Offer_Letter',
        name: 'Employment Offer Letter',
        status: CertificationStatus.Active,
        offerDate: isoDate(-410),
        acceptedDate: isoDate(-405),
        offerStatus: 'accepted',
        createdAt: isoTimestamp(-410),
        updatedAt: isoTimestamp(-405),
      },
    ],
    // tech-003: SSN_Last_Four + Drivers_License
    'tech-003': [
      {
        id: 'cert-006',
        technicianId: 'tech-003',
        credentialType: 'SSN_Last_Four',
        name: 'SSN Verification',
        status: CertificationStatus.Active,
        lastFourDigits: '7891',
        createdAt: isoTimestamp(-500),
        updatedAt: isoTimestamp(-500),
      },
      {
        id: 'cert-007',
        technicianId: 'tech-003',
        credentialType: 'Drivers_License',
        name: 'Texas Drivers License',
        status: CertificationStatus.Expired,
        licenseNumber: 'DL-44521098',
        issuingState: 'TX',
        issueDate: isoDate(-400),
        expirationDate: isoDate(-35),
        createdAt: isoTimestamp(-400),
        updatedAt: isoTimestamp(-10),
      },
    ],
    // tech-004: Drug_Screen + OSHA_Training_Cert + Background_Check
    'tech-004': [
      {
        id: 'cert-008',
        technicianId: 'tech-004',
        credentialType: 'Drug_Screen',
        name: 'Annual Drug Screen',
        status: CertificationStatus.Active,
        testDate: isoDate(-45),
        result: 'pass',
        testingFacility: 'Quest Diagnostics Fort Worth',
        createdAt: isoTimestamp(-45),
        updatedAt: isoTimestamp(-45),
      },
      {
        id: 'cert-009',
        technicianId: 'tech-004',
        credentialType: 'OSHA_Training_Cert',
        name: 'OSHA 10-Hour General Industry',
        status: CertificationStatus.ExpiringSoon,
        certificationNumber: 'OSHA-10-2023-55210',
        issueDate: isoDate(-345),
        expirationDate: isoDate(20),
        trainingProvider: 'Safety Training Institute',
        createdAt: isoTimestamp(-345),
        updatedAt: isoTimestamp(-3),
      },
      {
        id: 'cert-010',
        technicianId: 'tech-004',
        credentialType: 'Background_Check',
        name: 'Annual Background Check',
        status: CertificationStatus.Expired,
        submissionDate: isoDate(-500),
        completionDate: isoDate(-490),
        result: 'pass',
        provider: 'HireRight',
        createdAt: isoTimestamp(-500),
        updatedAt: isoTimestamp(-490),
      },
    ],
    // tech-005: No credentials (new hire)
    'tech-005': [],
    // tech-006: Drivers_License + Drug_Screen + OSHA_Training_Cert + Offer_Letter
    'tech-006': [
      {
        id: 'cert-011',
        technicianId: 'tech-006',
        credentialType: 'Drivers_License',
        name: 'Texas Drivers License',
        status: CertificationStatus.Active,
        licenseNumber: 'DL-67890234',
        issuingState: 'TX',
        issueDate: isoDate(-150),
        expirationDate: isoDate(215),
        createdAt: isoTimestamp(-200),
        updatedAt: isoTimestamp(-7),
      },
      {
        id: 'cert-012',
        technicianId: 'tech-006',
        credentialType: 'Drug_Screen',
        name: 'Pre-Employment Drug Screen',
        status: CertificationStatus.Active,
        testDate: isoDate(-200),
        result: 'pass',
        testingFacility: 'LabCorp Richardson',
        createdAt: isoTimestamp(-200),
        updatedAt: isoTimestamp(-200),
      },
      {
        id: 'cert-013',
        technicianId: 'tech-006',
        credentialType: 'OSHA_Training_Cert',
        name: 'OSHA 30-Hour Construction',
        status: CertificationStatus.Active,
        certificationNumber: 'OSHA-30-2024-11298',
        issueDate: isoDate(-100),
        expirationDate: isoDate(265),
        trainingProvider: 'National Safety Council',
        createdAt: isoTimestamp(-100),
        updatedAt: isoTimestamp(-7),
      },
      {
        id: 'cert-014',
        technicianId: 'tech-006',
        credentialType: 'Offer_Letter',
        name: 'Employment Offer Letter',
        status: CertificationStatus.Active,
        offerDate: isoDate(-210),
        acceptedDate: isoDate(-205),
        offerStatus: 'accepted',
        createdAt: isoTimestamp(-210),
        updatedAt: isoTimestamp(-205),
      },
    ],
  };

  return [
    // Technician 1: Drivers_License + Drug_Screen + OSHA_Training_Cert
    {
      id: 'tech-001',
      firstName: 'Marcus',
      lastName: 'Rivera',
      email: 'marcus.rivera@fieldops.com',
      phone: '214-555-2001',
      role: TechnicianRole.Lead,
      region: 'Dallas',
      isAvailable: true,
      isActive: true,
      willingToTravel: true,
      scissorLiftCertified: true,
      certifications: typedCredentials['tech-001'] as any as Certification[],
      createdAt: daysAgo(365),
      updatedAt: daysAgo(5),
    },
    // Technician 2: Background_Check + Offer_Letter
    {
      id: 'tech-002',
      firstName: 'Priya',
      lastName: 'Patel',
      email: 'priya.patel@fieldops.com',
      phone: '214-555-2002',
      role: TechnicianRole.Installer,
      region: 'Plano',
      isAvailable: true,
      isActive: true,
      willingToTravel: false,
      scissorLiftCertified: false,
      certifications: typedCredentials['tech-002'] as any as Certification[],
      createdAt: daysAgo(400),
      updatedAt: daysAgo(2),
    },
    // Technician 3: SSN_Last_Four + Drivers_License
    {
      id: 'tech-003',
      firstName: 'James',
      lastName: 'O\'Connor',
      email: 'james.oconnor@fieldops.com',
      phone: '972-555-2003',
      role: TechnicianRole.Level2,
      region: 'Irving',
      isAvailable: false,
      isActive: true,
      willingToTravel: true,
      scissorLiftCertified: true,
      certifications: typedCredentials['tech-003'] as any as Certification[],
      createdAt: daysAgo(500),
      updatedAt: daysAgo(10),
    },
    // Technician 4: Drug_Screen + OSHA_Training_Cert + Background_Check
    {
      id: 'tech-004',
      firstName: 'Aisha',
      lastName: 'Johnson',
      email: 'aisha.johnson@fieldops.com',
      phone: '469-555-2004',
      role: TechnicianRole.Level3,
      region: 'Fort Worth',
      isAvailable: true,
      isActive: true,
      willingToTravel: true,
      scissorLiftCertified: false,
      certifications: typedCredentials['tech-004'] as any as Certification[],
      createdAt: daysAgo(600),
      updatedAt: daysAgo(3),
    },
    // Technician 5: No credentials (new hire)
    {
      id: 'tech-005',
      firstName: 'Carlos',
      lastName: 'Mendez',
      email: 'carlos.mendez@fieldops.com',
      phone: '214-555-2005',
      role: TechnicianRole.Level1,
      region: 'McKinney',
      isAvailable: true,
      isActive: true,
      willingToTravel: false,
      scissorLiftCertified: false,
      certifications: [],
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },
    // Technician 6: Drivers_License + Drug_Screen + OSHA_Training_Cert + Offer_Letter
    {
      id: 'tech-006',
      firstName: 'Sarah',
      lastName: 'Kim',
      email: 'sarah.kim@fieldops.com',
      phone: '972-555-2006',
      role: TechnicianRole.Level4,
      region: 'Richardson',
      isAvailable: true,
      isActive: true,
      willingToTravel: false,
      scissorLiftCertified: true,
      certifications: typedCredentials['tech-006'] as any as Certification[],
      createdAt: daysAgo(200),
      updatedAt: daysAgo(7),
    },
  ];
}


// ---------------------------------------------------------------------------
// Mock Equipment Seed Data
// ---------------------------------------------------------------------------

function buildMockEquipmentAssignments(): Map<string, EquipmentAssignment[]> {
  const now = new Date();
  const isoDate = (daysOffset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };
  const isoTimestamp = (daysOffset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString();
  };

  const map = new Map<string, EquipmentAssignment[]>();

  // tech-001: Marcus Rivera — badge assigned, laptop assigned
  map.set('tech-001', [
    {
      id: 'equip-001',
      technicianId: 'tech-001',
      assetType: 'badge',
      assetIdentifier: 'BADGE-1001',
      assignmentDate: isoDate(-300),
      status: 'assigned',
      notes: 'Main building access badge',
      createdAt: isoTimestamp(-300),
      updatedAt: isoTimestamp(-300),
    },
    {
      id: 'equip-002',
      technicianId: 'tech-001',
      assetType: 'laptop',
      assetIdentifier: 'LAPTOP-DL-4521',
      assignmentDate: isoDate(-300),
      status: 'assigned',
      notes: 'Dell Latitude 5540',
      createdAt: isoTimestamp(-300),
      updatedAt: isoTimestamp(-300),
    },
  ]);

  // tech-002: Priya Patel — badge assigned, laptop returned
  map.set('tech-002', [
    {
      id: 'equip-003',
      technicianId: 'tech-002',
      assetType: 'badge',
      assetIdentifier: 'BADGE-1002',
      assignmentDate: isoDate(-350),
      status: 'assigned',
      createdAt: isoTimestamp(-350),
      updatedAt: isoTimestamp(-350),
    },
    {
      id: 'equip-004',
      technicianId: 'tech-002',
      assetType: 'laptop',
      assetIdentifier: 'LAPTOP-DL-3892',
      assignmentDate: isoDate(-350),
      returnDate: isoDate(-30),
      status: 'returned',
      notes: 'Returned for upgrade',
      createdAt: isoTimestamp(-350),
      updatedAt: isoTimestamp(-30),
    },
  ]);

  // tech-003: James O'Connor — badge lost, laptop assigned
  map.set('tech-003', [
    {
      id: 'equip-005',
      technicianId: 'tech-003',
      assetType: 'badge',
      assetIdentifier: 'BADGE-1003',
      assignmentDate: isoDate(-400),
      status: 'lost',
      notes: 'Reported lost on job site',
      createdAt: isoTimestamp(-400),
      updatedAt: isoTimestamp(-60),
    },
    {
      id: 'equip-006',
      technicianId: 'tech-003',
      assetType: 'laptop',
      assetIdentifier: 'LAPTOP-HP-7744',
      assignmentDate: isoDate(-400),
      status: 'assigned',
      notes: 'HP EliteBook 840',
      createdAt: isoTimestamp(-400),
      updatedAt: isoTimestamp(-400),
    },
    {
      id: 'equip-007',
      technicianId: 'tech-003',
      assetType: 'other',
      assetIdentifier: 'TOOL-KIT-055',
      assignmentDate: isoDate(-380),
      status: 'assigned',
      notes: 'Fiber optic tool kit',
      createdAt: isoTimestamp(-380),
      updatedAt: isoTimestamp(-380),
    },
  ]);

  // tech-004: Aisha Johnson — badge assigned, laptop returned, other lost
  map.set('tech-004', [
    {
      id: 'equip-008',
      technicianId: 'tech-004',
      assetType: 'badge',
      assetIdentifier: 'BADGE-1004',
      assignmentDate: isoDate(-500),
      status: 'assigned',
      createdAt: isoTimestamp(-500),
      updatedAt: isoTimestamp(-500),
    },
    {
      id: 'equip-009',
      technicianId: 'tech-004',
      assetType: 'laptop',
      assetIdentifier: 'LAPTOP-DL-2210',
      assignmentDate: isoDate(-500),
      returnDate: isoDate(-100),
      status: 'returned',
      notes: 'Returned — end of project',
      createdAt: isoTimestamp(-500),
      updatedAt: isoTimestamp(-100),
    },
    {
      id: 'equip-010',
      technicianId: 'tech-004',
      assetType: 'other',
      assetIdentifier: 'HOTSPOT-MF-112',
      assignmentDate: isoDate(-450),
      status: 'lost',
      notes: 'Mobile hotspot lost in transit',
      createdAt: isoTimestamp(-450),
      updatedAt: isoTimestamp(-200),
    },
  ]);

  // tech-005: Carlos Mendez — no equipment (new hire)
  map.set('tech-005', []);

  // tech-006: Sarah Kim — badge and laptop assigned
  map.set('tech-006', [
    {
      id: 'equip-011',
      technicianId: 'tech-006',
      assetType: 'badge',
      assetIdentifier: 'BADGE-1006',
      assignmentDate: isoDate(-180),
      status: 'assigned',
      createdAt: isoTimestamp(-180),
      updatedAt: isoTimestamp(-180),
    },
    {
      id: 'equip-012',
      technicianId: 'tech-006',
      assetType: 'laptop',
      assetIdentifier: 'LAPTOP-LN-9901',
      assignmentDate: isoDate(-180),
      status: 'assigned',
      notes: 'Lenovo ThinkPad T14',
      createdAt: isoTimestamp(-180),
      updatedAt: isoTimestamp(-180),
    },
  ]);

  return map;
}

// ---------------------------------------------------------------------------
// Mock Competency Seed Data
// ---------------------------------------------------------------------------

function buildMockCompetencies(): Map<string, TechnicalCompetency[]> {
  const now = new Date();
  const isoTimestamp = (daysOffset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString();
  };
  const isoDate = (daysOffset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };

  const map = new Map<string, TechnicalCompetency[]>();

  // tech-001: Marcus Rivera — expert in OTDR, advanced in Fiber Optic Characterization
  map.set('tech-001', [
    {
      id: 'comp-001',
      technicianId: 'tech-001',
      competencyName: 'OTDR Knowledge',
      verificationDate: isoDate(-90),
      verifiedBy: 'John Smith',
      proficiencyLevel: 'expert',
      notes: 'Demonstrated mastery in all OTDR testing scenarios',
      createdAt: isoTimestamp(-90),
      updatedAt: isoTimestamp(-90),
    },
    {
      id: 'comp-002',
      technicianId: 'tech-001',
      competencyName: 'Fiber Optic Characterization / OTDR Testing',
      verificationDate: isoDate(-60),
      verifiedBy: 'Jane Doe',
      proficiencyLevel: 'advanced',
      notes: 'Strong performance in fiber characterization tasks',
      createdAt: isoTimestamp(-60),
      updatedAt: isoTimestamp(-60),
    },
  ]);

  // tech-002: Priya Patel — intermediate in OTDR, beginner in Fiber Optic Characterization
  map.set('tech-002', [
    {
      id: 'comp-003',
      technicianId: 'tech-002',
      competencyName: 'OTDR Knowledge',
      verificationDate: isoDate(-120),
      verifiedBy: 'John Smith',
      proficiencyLevel: 'intermediate',
      notes: 'Solid understanding of basic OTDR operations',
      createdAt: isoTimestamp(-120),
      updatedAt: isoTimestamp(-120),
    },
    {
      id: 'comp-004',
      technicianId: 'tech-002',
      competencyName: 'Fiber Optic Characterization / OTDR Testing',
      verificationDate: isoDate(-100),
      verifiedBy: 'Jane Doe',
      proficiencyLevel: 'beginner',
      notes: 'Needs additional training on advanced characterization techniques',
      createdAt: isoTimestamp(-100),
      updatedAt: isoTimestamp(-100),
    },
  ]);

  // tech-003: James O'Connor — advanced in OTDR
  map.set('tech-003', [
    {
      id: 'comp-005',
      technicianId: 'tech-003',
      competencyName: 'OTDR Knowledge',
      verificationDate: isoDate(-200),
      verifiedBy: 'Mike Johnson',
      proficiencyLevel: 'advanced',
      createdAt: isoTimestamp(-200),
      updatedAt: isoTimestamp(-200),
    },
  ]);

  // tech-004: Aisha Johnson — expert in Fiber Optic Characterization, intermediate in OTDR
  map.set('tech-004', [
    {
      id: 'comp-006',
      technicianId: 'tech-004',
      competencyName: 'Fiber Optic Characterization / OTDR Testing',
      verificationDate: isoDate(-45),
      verifiedBy: 'John Smith',
      proficiencyLevel: 'expert',
      notes: 'Top performer in fiber optic characterization assessments',
      createdAt: isoTimestamp(-45),
      updatedAt: isoTimestamp(-45),
    },
    {
      id: 'comp-007',
      technicianId: 'tech-004',
      competencyName: 'OTDR Knowledge',
      verificationDate: isoDate(-150),
      verifiedBy: 'Jane Doe',
      proficiencyLevel: 'intermediate',
      createdAt: isoTimestamp(-150),
      updatedAt: isoTimestamp(-150),
    },
  ]);

  // tech-005: Carlos Mendez — no competencies (new hire)
  map.set('tech-005', []);

  // tech-006: Sarah Kim — beginner in OTDR
  map.set('tech-006', [
    {
      id: 'comp-008',
      technicianId: 'tech-006',
      competencyName: 'OTDR Knowledge',
      verificationDate: isoDate(-30),
      verifiedBy: 'Mike Johnson',
      proficiencyLevel: 'beginner',
      notes: 'Recently started OTDR training program',
      createdAt: isoTimestamp(-30),
      updatedAt: isoTimestamp(-30),
    },
  ]);

  return map;
}

// ---------------------------------------------------------------------------
// Mock PRC Seed Data
// ---------------------------------------------------------------------------

function buildMockPRCRecords(): Map<string, PRC> {
  const now = new Date();
  const isoDate = (daysOffset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  };
  const isoTimestamp = (daysOffset: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString();
  };

  const map = new Map<string, PRC>();

  // tech-001: Marcus Rivera — upcoming PRC (due in 25 days), with goals in various statuses
  map.set('tech-001', {
    id: 'prc-001',
    technicianId: 'tech-001',
    dueDate: isoDate(25),
    status: 'upcoming',
    goals: [
      {
        id: 'goal-001',
        prcId: 'prc-001',
        description: 'Complete advanced OTDR certification training',
        targetDate: isoDate(20),
        status: 'in_progress',
        createdAt: isoTimestamp(-35),
        updatedAt: isoTimestamp(-10),
      },
      {
        id: 'goal-002',
        prcId: 'prc-001',
        description: 'Mentor two junior technicians on fiber splicing',
        targetDate: isoDate(22),
        status: 'not_started',
        createdAt: isoTimestamp(-35),
        updatedAt: isoTimestamp(-35),
      },
      {
        id: 'goal-003',
        prcId: 'prc-001',
        description: 'Achieve zero rework rate on installations',
        targetDate: isoDate(15),
        status: 'completed',
        completionNotes: 'Maintained zero rework for 30 consecutive days',
        createdAt: isoTimestamp(-35),
        updatedAt: isoTimestamp(-5),
      },
    ],
    createdAt: isoTimestamp(-35),
    updatedAt: isoTimestamp(-5),
  });

  // tech-002: Priya Patel — overdue PRC (due date in the past, not completed)
  map.set('tech-002', {
    id: 'prc-002',
    technicianId: 'tech-002',
    dueDate: isoDate(-10),
    status: 'overdue',
    goals: [
      {
        id: 'goal-004',
        prcId: 'prc-002',
        description: 'Improve scissor lift operation proficiency',
        targetDate: isoDate(-15),
        status: 'in_progress',
        createdAt: isoTimestamp(-70),
        updatedAt: isoTimestamp(-20),
      },
      {
        id: 'goal-005',
        prcId: 'prc-002',
        description: 'Complete safety refresher course',
        targetDate: isoDate(-5),
        status: 'not_started',
        createdAt: isoTimestamp(-70),
        updatedAt: isoTimestamp(-70),
      },
    ],
    createdAt: isoTimestamp(-70),
    updatedAt: isoTimestamp(-10),
  });

  // tech-003: James O'Connor — completed PRC (with completion date set)
  map.set('tech-003', {
    id: 'prc-003',
    technicianId: 'tech-003',
    dueDate: isoDate(-20),
    completionDate: isoDate(-22),
    status: 'completed',
    goals: [
      {
        id: 'goal-006',
        prcId: 'prc-003',
        description: 'Renew OSHA 30-Hour certification',
        targetDate: isoDate(-25),
        status: 'completed',
        completionNotes: 'Certification renewed successfully',
        createdAt: isoTimestamp(-80),
        updatedAt: isoTimestamp(-22),
      },
      {
        id: 'goal-007',
        prcId: 'prc-003',
        description: 'Reduce average job completion time by 10%',
        targetDate: isoDate(-30),
        status: 'completed',
        completionNotes: 'Achieved 12% reduction in average completion time',
        createdAt: isoTimestamp(-80),
        updatedAt: isoTimestamp(-25),
      },
    ],
    createdAt: isoTimestamp(-80),
    updatedAt: isoTimestamp(-22),
  });

  // tech-004: Aisha Johnson — upcoming PRC (due in 45 days), goals not started
  map.set('tech-004', {
    id: 'prc-004',
    technicianId: 'tech-004',
    dueDate: isoDate(45),
    status: 'upcoming',
    goals: [
      {
        id: 'goal-008',
        prcId: 'prc-004',
        description: 'Lead a fiber optic characterization workshop',
        targetDate: isoDate(40),
        status: 'not_started',
        createdAt: isoTimestamp(-15),
        updatedAt: isoTimestamp(-15),
      },
    ],
    createdAt: isoTimestamp(-15),
    updatedAt: isoTimestamp(-15),
  });

  // tech-005: Carlos Mendez — no PRC (new hire, not in map)

  // tech-006: Sarah Kim — upcoming PRC (due in 5 days, within 14-day indicator window)
  map.set('tech-006', {
    id: 'prc-005',
    technicianId: 'tech-006',
    dueDate: isoDate(5),
    status: 'upcoming',
    goals: [
      {
        id: 'goal-009',
        prcId: 'prc-005',
        description: 'Complete OTDR beginner certification',
        targetDate: isoDate(3),
        status: 'in_progress',
        createdAt: isoTimestamp(-55),
        updatedAt: isoTimestamp(-7),
      },
      {
        id: 'goal-010',
        prcId: 'prc-005',
        description: 'Shadow senior technician on 5 installations',
        targetDate: isoDate(4),
        status: 'completed',
        completionNotes: 'Completed shadowing with Marcus Rivera',
        createdAt: isoTimestamp(-55),
        updatedAt: isoTimestamp(-3),
      },
    ],
    createdAt: isoTimestamp(-55),
    updatedAt: isoTimestamp(-3),
  });

  return map;
}

// ---------------------------------------------------------------------------
// Mock Role Credential Template Seed Data
// ---------------------------------------------------------------------------

function buildMockRoleTemplates(): Map<string, RoleCredentialTemplate> {
  const map = new Map<string, RoleCredentialTemplate>();

  // Installer: basic credentials, equipment, one competency, and initial PRC
  map.set(TechnicianRole.Installer, {
    role: TechnicianRole.Installer,
    requiredItems: [
      { category: 'credential', name: 'Drivers License', credentialType: 'Drivers_License' },
      { category: 'credential', name: 'Drug Screen', credentialType: 'Drug_Screen' },
      { category: 'credential', name: 'OSHA Training Cert', credentialType: 'OSHA_Training_Cert' },
      { category: 'credential', name: 'Background Check', credentialType: 'Background_Check' },
      { category: 'equipment', name: 'Badge', assetType: 'badge' },
      { category: 'equipment', name: 'Laptop', assetType: 'laptop' },
      { category: 'competency', name: 'OTDR Knowledge', competencyName: 'OTDR Knowledge' },
      { category: 'prc', name: 'Initial PRC' },
    ],
  });

  // Lead: All Installer items + Offer Letter and Fiber Optic Characterization
  map.set(TechnicianRole.Lead, {
    role: TechnicianRole.Lead,
    requiredItems: [
      { category: 'credential', name: 'Drivers License', credentialType: 'Drivers_License' },
      { category: 'credential', name: 'Drug Screen', credentialType: 'Drug_Screen' },
      { category: 'credential', name: 'OSHA Training Cert', credentialType: 'OSHA_Training_Cert' },
      { category: 'credential', name: 'Background Check', credentialType: 'Background_Check' },
      { category: 'credential', name: 'Offer Letter', credentialType: 'Offer_Letter' },
      { category: 'equipment', name: 'Badge', assetType: 'badge' },
      { category: 'equipment', name: 'Laptop', assetType: 'laptop' },
      { category: 'competency', name: 'OTDR Knowledge', competencyName: 'OTDR Knowledge' },
      { category: 'competency', name: 'Fiber Optic Characterization / OTDR Testing', competencyName: 'Fiber Optic Characterization / OTDR Testing' },
      { category: 'prc', name: 'Initial PRC' },
    ],
  });

  // Level1: Minimal subset — Drug Screen, Background Check, badge, OTDR Knowledge, PRC
  map.set(TechnicianRole.Level1, {
    role: TechnicianRole.Level1,
    requiredItems: [
      { category: 'credential', name: 'Drug Screen', credentialType: 'Drug_Screen' },
      { category: 'credential', name: 'Background Check', credentialType: 'Background_Check' },
      { category: 'equipment', name: 'Badge', assetType: 'badge' },
      { category: 'competency', name: 'OTDR Knowledge', competencyName: 'OTDR Knowledge' },
      { category: 'prc', name: 'Initial PRC' },
    ],
  });

  // Level2: Drug Screen, OSHA Training, Background Check, badge, laptop, OTDR Knowledge, PRC
  map.set(TechnicianRole.Level2, {
    role: TechnicianRole.Level2,
    requiredItems: [
      { category: 'credential', name: 'Drug Screen', credentialType: 'Drug_Screen' },
      { category: 'credential', name: 'OSHA Training Cert', credentialType: 'OSHA_Training_Cert' },
      { category: 'credential', name: 'Background Check', credentialType: 'Background_Check' },
      { category: 'equipment', name: 'Badge', assetType: 'badge' },
      { category: 'equipment', name: 'Laptop', assetType: 'laptop' },
      { category: 'competency', name: 'OTDR Knowledge', competencyName: 'OTDR Knowledge' },
      { category: 'prc', name: 'Initial PRC' },
    ],
  });

  // Level3: Drivers License, Drug Screen, OSHA Training, Background Check, badge, laptop, both competencies, PRC
  map.set(TechnicianRole.Level3, {
    role: TechnicianRole.Level3,
    requiredItems: [
      { category: 'credential', name: 'Drivers License', credentialType: 'Drivers_License' },
      { category: 'credential', name: 'Drug Screen', credentialType: 'Drug_Screen' },
      { category: 'credential', name: 'OSHA Training Cert', credentialType: 'OSHA_Training_Cert' },
      { category: 'credential', name: 'Background Check', credentialType: 'Background_Check' },
      { category: 'equipment', name: 'Badge', assetType: 'badge' },
      { category: 'equipment', name: 'Laptop', assetType: 'laptop' },
      { category: 'competency', name: 'OTDR Knowledge', competencyName: 'OTDR Knowledge' },
      { category: 'competency', name: 'Fiber Optic Characterization / OTDR Testing', competencyName: 'Fiber Optic Characterization / OTDR Testing' },
      { category: 'prc', name: 'Initial PRC' },
    ],
  });

  // Level4: All credential types, all equipment, both competencies, PRC
  map.set(TechnicianRole.Level4, {
    role: TechnicianRole.Level4,
    requiredItems: [
      { category: 'credential', name: 'Drivers License', credentialType: 'Drivers_License' },
      { category: 'credential', name: 'Drug Screen', credentialType: 'Drug_Screen' },
      { category: 'credential', name: 'OSHA Training Cert', credentialType: 'OSHA_Training_Cert' },
      { category: 'credential', name: 'Offer Letter', credentialType: 'Offer_Letter' },
      { category: 'credential', name: 'Background Check', credentialType: 'Background_Check' },
      { category: 'credential', name: 'SSN Last Four', credentialType: 'SSN_Last_Four' },
      { category: 'equipment', name: 'Badge', assetType: 'badge' },
      { category: 'equipment', name: 'Laptop', assetType: 'laptop' },
      { category: 'competency', name: 'OTDR Knowledge', competencyName: 'OTDR Knowledge' },
      { category: 'competency', name: 'Fiber Optic Characterization / OTDR Testing', competencyName: 'Fiber Optic Characterization / OTDR Testing' },
      { category: 'prc', name: 'Initial PRC' },
    ],
  });

  return map;
}
