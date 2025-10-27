import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { PhaseGuardService } from './phase-guard.service';
import { DeploymentService } from './deployment.service';
import { DeploymentStateService } from './deployment-state.service';
import { AuthService } from 'src/app/services/auth.service';
import { DeploymentStatus } from '../models/deployment.models';

describe('PhaseGuardService', () => {
  let guard: PhaseGuardService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        PhaseGuardService,
        DeploymentStateService,
        {
          provide: DeploymentService,
          useValue: {
            get: () => of({ id: '1', name: 'Test', dataCenter: 'DC1', vendor: 'Vendor', status: DeploymentStatus.Planned }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getUser: () => ({ role: 'Vendor' }),
          },
        },
      ],
    });

    guard = TestBed.inject(PhaseGuardService);
    router = TestBed.inject(Router);
  });

  it('allows vendor to access survey phase', done => {
    const route = new ActivatedRouteSnapshot();
    (route as any).paramMap = convertToParamMap({ id: '1', phase: DeploymentStatus.Survey });
    guard.canActivate(route, {} as RouterStateSnapshot).subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('blocks vendor from handoff phase', done => {
    const navigateSpy = spyOn(router, 'parseUrl').and.callThrough();
    const route = new ActivatedRouteSnapshot();
    (route as any).paramMap = convertToParamMap({ id: '1', phase: DeploymentStatus.Handoff });

    guard.canActivate(route, {} as RouterStateSnapshot).subscribe(result => {
      expect(result).not.toBeTrue();
      expect(navigateSpy).toHaveBeenCalled();
      done();
    });
  });
});
