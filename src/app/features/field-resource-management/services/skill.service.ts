import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { Skill, SkillLevel } from '../models/technician.model';
import { environment } from '../../../../environments/environments';

/**
 * Response shape from the backend MasterSkills API
 */
export interface MasterSkillResponse {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating a new skill
 */
export interface CreateSkillRequest {
  name: string;
  category?: string;
}

/**
 * Service for managing the master skills catalog.
 * Communicates with the backend /skills API endpoints.
 */
@Injectable({
  providedIn: 'root'
})
export class SkillService {
  private readonly apiUrl = `${environment.atlasApiUrl}/skills`;
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * Fetches all active skills from the master catalog.
   * @param category Optional category filter
   * @param search Optional search term
   * @returns Observable of Skill array (mapped to frontend model)
   */
  getSkills(category?: string, search?: string): Observable<Skill[]> {
    let params = new HttpParams();

    if (category) {
      params = params.set('category', category);
    }
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<MasterSkillResponse[]>(this.apiUrl, { params })
      .pipe(
        retry(this.retryCount),
        map(response => this.mapSkillsResponse(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Creates a new skill in the master catalog.
   * If a skill with the same name already exists, returns the existing one.
   * @param name Skill name
   * @param category Optional category (defaults to 'Custom' if not provided)
   * @returns Observable of the created/existing Skill
   */
  createSkill(name: string, category?: string): Observable<Skill> {
    const body: CreateSkillRequest = {
      name,
      category: category || 'Custom'
    };

    return this.http.post<MasterSkillResponse>(this.apiUrl, body)
      .pipe(
        map(response => this.mapSkillResponse(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Gets all distinct skill categories.
   * @returns Observable of string array
   */
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Maps a list of backend MasterSkill responses to the frontend Skill interface.
   */
  private mapSkillsResponse(response: any): Skill[] {
    // Handle .NET $values wrapper
    const items = (response as any)?.$values ?? (Array.isArray(response) ? response : []);

    return items.map((s: any) => this.mapSkillResponse(s));
  }

  /**
   * Maps a single backend MasterSkill response to the frontend Skill interface.
   */
  private mapSkillResponse(s: any): Skill {
    return {
      id: s.id || s.Id || '',
      name: s.name || s.Name || '',
      category: s.category || s.Category || 'General',
      level: SkillLevel.Intermediate // Default level for available skills
    };
  }

  /**
   * Handles HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred with the skills service';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid skill request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 409:
          errorMessage = 'A skill with this name already exists.';
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
