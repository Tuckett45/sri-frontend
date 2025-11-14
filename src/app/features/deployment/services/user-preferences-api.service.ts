import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from 'src/environments/environments';

/**
 * User notification preferences from backend
 */
export interface UserNotificationPreferences {
  userId: string;
  notificationsEnabled: boolean;
  autoAssignEnabled: boolean;
  strictRoleEnforcement: boolean;
  showRoleColors: boolean;
  createdAt: string;
  lastModified: string;
}

/**
 * DTO for updating preferences
 */
export interface UpdateUserPreferencesDTO {
  notificationsEnabled: boolean;
  autoAssignEnabled: boolean;
  strictRoleEnforcement: boolean;
  showRoleColors: boolean;
}

/**
 * Service for syncing user notification preferences with backend
 * Provides API integration for cross-device preference synchronization
 */
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/user-preferences`;

  /**
   * Get user's notification preferences from backend
   * Returns defaults if none exist
   */
  getUserPreferences(): Observable<UserNotificationPreferences> {
    return this.http.get<UserNotificationPreferences>(`${this.apiUrl}/notifications`).pipe(
      tap(prefs => console.log('📥 Loaded user preferences from API:', prefs)),
      catchError(error => {
        console.error('❌ Failed to load user preferences from API:', error);
        throw error;
      })
    );
  }

  /**
   * Update user's notification preferences on backend
   * Creates new preferences if none exist
   */
  updateUserPreferences(dto: UpdateUserPreferencesDTO): Observable<UserNotificationPreferences> {
    return this.http.put<UserNotificationPreferences>(`${this.apiUrl}/notifications`, dto).pipe(
      tap(prefs => console.log('💾 Saved user preferences to API:', prefs)),
      catchError(error => {
        console.error('❌ Failed to save user preferences to API:', error);
        throw error;
      })
    );
  }

  /**
   * Delete user's notification preferences (reset to defaults)
   */
  deleteUserPreferences(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/notifications`).pipe(
      tap(() => console.log('🗑️ Deleted user preferences from API')),
      catchError(error => {
        console.error('❌ Failed to delete user preferences from API:', error);
        throw error;
      })
    );
  }
}

