import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { AtlasConfigService } from './atlas-config.service';
import * as AIAnalysisActions from '../state/ai-analysis/ai-analysis.actions';

/**
 * Preload configuration options
 */
export interface PreloadConfig {
  /** Whether to preload AI agents (default: true) */
  aiAgents?: boolean;
  /** Whether to preload user approvals (default: false) */
  userApprovals?: boolean;
}

/**
 * Preload result
 */
export interface PreloadResult {
  success: boolean;
  aiAgents?: boolean;
  userApprovals?: boolean;
  errors?: string[];
}

/**
 * AtlasPreloadService
 * 
 * Manages preloading of critical ATLAS data during application initialization
 * to improve perceived performance and reduce initial load times.
 * 
 * Features:
 * - Configurable preloading of different data types
 * - Parallel loading for efficiency
 * - Error handling and fallback
 * - Integration with NgRx store
 * 
 * Requirements: 11.9
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasPreloadService {
  private preloaded = false;
  private preloadInProgress = false;

  constructor(
    private store: Store,
    private configService: AtlasConfigService
  ) {}

  /**
   * Preload critical ATLAS data
   * 
   * @param config - Preload configuration options
   * @returns Observable that emits when preloading completes
   */
  preload(config?: PreloadConfig): Observable<PreloadResult> {
    // Prevent duplicate preloading
    if (this.preloaded || this.preloadInProgress) {
      return of({
        success: true,
        aiAgents: this.preloaded,
        userApprovals: false
      });
    }

    this.preloadInProgress = true;

    const preloadConfig: Required<PreloadConfig> = {
      aiAgents: config?.aiAgents ?? true,
      userApprovals: config?.userApprovals ?? false
    };

    const preloadTasks: Observable<any>[] = [];
    const result: PreloadResult = {
      success: true,
      errors: []
    };

    // Preload AI agents
    if (preloadConfig.aiAgents) {
      const agentsTask$ = this.preloadAIAgents().pipe(
        tap(() => {
          result.aiAgents = true;
        }),
        catchError(error => {
          result.aiAgents = false;
          result.errors?.push(`AI agents preload failed: ${error.message}`);
          return of(null);
        })
      );
      preloadTasks.push(agentsTask$);
    }

    // Preload user approvals
    if (preloadConfig.userApprovals) {
      const approvalsTask$ = this.preloadUserApprovals().pipe(
        tap(() => {
          result.userApprovals = true;
        }),
        catchError(error => {
          result.userApprovals = false;
          result.errors?.push(`User approvals preload failed: ${error.message}`);
          return of(null);
        })
      );
      preloadTasks.push(approvalsTask$);
    }

    // Execute all preload tasks in parallel
    if (preloadTasks.length === 0) {
      this.preloadInProgress = false;
      return of(result);
    }

    return forkJoin(preloadTasks).pipe(
      map(() => {
        this.preloaded = true;
        this.preloadInProgress = false;
        result.success = (result.errors?.length || 0) === 0;
        return result;
      }),
      catchError(error => {
        this.preloadInProgress = false;
        result.success = false;
        result.errors?.push(`Preload failed: ${error.message}`);
        return of(result);
      })
    );
  }

  /**
   * Preload available AI agents
   * 
   * @returns Observable that completes when agents are loaded
   */
  private preloadAIAgents(): Observable<void> {
    return new Observable(observer => {
      // Dispatch action to load AI agents
      this.store.dispatch(AIAnalysisActions.loadAvailableAgents());

      // Complete immediately - the store will handle the actual loading
      observer.next();
      observer.complete();
    });
  }

  /**
   * Preload user's pending approvals
   * 
   * @returns Observable that completes when approvals are loaded
   */
  private preloadUserApprovals(): Observable<void> {
    return new Observable(observer => {
      // This would dispatch an action to load user approvals
      // For now, just complete as this is optional
      observer.next();
      observer.complete();
    });
  }

  /**
   * Check if data has been preloaded
   * 
   * @returns True if preload has completed
   */
  isPreloaded(): boolean {
    return this.preloaded;
  }

  /**
   * Check if preload is currently in progress
   * 
   * @returns True if preload is running
   */
  isPreloading(): boolean {
    return this.preloadInProgress;
  }

  /**
   * Reset preload state (useful for testing or re-initialization)
   */
  reset(): void {
    this.preloaded = false;
    this.preloadInProgress = false;
  }

  /**
   * Preload data for a specific deployment
   * Useful for detail page optimization
   * 
   * @param deploymentId - Deployment ID to preload
   * @returns Observable that completes when data is loaded
   */
  preloadDeploymentDetail(deploymentId: string): Observable<void> {
    return new Observable(observer => {
      // Dispatch actions to load deployment detail and related data
      this.store.dispatch(DeploymentActions.loadDeploymentDetail({ id: deploymentId }));
      this.store.dispatch(AIAnalysisActions.analyzeDeployment({ deploymentId }));

      observer.next();
      observer.complete();
    });
  }

  /**
   * Preload data based on route
   * Can be called from route resolvers
   * 
   * @param route - Route name or path
   * @param params - Route parameters
   * @returns Observable that completes when preload finishes
   */
  preloadForRoute(route: string, params?: any): Observable<PreloadResult> {
    switch (route) {
      case 'deployments':
        return this.preload({ deployments: true, aiAgents: false });
      
      case 'deployment-detail':
        if (params?.id) {
          return this.preloadDeploymentDetail(params.id).pipe(
            map(() => ({ success: true }))
          );
        }
        return of({ success: false, errors: ['No deployment ID provided'] });
      
      case 'ai-analysis':
        return this.preload({ deployments: false, aiAgents: true });
      
      default:
        return this.preload();
    }
  }
}
