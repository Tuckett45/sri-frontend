import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as RolePermissionsActions from './role-permissions.actions';
import { RolePermission } from '../../models/permission.model';
import { ApiHeadersService } from '../../services/api-headers.service';
import { ConfigurationService } from '../../services/configuration.service';

/**
 * Effects for role permissions state management
 * Handles API calls for loading and updating permissions
 */
@Injectable()
export class RolePermissionsEffects {
  private apiUrl: string = 'https://sri-api.azurewebsites.net/api';

  constructor(
    private actions$: Actions,
    private http: HttpClient,
    private apiHeaders: ApiHeadersService,
    private configService: ConfigurationService
  ) {
    // Get API URL from configuration
    const config = this.configService.getCurrentConfig();
    if (config?.apiBaseUrl) {
      this.apiUrl = config.apiBaseUrl;
    }
  }

  /**
   * Load permissions for a specific role
   */
  loadRolePermissions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RolePermissionsActions.loadRolePermissions),
      switchMap(({ role }) => {
        const headers = this.apiHeaders.getApiHeaders();
        
        return this.http.get<RolePermission>(
          `${this.apiUrl}/permissions/roles/${role}`,
          { headers }
        ).pipe(
          map(rolePermission => 
            RolePermissionsActions.loadRolePermissionsSuccess({ rolePermission })
          ),
          catchError(error => {
            console.error('Failed to load role permissions:', error);
            return of(RolePermissionsActions.loadRolePermissionsFailure({ 
              error: error.message || 'Failed to load role permissions' 
            }));
          })
        );
      })
    )
  );

  /**
   * Load all permissions
   */
  loadAllPermissions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RolePermissionsActions.loadAllPermissions),
      switchMap(() => {
        const headers = this.apiHeaders.getApiHeaders();
        
        return this.http.get<RolePermission[]>(
          `${this.apiUrl}/permissions/roles`,
          { headers }
        ).pipe(
          map(permissions => 
            RolePermissionsActions.loadAllPermissionsSuccess({ permissions })
          ),
          catchError(error => {
            console.error('Failed to load all permissions:', error);
            return of(RolePermissionsActions.loadAllPermissionsFailure({ 
              error: error.message || 'Failed to load all permissions' 
            }));
          })
        );
      })
    )
  );

  /**
   * Update role permissions
   */
  updateRolePermissions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RolePermissionsActions.updateRolePermissions),
      switchMap(({ rolePermission }) => {
        const headers = this.apiHeaders.getApiHeaders();
        
        return this.http.put<RolePermission>(
          `${this.apiUrl}/permissions/roles/${rolePermission.role}`,
          rolePermission,
          { headers }
        ).pipe(
          map(updatedPermission => 
            RolePermissionsActions.updateRolePermissionsSuccess({ 
              rolePermission: updatedPermission 
            })
          ),
          catchError(error => {
            console.error('Failed to update role permissions:', error);
            return of(RolePermissionsActions.updateRolePermissionsFailure({ 
              error: error.message || 'Failed to update role permissions' 
            }));
          })
        );
      })
    )
  );

  /**
   * Log successful permission loads
   */
  logSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        RolePermissionsActions.loadRolePermissionsSuccess,
        RolePermissionsActions.loadAllPermissionsSuccess,
        RolePermissionsActions.updateRolePermissionsSuccess
      ),
      tap(action => {
        console.log('Role permissions action successful:', action.type);
      })
    ),
    { dispatch: false }
  );
}
