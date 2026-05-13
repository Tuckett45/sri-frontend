import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as AdminViewerActions from './admin-viewer.actions';
import { AdminMetricsService } from '../../services/admin-metrics.service';

@Injectable()
export class AdminViewerEffects {
  private actions$ = inject(Actions);
  private adminMetricsService = inject(AdminMetricsService);
  
  loadAdminMetrics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminViewerActions.loadAdminMetrics, AdminViewerActions.refreshMetrics),
      switchMap((action) => {
        const timeRange = 'timeRange' in action ? action.timeRange : undefined;
        return this.adminMetricsService.loadAdminMetrics(timeRange).pipe(
          map(({ metrics, systemHealth, activeUsers }) =>
            AdminViewerActions.loadAdminMetricsSuccess({ metrics, systemHealth, activeUsers })
          ),
          catchError((error) =>
            of(AdminViewerActions.loadAdminMetricsFailure({ error: error.message }))
          )
        );
      })
    )
  );
  
  loadAuditLog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminViewerActions.loadAuditLog),
      switchMap(({ filters }) =>
        this.adminMetricsService.filterAuditLog(filters).pipe(
          map((auditLog) =>
            AdminViewerActions.loadAuditLogSuccess({ auditLog })
          ),
          catchError((error) =>
            of(AdminViewerActions.loadAuditLogFailure({ error: error.message }))
          )
        )
      )
    )
  );
  
  filterAuditLog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminViewerActions.filterAuditLog),
      map(({ filters }) =>
        AdminViewerActions.loadAuditLog({ filters })
      )
    )
  );
  
  exportAuditLog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminViewerActions.exportAuditLog),
      switchMap(({ format }) =>
        this.adminMetricsService.exportAuditLog(format).pipe(
          map(() => AdminViewerActions.exportAuditLogSuccess()),
          catchError((error) =>
            of(AdminViewerActions.exportAuditLogFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
