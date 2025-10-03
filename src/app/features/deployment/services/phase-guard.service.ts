import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DeploymentService } from './deployment.service';
import { DeploymentStateService } from './deployment-state.service';
import { AuthService } from 'src/app/services/auth.service';
import { DeploymentStatus } from '../models/deployment.models';

const ROLE_ORDER: DeploymentStatus[] = [
  DeploymentStatus.Planned,
  DeploymentStatus.Survey,
  DeploymentStatus.Inventory,
  DeploymentStatus.Install,
  DeploymentStatus.Cabling,
  DeploymentStatus.Labeling,
  DeploymentStatus.Handoff,
  DeploymentStatus.Complete,
];

@Injectable({ providedIn: 'root' })
export class PhaseGuardService {
  private readonly auth = inject(AuthService);
  private readonly deployments = inject(DeploymentService);
  private readonly state = inject(DeploymentStateService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    const projectId = route.paramMap.get('id');
    const phaseParam = route.paramMap.get('phase') as DeploymentStatus | null;

    if (!projectId) {
      return of(this.router.parseUrl('/deployments'));
    }

    const user = this.auth.getUser();
    const role = (user?.role ?? '').toString();

    if (!phaseParam) {
      return of(true);
    }

    return this.deployments.get(projectId).pipe(
      map(project => {
        this.state.setProject(project);
        const phaseIndex = ROLE_ORDER.indexOf(phaseParam);
        if (phaseIndex === -1) {
          return this.router.parseUrl(`/deployments/${projectId}`);
        }

        switch (role) {
          case 'Admin':
            return true;
          case 'DE':
            return true;
          case 'Vendor':
            return phaseIndex >= ROLE_ORDER.indexOf(DeploymentStatus.Survey) &&
              phaseIndex <= ROLE_ORDER.indexOf(DeploymentStatus.Labeling)
              ? true
              : this.router.parseUrl(`/deployments/${projectId}`);
          default:
            return this.router.parseUrl('/overview');
        }
      }),
      catchError(() => of(this.router.parseUrl('/deployments')))
    );
  }
}

export const phaseGuard: CanActivateFn = (route, state) => {
  return inject(PhaseGuardService).canActivate(route, state);
};
