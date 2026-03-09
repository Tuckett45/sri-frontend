import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AtlasDeploymentService } from '../../../services/atlas-deployment.service';
import {
  DeploymentDto,
  DeploymentDetailDto,
  CreateDeploymentRequest,
  UpdateDeploymentRequest,
  StateTransitionRequest,
  DeploymentType
} from '../models/deployment.model';
import { LifecycleState } from '../models/approval.model';
import { PagedResult } from '../models/common.model';
import { DeploymentFilters } from '../state/deployments/deployment.state';

/**
 * Feature-level deployment service for the ATLAS module.
 *
 * Wraps AtlasDeploymentService (the typed API layer added during integration)
 * and maps Atlas DTOs to the feature's own model types so the rest of the
 * ATLAS module remains decoupled from the global services layer.
 */
@Injectable({ providedIn: 'root' })
export class DeploymentService {
  constructor(private atlasDeploymentService: AtlasDeploymentService) {}

  getDeployments(
    filters?: DeploymentFilters,
    page = 1,
    pageSize = 25
  ): Observable<{ items: DeploymentDto[]; pagination: any }> {
    return this.atlasDeploymentService
      .listDeployments(page, pageSize, filters?.assignedToMe)
      .pipe(
        map((result) => ({
          items: result.items.map(this.mapToDto),
          pagination: {
            currentPage: result.page,
            pageSize: result.pageSize,
            totalCount: result.totalCount,
            totalPages: result.totalPages
          }
        }))
      );
  }

  getDeployment(id: string): Observable<DeploymentDetailDto> {
    return this.atlasDeploymentService
      .getDeployment(id)
      .pipe(map((d) => this.mapToDto(d) as DeploymentDetailDto));
  }

  createDeployment(request: CreateDeploymentRequest): Observable<DeploymentDto> {
    return from(
      this.atlasDeploymentService.createDeployment({
        title: request.title,
        type: request.type as any,
        metadata: request.metadata
      })
    ).pipe(map(this.mapToDto));
  }

  updateDeployment(
    id: string,
    request: UpdateDeploymentRequest
  ): Observable<DeploymentDto> {
    return from(
      this.atlasDeploymentService.updateDeployment(id, {
        title: request.title,
        type: request.type as any,
        metadata: request.metadata
      })
    ).pipe(map(this.mapToDto));
  }

  transitionState(
    id: string,
    request: StateTransitionRequest
  ): Observable<DeploymentDto> {
    return from(
      this.atlasDeploymentService.transitionDeployment(id, {
        targetState: request.targetState as any,
        reason: request.reason
      })
    ).pipe(
      map((response) => ({
        id: response.deploymentId,
        type: DeploymentType.STANDARD,
        currentState: response.newState as unknown as LifecycleState,
        clientId: '',
        createdBy: '',
        createdAt: new Date(),
        updatedAt: new Date(response.transitionedAt)
      }))
    );
  }

  private mapToDto(d: any): DeploymentDto {
    return {
      id: d.id,
      title: d.title,
      type: d.type as unknown as DeploymentType,
      currentState: d.currentState as unknown as LifecycleState,
      clientId: d.clientId,
      createdBy: d.createdBy,
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt),
      metadata: d.metadata
    };
  }
}
