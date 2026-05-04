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

/**
 * Mock Onboarding Interceptor
 *
 * Intercepts HTTP requests to `/onboarding/` endpoints and returns
 * realistic dummy data so the pipeline dashboard, candidate list,
 * and candidate form all work without a live backend.
 *
 * Remove or disable this interceptor once a real API is available.
 */
@Injectable()
export class MockOnboardingInterceptor implements HttpInterceptor {
  private candidates: Candidate[] = buildMockCandidates();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
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
          c => !c.oshaCertified || !c.scissorLiftCertified || !c.biisciCertified,
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
        biisciCertified: false,
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
    drug: boolean; osha: boolean; scissor: boolean; biisci: boolean;
    site: string; startOffset: number; status: OfferStatus;
  }> = [
    { name: 'Marcus Rivera', email: 'marcus.rivera@email.com', phone: '214-555-1001', vest: 'L', drug: true, osha: true, scissor: true, biisci: true, site: 'Dallas HQ', startOffset: 5, status: 'offer_acceptance' },
    { name: 'Priya Patel', email: 'priya.patel@email.com', phone: '214-555-1002', vest: 'S', drug: true, osha: true, scissor: false, biisci: true, site: 'Plano Tech Center', startOffset: 10, status: 'offer' },
    { name: 'James O\'Connor', email: 'james.oconnor@email.com', phone: '972-555-1003', vest: 'XL', drug: false, osha: true, scissor: true, biisci: true, site: 'Irving Business Park', startOffset: 3, status: 'offer_acceptance' },
    { name: 'Aisha Johnson', email: 'aisha.johnson@email.com', phone: '469-555-1004', vest: 'M', drug: true, osha: false, scissor: false, biisci: false, site: 'Fort Worth DC', startOffset: 18, status: 'pre_offer' },
    { name: 'Carlos Mendez', email: 'carlos.mendez@email.com', phone: '214-555-1005', vest: 'L', drug: true, osha: true, scissor: true, biisci: true, site: 'McKinney Site A', startOffset: 7, status: 'offer' },
    { name: 'Sarah Kim', email: 'sarah.kim@email.com', phone: '972-555-1006', vest: 'S', drug: false, osha: true, scissor: true, biisci: false, site: 'Richardson Data Center', startOffset: 12, status: 'pre_offer' },
    { name: 'Devon Williams', email: 'devon.williams@email.com', phone: '469-555-1007', vest: '2XL', drug: true, osha: true, scissor: true, biisci: true, site: 'Dallas HQ', startOffset: 2, status: 'offer_acceptance' },
    { name: 'Emily Zhang', email: 'emily.zhang@email.com', phone: '214-555-1008', vest: 'M', drug: true, osha: true, scissor: false, biisci: true, site: 'Carrollton Office', startOffset: 20, status: 'pre_offer' },
    { name: 'Robert Taylor', email: 'robert.taylor@email.com', phone: '972-555-1009', vest: 'XL', drug: false, osha: false, scissor: false, biisci: false, site: 'Grand Prairie Warehouse', startOffset: 8, status: 'offer' },
    { name: 'Maria Santos', email: 'maria.santos@email.com', phone: '469-555-1010', vest: 'M', drug: true, osha: true, scissor: true, biisci: true, site: 'Plano Tech Center', startOffset: 4, status: 'offer_acceptance' },
    { name: 'Tyler Brooks', email: 'tyler.brooks@email.com', phone: '214-555-1011', vest: 'L', drug: true, osha: true, scissor: true, biisci: false, site: 'Irving Business Park', startOffset: 15, status: 'offer' },
    { name: 'Jasmine Lee', email: 'jasmine.lee@email.com', phone: '972-555-1012', vest: 'S', drug: false, osha: true, scissor: false, biisci: true, site: 'Fort Worth DC', startOffset: 6, status: 'pre_offer' },
    { name: 'Nathan Cooper', email: 'nathan.cooper@email.com', phone: '469-555-1013', vest: 'XL', drug: true, osha: false, scissor: true, biisci: true, site: 'McKinney Site A', startOffset: 25, status: 'pre_offer' },
    { name: 'Olivia Martinez', email: 'olivia.martinez@email.com', phone: '214-555-1014', vest: 'M', drug: true, osha: true, scissor: true, biisci: true, site: 'Dallas HQ', startOffset: 9, status: 'offer' },
    { name: 'Kwame Asante', email: 'kwame.asante@email.com', phone: '972-555-1015', vest: '2XL', drug: false, osha: false, scissor: false, biisci: false, site: 'Richardson Data Center', startOffset: 11, status: 'pre_offer' },
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
    biisciCertified: r.biisci,
    workSite: r.site,
    startDate: dateOnly(r.startOffset),
    offerStatus: r.status,
    createdBy: 'system',
    createdAt: iso(-(30 - i * 2)),
    updatedBy: 'system',
    updatedAt: iso(-(15 - i)),
  }));
}
