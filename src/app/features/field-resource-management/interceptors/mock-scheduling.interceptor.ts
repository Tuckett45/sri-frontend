import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Assignment, AssignmentStatus } from '../models/assignment.model';

/**
 * Mock Scheduling Interceptor
 *
 * Intercepts HTTP requests to `/api/scheduling/` endpoints and returns
 * mock responses so scheduling, assignment, and reassignment all work
 * without a live backend.
 *
 * Remove or disable once a real API is available.
 */
@Injectable()
export class MockSchedulingInterceptor implements HttpInterceptor {
  private assignments: Assignment[] = [];
  private idCounter = 1;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Handle scheduling endpoints
    if (req.url.includes('/api/scheduling')) {
      return this.handleScheduling(req, next);
    }

    // Handle job endpoints for sync
    if (req.url.includes('/api/jobs')) {
      return this.handleJobs(req, next);
    }

    return next.handle(req);
  }

  private handleJobs(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // PUT /api/jobs/:id — update job
    const jobPutMatch = req.url.match(/\/api\/jobs\/([^/]+)$/);
    if (req.method === 'PUT' && jobPutMatch) {
      const jobId = jobPutMatch[1];
      const updatedJob = { id: jobId, ...req.body };
      return ok(updatedJob);
    }

    // POST /api/jobs — create job
    if (req.method === 'POST' && req.url.endsWith('/api/jobs')) {
      const newJob = {
        id: `job-${Date.now()}`,
        jobId: `JOB-${String(10000 + Math.floor(Math.random() * 90000))}`,
        status: 'NotStarted',
        attachments: [],
        notes: [],
        requiredSkills: [],
        market: '',
        company: '',
        createdBy: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...req.body
      };
      return ok(newJob);
    }

    // DELETE /api/jobs/:id
    const jobDelMatch = req.url.match(/\/api\/jobs\/([^/]+)$/);
    if (req.method === 'DELETE' && jobDelMatch) {
      return ok(null);
    }

    // Pass through everything else (GET /api/jobs, etc.)
    return next.handle(req);
  }

  private handleScheduling(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // --- POST /api/scheduling/assign ---
    if (req.method === 'POST' && req.url.endsWith('/assign')) {
      const { jobId, technicianId } = req.body;
      const assignment = this.createAssignment(jobId, technicianId);
      return ok(assignment);
    }

    // --- POST /api/scheduling/reassign ---
    if (req.method === 'POST' && req.url.endsWith('/reassign')) {
      const { jobId, fromTechnicianId, toTechnicianId } = req.body;
      // Deactivate old assignment
      const old = this.assignments.find(
        a => a.jobId === jobId && a.technicianId === fromTechnicianId && a.isActive
      );
      if (old) old.isActive = false;
      // Create new
      const assignment = this.createAssignment(jobId, toTechnicianId);
      return ok({ oldAssignmentId: old?.id || null, newAssignment: assignment });
    }

    // --- GET /api/scheduling/assignments ---
    if (req.method === 'GET' && req.url.includes('/assignments') && !req.url.includes('/accept') && !req.url.includes('/reject')) {
      const active = this.assignments.filter(a => a.isActive);
      return ok(active);
    }

    // --- DELETE /api/scheduling/assignments/:id ---
    const delMatch = req.url.match(/\/assignments\/([^/]+)$/);
    if (req.method === 'DELETE' && delMatch) {
      const id = delMatch[1];
      const a = this.assignments.find(x => x.id === id);
      if (a) a.isActive = false;
      // Always return success — the NgRx store handles removal
      return ok(null);
    }

    // --- POST /api/scheduling/assignments/:id/accept ---
    const acceptMatch = req.url.match(/\/assignments\/([^/]+)\/accept$/);
    if (req.method === 'POST' && acceptMatch) {
      const a = this.assignments.find(x => x.id === acceptMatch[1]);
      if (a) a.status = AssignmentStatus.Accepted;
      return ok(a || null);
    }

    // --- POST /api/scheduling/assignments/:id/reject ---
    const rejectMatch = req.url.match(/\/assignments\/([^/]+)\/reject$/);
    if (req.method === 'POST' && rejectMatch) {
      const a = this.assignments.find(x => x.id === rejectMatch[1]);
      if (a) { a.status = AssignmentStatus.Rejected; a.isActive = false; }
      return ok(a || null);
    }

    // --- GET /api/scheduling/conflicts/* ---
    if (req.method === 'GET' && req.url.includes('/conflicts')) {
      return ok([]);
    }

    // --- GET /api/scheduling/qualified-technicians/:jobId ---
    if (req.method === 'GET' && req.url.includes('/qualified-technicians/')) {
      return ok([]);
    }

    // --- GET /api/scheduling/schedule/:techId ---
    if (req.method === 'GET' && req.url.match(/\/schedule\/[^/]+$/)) {
      return ok([]);
    }

    // --- POST /api/scheduling/bulk-assign ---
    if (req.method === 'POST' && req.url.endsWith('/bulk-assign')) {
      const results = (req.body.assignments || []).map((dto: any) => {
        this.createAssignment(dto.jobId, dto.technicianId);
        return { jobId: dto.jobId, technicianId: dto.technicianId, success: true };
      });
      return ok(results);
    }

    // Fallback — pass through
    return next.handle(req);
  }

  private createAssignment(jobId: string, technicianId: string): Assignment {
    const id = `asgn-${String(this.idCounter++).padStart(4, '0')}`;
    const assignment: Assignment = {
      id,
      jobId,
      technicianId,
      assignedBy: 'current-user',
      assignedAt: new Date(),
      status: AssignmentStatus.Assigned,
      isActive: true
    };
    this.assignments.push(assignment);
    return assignment;
  }
}

function ok(body: any): Observable<HttpEvent<any>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(150));
}
