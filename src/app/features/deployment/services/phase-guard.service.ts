import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DeploymentService } from './deployment.service';
import { DeploymentStateService } from './deployment-state.service';
import { AuthService } from 'src/app/services/auth.service';
import { DeploymentStatus } from '../models/deployment.models';

const ROLE_ORDER: DeploymentStatus[] = [
  'Planned','Survey','Inventory','Install','Cabling','Labeling','Handoff','Complete'
] as unknown as DeploymentStatus[]; // if DeploymentStatus is a string union

@Injectable({ providedIn: 'root' })
export class PhaseGuardService {
  private readonly auth = inject(AuthService);
  private readonly deployments = inject(DeploymentService);
  private readonly state = inject(DeploymentStateService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    const projectId = route.paramMap.get('id');
    const phaseParamRaw = route.paramMap.get('phase'); // string | null

    if (!projectId) return of(this.router.parseUrl('/deployments'));
    if (!phaseParamRaw) return of(true);

    // normalize phase name (case-insensitive, hyphens to proper case if needed)
    const phaseParam = this.normalizePhase(phaseParamRaw);

    const user = this.auth.getUser();
    const role = (user?.role ?? '').toString();

    // Convert the Promise from deployments.get(...) to an Observable via from()
    return from(this.deployments.get(projectId)).pipe(
      map(project => {
        this.state.setProject(project);

        const phaseIndex = ROLE_ORDER.indexOf(phaseParam as DeploymentStatus);
        if (phaseIndex === -1) {
          return this.router.parseUrl(`/deployments/${projectId}`);
        }

        switch (role) {
          case 'Admin':
          case 'DE':
            return true;
          case 'Vendor':
            return phaseIndex >= ROLE_ORDER.indexOf('Survey' as DeploymentStatus) &&
                   phaseIndex <= ROLE_ORDER.indexOf('Labeling' as DeploymentStatus)
              ? true
              : this.router.parseUrl(`/deployments/${projectId}`);
          default:
            return this.router.parseUrl('/overview');
        }
      }),
      catchError(() => of(this.router.parseUrl('/deployments')))
    );
  }

  private normalizePhase(raw: string): string {
    const v = raw.trim().toLowerCase();
    // map common variants if your routes use lowercase slugs
    switch (v) {
      case 'planned':   return 'Planned';
      case 'survey':    return 'Survey';
      case 'inventory': return 'Inventory';
      case 'install':   return 'Install';
      case 'cabling':   return 'Cabling';
      case 'labeling':  return 'Labeling';
      case 'handoff':   return 'Handoff';
      case 'complete':  return 'Complete';
      default:          return raw; // fallback
    }
  }
}

// If you want a functional alias:
export const phaseGuard = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) =>
  inject(PhaseGuardService).canActivate(route, state);
