import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';
import { 
  Technician, 
  TechnicianRole,
  Skill, 
  Certification, 
  Availability 
} from '../models/technician.model';
import { RoleCredentialTemplate } from '../models/role-credential-template.model';
import { 
  CreateTechnicianDto, 
  UpdateTechnicianDto, 
  TechnicianFilters 
} from '../models/dtos';
import { DateRange } from '../models/assignment.model';
import { GeoLocation } from '../models/time-entry.model';
import { EquipmentAssignment } from '../models/equipment.model';
import { TechnicalCompetency } from '../models/competency.model';
import { PRC, PRCGoal } from '../models/prc.model';
import { RoleBasedDataService } from '../../../services/role-based-data.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environments';

/**
 * Service for managing technician data and operations
 * Handles HTTP communication with the backend API for technician-related operations
 */
@Injectable({
  providedIn: 'root'
})
export class TechnicianService {
  private readonly apiUrl = `${environment.atlasApiUrl}/technicians`;
  private readonly retryCount = 2;

  constructor(
    private http: HttpClient,
    private roleBasedDataService: RoleBasedDataService,
    private authService: AuthService
  ) {}

  /**
   * Retrieves a list of technicians with optional filtering
   * Supports filtering by: skills, status, market, company, search term, role, availability
   * Applies role-based data scoping:
   * - Admin: all technicians
   * - CM: technicians in their market (or all markets if RG market)
   * - PM/Vendor: technicians in their company AND market
   * - Technician: only self
   * @param filters Optional filters to apply to the technician list
   * @returns Observable of technician array
   */
  getTechnicians(filters?: TechnicianFilters): Observable<Technician[]> {
    let params = new HttpParams();

    // For Admin users, request all technicians (not just self)
    if (this.authService.isAdmin()) {
      params = params.set('scope', 'all');
    }

    // Apply filters if provided
    if (filters) {
      // Search term filter - searches across name, email, phone
      if (filters.searchTerm) {
        params = params.set('searchTerm', filters.searchTerm);
      }

      // Role filter - filters by technician role
      if (filters.role) {
        params = params.set('role', filters.role);
      }

      // Skills filter - filters by required skills (comma-separated)
      if (filters.skills && filters.skills.length > 0) {
        params = params.set('skills', filters.skills.join(','));
      }

      // Region/Market filter - filters by geographic region
      if (filters.region) {
        params = params.set('region', filters.region);
      }

      // Availability filter - filters by current availability status
      if (filters.isAvailable !== undefined) {
        params = params.set('isAvailable', filters.isAvailable.toString());
      }

      // Active status filter - filters by active/inactive status
      if (filters.isActive !== undefined) {
        params = params.set('isActive', filters.isActive.toString());
      }

      // Pagination - page number
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }

      // Pagination - page size
      if (filters.pageSize !== undefined) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http.get<any>(this.apiUrl, { params })
      .pipe(
        map(response => {
          // API may return paginated response { items: [...] } or a plain array
          let technicians: Technician[];
          if (Array.isArray(response)) {
            technicians = response;
          } else if (response && Array.isArray(response.items)) {
            technicians = response.items;
          } else {
            console.warn('[TechnicianService] Unexpected response format:', response);
            technicians = [];
          }
          // Normalize: default isActive/isAvailable to true if not provided by API
          technicians = technicians.map(t => ({
            ...t,
            isActive: t.isActive ?? true,
            isAvailable: t.isAvailable ?? true
          }));
          return this.applyRoleBasedFiltering(technicians);
        }),
        catchError(this.handleError)
      );
  }


  /**
   * Apply role-based filtering to technicians
   * CM users: filter by their market
   * Admin users: include all technicians
   */
  private applyRoleBasedFiltering(technicians: Technician[]): Technician[] {
    // Admin users get all technicians
    if (this.authService.isAdmin()) {
      return technicians;
    }

    // CM users: filter by their market (map region to market)
    if (this.authService.isCM()) {
      // Map region to market for filtering
      const techniciansWithMarket = technicians.map(t => ({ ...t, market: t.region }));
      const filtered = this.roleBasedDataService.applyMarketFilter(techniciansWithMarket);
      // Map back to original Technician objects
      return filtered.map(t => {
        const { market, ...rest } = t as any;
        return rest as Technician;
      });
    }

    // Other roles: return as-is
    return technicians;
  }

  /**
   * Retrieves a single technician by ID
   * @param id Technician ID
   * @returns Observable of technician
   */
  getTechnicianById(id: string): Observable<Technician> {
    return this.http.get<Technician>(`${this.apiUrl}/${id}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Creates a new technician
   * Validates permissions and market ownership for CM users
   * Ensures data integrity and proper role-based scoping
   * @param technician Technician data to create
   * @returns Observable of created technician
   */
  createTechnician(technician: CreateTechnicianDto): Observable<Technician> {
    // Validate required fields
    if (!technician.firstName || !technician.lastName || !technician.email) {
      return throwError(() => new Error('First name, last name, and email are required'));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(technician.email)) {
      return throwError(() => new Error('Invalid email format'));
    }

    // Validate phone format (basic validation)
    if (technician.phone && !/^[\d\s\-\+\(\)]+$/.test(technician.phone)) {
      return throwError(() => new Error('Invalid phone number format'));
    }

    // Validate region is provided
    if (!technician.region) {
      return throwError(() => new Error('Region is required'));
    }

    // For CM users: validate they can only create technicians in their market
    if (this.authService.isCM() && !this.authService.isAdmin()) {
      const currentUser = this.authService.getUser();
      const userMarket = currentUser?.market || '';
      
      // CM can only create technicians in their own market (region maps to market)
      if (technician.region !== userMarket) {
        return throwError(() => new Error('You can only create technicians in your own market'));
      }
    }

    return this.http.post<Technician>(this.apiUrl, technician)
      .pipe(
        retry(1), // Retry once on network failure
        catchError(this.handleError)
      );
  }

  /**
   * Updates an existing technician
   * Validates market ownership for CM users
   * @param id Technician ID
   * @param technician Updated technician data
   * @returns Observable of updated technician
   */
  updateTechnician(id: string, technician: UpdateTechnicianDto): Observable<Technician> {
    // Validate market ownership for CMs
    if (this.authService.isCM() && !this.authService.isAdmin()) {
      const currentUser = this.authService.getUser();
      const userMarket = currentUser?.market || '';
      
      // First get the technician to check region (which maps to market)
      return this.getTechnicianById(id).pipe(
        switchMap(existingTech => {
          if (existingTech.region !== userMarket) {
            return throwError(() => new Error('You do not have permission to update technicians from other markets'));
          }
          return this.http.put<Technician>(`${this.apiUrl}/${id}`, technician);
        }),
        catchError(this.handleError)
      );
    }

    return this.http.put<Technician>(`${this.apiUrl}/${id}`, technician)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Validates that a technician can be assigned to a project
   * Prevents CM from assigning technicians from other markets
   * @param technicianId Technician ID to validate
   * @param projectMarket Market of the project
   * @returns Observable of boolean indicating if assignment is valid
   */
  validateTechnicianAssignment(technicianId: string, projectMarket: string): Observable<boolean> {
    // Admin users can assign any technician
    if (this.authService.isAdmin()) {
      return new Observable(observer => {
        observer.next(true);
        observer.complete();
      });
    }

    // CM users: validate market ownership
    if (this.authService.isCM()) {
      return this.getTechnicianById(technicianId).pipe(
        map(technician => {
          const techRegion = technician.region || '';
          const currentUser = this.authService.getUser();
          const userMarket = currentUser?.market || '';
          
          // Check if technician is from CM's market (region maps to market)
          if (techRegion !== userMarket) {
            throw new Error('You cannot assign technicians from other markets');
          }
          
          // Check if project is in CM's market
          if (projectMarket && projectMarket !== userMarket) {
            throw new Error('You cannot assign technicians to projects in other markets');
          }
          
          return true;
        }),
        catchError(err => throwError(() => err))
      );
    }

    // Other roles: allow assignment
    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Deactivates a technician (soft-delete)
   * Sets the technician to inactive status while preserving the record
   * Only Admin users can deactivate technicians
   * @param id Technician ID
   * @returns Observable of updated technician
   */
  deactivateTechnician(id: string): Observable<Technician> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only administrators can deactivate technicians'));
    }

    return this.http.patch<Technician>(`${this.apiUrl}/${id}/deactivate`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Reactivates a previously deactivated technician
   * Only Admin users can reactivate technicians
   * @param id Technician ID
   * @returns Observable of updated technician
   */
  reactivateTechnician(id: string): Observable<Technician> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only administrators can reactivate technicians'));
    }

    return this.http.patch<Technician>(`${this.apiUrl}/${id}/reactivate`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Permanently deletes a technician record
   * This action cannot be undone - use deactivateTechnician for soft-delete
   * Only Admin users can delete technicians
   * @param id Technician ID
   * @returns Observable of void
   */
  deleteTechnician(id: string): Observable<void> {
    // Only Admin users can delete technicians
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only administrators can delete technicians'));
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves skills for a specific technician
   * @param id Technician ID
   * @returns Observable of skill array
   */
  getTechnicianSkills(id: string): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${this.apiUrl}/${id}/skills`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Adds a skill to a technician
   * @param id Technician ID
   * @param skill Skill to add
   * @returns Observable of void
   */
  addTechnicianSkill(id: string, skill: Skill): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/skills`, skill)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Removes a skill from a technician
   * @param id Technician ID
   * @param skillId Skill ID to remove
   * @returns Observable of void
   */
  removeTechnicianSkill(id: string, skillId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/skills/${skillId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves certifications for a specific technician
   * @param id Technician ID
   * @returns Observable of certification array
   */
  getTechnicianCertifications(id: string): Observable<Certification[]> {
    return this.http.get<Certification[]>(`${this.apiUrl}/${id}/certifications`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves certifications expiring within a specified number of days
   * @param daysThreshold Number of days threshold for expiration
   * @returns Observable of certification array
   */
  getExpiringCertifications(daysThreshold: number = 30): Observable<Certification[]> {
    const params = new HttpParams().set('daysThreshold', daysThreshold.toString());
    return this.http.get<Certification[]>(`${this.apiUrl}/certifications/expiring`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Adds a new certification to a technician
   * @param technicianId Technician ID
   * @param certification Certification data to add (without id)
   * @returns Observable of created certification
   */
  addTechnicianCertification(technicianId: string, certification: Omit<Certification, 'id'>): Observable<Certification> {
    return this.http.post<Certification>(`${this.apiUrl}/${technicianId}/certifications`, certification)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Updates an existing certification for a technician
   * @param technicianId Technician ID
   * @param certificationId Certification ID to update
   * @param certification Partial certification data to update
   * @returns Observable of updated certification
   */
  updateTechnicianCertification(technicianId: string, certificationId: string, certification: Partial<Certification>): Observable<Certification> {
    return this.http.put<Certification>(`${this.apiUrl}/${technicianId}/certifications/${certificationId}`, certification)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Deletes a certification from a technician
   * @param technicianId Technician ID
   * @param certificationId Certification ID to delete
   * @returns Observable of void
   */
  deleteTechnicianCertification(technicianId: string, certificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${technicianId}/certifications/${certificationId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves equipment assignments for a specific technician
   * @param technicianId Technician ID
   * @returns Observable of equipment assignment array
   */
  getTechnicianEquipment(technicianId: string): Observable<EquipmentAssignment[]> {
    return this.http.get<EquipmentAssignment[]>(`${this.apiUrl}/${technicianId}/equipment`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Assigns new equipment to a technician
   * @param technicianId Technician ID
   * @param equipment Equipment data to assign (without id)
   * @returns Observable of created equipment assignment
   */
  assignEquipment(technicianId: string, equipment: Omit<EquipmentAssignment, 'id'>): Observable<EquipmentAssignment> {
    return this.http.post<EquipmentAssignment>(`${this.apiUrl}/${technicianId}/equipment`, equipment)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Updates an existing equipment assignment for a technician
   * @param technicianId Technician ID
   * @param equipmentId Equipment assignment ID to update
   * @param update Partial equipment data to update
   * @returns Observable of updated equipment assignment
   */
  updateEquipmentAssignment(technicianId: string, equipmentId: string, update: Partial<EquipmentAssignment>): Observable<EquipmentAssignment> {
    return this.http.put<EquipmentAssignment>(`${this.apiUrl}/${technicianId}/equipment/${equipmentId}`, update)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Deletes an equipment assignment
   */
  deleteEquipmentAssignment(technicianId: string, equipmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${technicianId}/equipment/${equipmentId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Deletes a technical competency
   */
  deleteTechnicianCompetency(technicianId: string, competencyId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${technicianId}/competencies/${competencyId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Validates that an asset identifier is unique across all technicians
   * @param assetIdentifier The asset identifier to validate
   * @param excludeTechnicianId Optional technician ID to exclude from the check
   * @returns Observable of boolean - true if the asset identifier is unique
   */
  validateAssetUniqueness(assetIdentifier: string, excludeTechnicianId?: string): Observable<boolean> {
    let params = new HttpParams();
    if (excludeTechnicianId) {
      params = params.set('excludeTechnicianId', excludeTechnicianId);
    }
    return this.http.get<boolean>(`${this.apiUrl}/equipment/validate/${assetIdentifier}`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves technical competencies for a specific technician
   * @param technicianId Technician ID
   * @returns Observable of technical competency array
   */
  getTechnicianCompetencies(technicianId: string): Observable<TechnicalCompetency[]> {
    return this.http.get<TechnicalCompetency[]>(`${this.apiUrl}/${technicianId}/competencies`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Adds a new technical competency to a technician
   * @param technicianId Technician ID
   * @param competency Competency data to add (without id)
   * @returns Observable of created technical competency
   */
  addTechnicianCompetency(technicianId: string, competency: Omit<TechnicalCompetency, 'id'>): Observable<TechnicalCompetency> {
    return this.http.post<TechnicalCompetency>(`${this.apiUrl}/${technicianId}/competencies`, competency)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Updates an existing technical competency for a technician
   * @param technicianId Technician ID
   * @param competencyId Competency ID to update
   * @param update Partial competency data to update
   * @returns Observable of updated technical competency
   */
  updateTechnicianCompetency(technicianId: string, competencyId: string, update: Partial<TechnicalCompetency>): Observable<TechnicalCompetency> {
    return this.http.put<TechnicalCompetency>(`${this.apiUrl}/${technicianId}/competencies/${competencyId}`, update)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves the current PRC (Performance Review Cycle) for a technician
   * @param technicianId Technician ID
   * @returns Observable of PRC or null if none exists
   */
  getTechnicianPRC(technicianId: string): Observable<PRC | null> {
    return this.http.get<PRC | null>(`${this.apiUrl}/${technicianId}/prc`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Creates a new PRC for a technician
   * @param technicianId Technician ID
   * @param prc PRC data to create (without id and goals)
   * @returns Observable of created PRC
   */
  createPRC(technicianId: string, prc: Omit<PRC, 'id' | 'goals'>): Observable<PRC> {
    return this.http.post<PRC>(`${this.apiUrl}/${technicianId}/prc`, prc)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Marks a PRC as complete and computes the next PRC due date
   * @param technicianId Technician ID
   * @param prcId PRC ID to complete
   * @param completionDate Date the PRC was completed
   * @returns Observable of updated PRC
   */
  completePRC(technicianId: string, prcId: string, completionDate: Date): Observable<PRC> {
    return this.http.put<PRC>(`${this.apiUrl}/${technicianId}/prc/${prcId}/complete`, {
      completionDate: completionDate.toISOString()
    })
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Adds a goal to an existing PRC
   * @param technicianId Technician ID
   * @param prcId PRC ID to add the goal to
   * @param goal Goal data to add (without id)
   * @returns Observable of created PRC goal
   */
  addPRCGoal(technicianId: string, prcId: string, goal: Omit<PRCGoal, 'id'>): Observable<PRCGoal> {
    return this.http.post<PRCGoal>(`${this.apiUrl}/${technicianId}/prc/${prcId}/goals`, goal)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Updates an existing PRC goal
   * @param technicianId Technician ID
   * @param prcId PRC ID containing the goal
   * @param goalId Goal ID to update
   * @param update Partial goal data to update
   * @returns Observable of updated PRC goal
   */
  updatePRCGoal(technicianId: string, prcId: string, goalId: string, update: Partial<PRCGoal>): Observable<PRCGoal> {
    return this.http.put<PRCGoal>(`${this.apiUrl}/${technicianId}/prc/${prcId}/goals/${goalId}`, update)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves the role-based credential template defining required onboarding items for a role
   * @param role Technician role to get the template for
   * @returns Observable of RoleCredentialTemplate
   */
  getRoleCredentialTemplate(role: TechnicianRole): Observable<RoleCredentialTemplate> {
    return this.http.get<RoleCredentialTemplate>(`${this.apiUrl}/role-templates/${role}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves availability for a specific technician within a date range
   * @param id Technician ID
   * @param dateRange Date range to query
   * @returns Observable of availability array
   */
  getTechnicianAvailability(id: string, dateRange: DateRange): Observable<Availability[]> {
    let params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    return this.http.get<Availability[]>(`${this.apiUrl}/${id}/availability`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Updates availability for a specific technician
   * @param id Technician ID
   * @param availability Array of availability records
   * @returns Observable of void
   */
  updateTechnicianAvailability(id: string, availability: Availability[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/availability`, availability)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Updates the location of a technician with formal specifications
   * 
   * FORMAL SPECIFICATION:
   * 
   * Preconditions:
   * - technicianId is a valid UUID of an existing technician
   * - location.latitude is between -90 and 90 (inclusive)
   * - location.longitude is between -180 and 180 (inclusive)
   * - location.accuracy (if provided) is a positive number
   * - User is either the technician themselves OR has 'update' permission on 'technicians'
   * 
   * Postconditions:
   * - Location is updated in backend via HTTP PUT
   * - Observable emits void on success
   * - If location validation fails, Observable emits error with descriptive message
   * - If HTTP request fails, Observable emits error
   * - No state changes occur on error
   * 
   * Side Effects:
   * - HTTP PUT request to backend API
   * - Backend will update technician location in database
   * - Backend will broadcast location update via SignalR to subscribed users
   * - Backend will preserve previous location in history for audit trail
   * 
   * @param technicianId UUID of the technician whose location is being updated
   * @param location GeoLocation object containing latitude, longitude, and optional accuracy
   * @returns Observable<void> that completes on success or emits error on failure
   * @throws Error if location coordinates are invalid
   * @throws Error if user lacks permission to update technician location
   * @throws Error if technician does not exist (404)
   */
  updateTechnicianLocation(technicianId: string, location: GeoLocation): Observable<void> {
    // Precondition validation: Validate latitude range
    if (location.latitude < -90 || location.latitude > 90) {
      return throwError(() => new Error(
        `Invalid latitude: ${location.latitude}. Must be between -90 and 90.`
      ));
    }

    // Precondition validation: Validate longitude range
    if (location.longitude < -180 || location.longitude > 180) {
      return throwError(() => new Error(
        `Invalid longitude: ${location.longitude}. Must be between -180 and 180.`
      ));
    }

    // Precondition validation: Validate accuracy if provided
    if (location.accuracy !== undefined && location.accuracy <= 0) {
      return throwError(() => new Error(
        `Invalid accuracy: ${location.accuracy}. Must be a positive number.`
      ));
    }

    // Precondition validation: Validate technicianId format (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!technicianId || !uuidRegex.test(technicianId)) {
      return throwError(() => new Error(
        `Invalid technician ID format: ${technicianId}. Must be a valid UUID.`
      ));
    }

    // Permission check: User must be the technician or have update permission
    // Note: Backend will enforce this, but we validate here for early feedback
    const currentUser = this.authService.getUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Technicians can only update their own location
    if (currentUser.role === 'TECHNICIAN' && currentUser.id !== technicianId) {
      return throwError(() => new Error(
        'Technicians can only update their own location'
      ));
    }

    // For CM users: validate market ownership before updating
    if (this.authService.isCM() && !this.authService.isAdmin()) {
      return this.getTechnicianById(technicianId).pipe(
        switchMap(technician => {
          const userMarket = currentUser.market || '';
          if (technician.region !== userMarket) {
            return throwError(() => new Error(
              'You do not have permission to update location for technicians from other markets'
            ));
          }
          return this.performLocationUpdate(technicianId, location);
        }),
        catchError(this.handleError)
      );
    }

    // Admin and authorized users can update any technician location
    return this.performLocationUpdate(technicianId, location);
  }

  /**
   * Performs the actual HTTP PUT request to update technician location
   * Separated for reusability and cleaner permission flow
   * @param technicianId Technician ID
   * @param location GeoLocation data
   * @returns Observable<void>
   */
  private performLocationUpdate(technicianId: string, location: GeoLocation): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${technicianId}/location`, location)
      .pipe(
        retry(1), // Retry once on network failure
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves technician field statuses from the dedicated endpoint
   * Used by admin/manager views to see real-time technician status
   * @param filters Optional status and region filters
   * @returns Observable of technician field status data
   */
  getFieldStatuses(filters?: { status?: string; region?: string }): Observable<any[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.region) {
      params = params.set('region', filters.region);
    }

    return this.http.get<any[]>(`${this.apiUrl}/field-status`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handles HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Provide more specific error messages based on status code
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Technician not found.';
          break;
        case 409:
          errorMessage = 'Conflict. A technician with this ID already exists.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
      }
    }
    
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
