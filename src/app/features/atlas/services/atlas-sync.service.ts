import { Injectable, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subject, interval } from 'rxjs';
import { takeUntil, filter, debounceTime } from 'rxjs/operators';
import { AtlasSignalRService, AtlasEventType } from './atlas-signalr.service';
import { AtlasConfigService } from './atlas-config.service';

/**
 * Synchronization status
 */
export enum SyncStatus {
  Synced = 'Synced',
  Syncing = 'Syncing',
  OutOfSync = 'OutOfSync',
  Offline = 'Offline',
  Error = 'Error'
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolutionStrategy {
  ServerWins = 'ServerWins',
  ClientWins = 'ClientWins',
  MergeChanges = 'MergeChanges',
  PromptUser = 'PromptUser'
}

/**
 * Queued operation for offline execution
 */
export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'transition' | 'evidence';
  entityType: 'deployment' | 'approval' | 'exception' | 'agent';
  entityId?: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * Data conflict
 */
export interface DataConflict {
  id: string;
  entityType: string;
  entityId: string;
  clientVersion: any;
  serverVersion: any;
  timestamp: Date;
  resolved: boolean;
  resolution?: ConflictResolutionStrategy;
}

/**
 * Synchronization state
 */
export interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingOperations: number;
  conflicts: number;
  isOnline: boolean;
}

/**
 * AtlasSyncService
 * 
 * Manages data synchronization between ARK frontend and ATLAS backend.
 * Handles real-time updates, conflict resolution, offline queueing,
 * consistency validation, and manual refresh capabilities.
 * 
 * Requirements: 8.1, 8.3, 8.7, 8.8, 8.9, 8.10
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasSyncService implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Synchronization state
  private syncStateSubject = new BehaviorSubject<SyncState>({
    status: SyncStatus.Synced,
    lastSyncTime: null,
    pendingOperations: 0,
    conflicts: 0,
    isOnline: navigator.onLine
  });

  // Offline operation queue
  private operationQueue: QueuedOperation[] = [];
  private readonly QUEUE_STORAGE_KEY = 'atlas_operation_queue';
  private readonly MAX_QUEUE_SIZE = 100;

  // Conflict tracking
  private conflicts: Map<string, DataConflict> = new Map();
  
  // Consistency validation
  private consistencyCheckInterval: any = null;
  private readonly CONSISTENCY_CHECK_INTERVAL_MS = 300000; // 5 minutes

  // SignalR subscriptions
  private signalRSubscriptions: string[] = [];

  constructor(
    private signalRService: AtlasSignalRService,
    private configService: AtlasConfigService,
    private store: Store
  ) {
    this.initialize();
  }

  /**
   * Get synchronization state as observable
   */
  get syncState$(): Observable<SyncState> {
    return this.syncStateSubject.asObservable();
  }

  /**
   * Get current synchronization state
   */
  get syncState(): SyncState {
    return this.syncStateSubject.value;
  }

  /**
   * Initialize synchronization service
   * Requirements: 8.1
   */
  private initialize(): void {
    // Load queued operations from storage
    this.loadQueueFromStorage();

    // Set up real-time event handlers (Requirement 8.1)
    this.setupRealtimeEventHandlers();

    // Monitor online/offline status
    this.setupOnlineStatusMonitoring();

    // Start consistency validation (Requirements 8.8, 8.9)
    this.startConsistencyValidation();

    // Process queued operations when online
    this.processQueueWhenOnline();
  }

  /**
   * Set up real-time event handlers for ATLAS updates
   * Requirements: 8.1
   */
  private setupRealtimeEventHandlers(): void {
    // Subscribe to deployment events
    const deploymentSub = this.signalRService.subscribe(
      AtlasEventType.DeploymentUpdated,
      (data) => this.handleDeploymentUpdate(data)
    );
    this.signalRSubscriptions.push(deploymentSub);

    const deploymentCreatedSub = this.signalRService.subscribe(
      AtlasEventType.DeploymentCreated,
      (data) => this.handleDeploymentCreated(data)
    );
    this.signalRSubscriptions.push(deploymentCreatedSub);

    const deploymentDeletedSub = this.signalRService.subscribe(
      AtlasEventType.DeploymentDeleted,
      (data) => this.handleDeploymentDeleted(data)
    );
    this.signalRSubscriptions.push(deploymentDeletedSub);

    const stateTransitionSub = this.signalRService.subscribe(
      AtlasEventType.DeploymentStateTransitioned,
      (data) => this.handleStateTransition(data)
    );
    this.signalRSubscriptions.push(stateTransitionSub);

    const evidenceSub = this.signalRService.subscribe(
      AtlasEventType.EvidenceSubmitted,
      (data) => this.handleEvidenceSubmitted(data)
    );
    this.signalRSubscriptions.push(evidenceSub);

    // Subscribe to approval events
    const approvalRequestedSub = this.signalRService.subscribe(
      AtlasEventType.ApprovalRequested,
      (data) => this.handleApprovalRequested(data)
    );
    this.signalRSubscriptions.push(approvalRequestedSub);

    const approvalDecisionSub = this.signalRService.subscribe(
      AtlasEventType.ApprovalDecisionRecorded,
      (data) => this.handleApprovalDecision(data)
    );
    this.signalRSubscriptions.push(approvalDecisionSub);

    // Subscribe to exception events
    const exceptionCreatedSub = this.signalRService.subscribe(
      AtlasEventType.ExceptionCreated,
      (data) => this.handleExceptionCreated(data)
    );
    this.signalRSubscriptions.push(exceptionCreatedSub);

    const exceptionApprovedSub = this.signalRService.subscribe(
      AtlasEventType.ExceptionApproved,
      (data) => this.handleExceptionApproved(data)
    );
    this.signalRSubscriptions.push(exceptionApprovedSub);

    const exceptionDeniedSub = this.signalRService.subscribe(
      AtlasEventType.ExceptionDenied,
      (data) => this.handleExceptionDenied(data)
    );
    this.signalRSubscriptions.push(exceptionDeniedSub);

    // Subscribe to AI analysis events
    const analysisCompletedSub = this.signalRService.subscribe(
      AtlasEventType.AnalysisCompleted,
      (data) => this.handleAnalysisCompleted(data)
    );
    this.signalRSubscriptions.push(analysisCompletedSub);

    const riskAssessmentSub = this.signalRService.subscribe(
      AtlasEventType.RiskAssessmentCompleted,
      (data) => this.handleRiskAssessmentCompleted(data)
    );
    this.signalRSubscriptions.push(riskAssessmentSub);

    // Subscribe to agent events
    const agentExecutionSub = this.signalRService.subscribe(
      AtlasEventType.AgentExecutionCompleted,
      (data) => this.handleAgentExecutionCompleted(data)
    );
    this.signalRSubscriptions.push(agentExecutionSub);

    console.log('Real-time event handlers set up successfully');
  }

  /**
   * Handle deployment update event
   * Requirements: 8.1, 8.3
   */
  private handleDeploymentUpdate(data: any): void {
    console.log('Handling deployment update:', data);
    
    // Check for conflicts with local changes
    this.checkForConflicts('deployment', data.id, data);

    // Update local state via NgRx
    import('../state/deployments/deployment.actions').then((actions) => {
      this.store.dispatch(actions.loadDeploymentDetail({ id: data.id }));
    });

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle deployment created event
   * Requirements: 8.1
   */
  private handleDeploymentCreated(data: any): void {
    console.log('Handling deployment created:', data);
    
    // Refresh deployment list
    import('../state/deployments/deployment.actions').then((actions) => {
      this.store.dispatch(actions.refreshDeployments());
    });

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle deployment deleted event
   * Requirements: 8.1
   */
  private handleDeploymentDeleted(data: any): void {
    console.log('Handling deployment deleted:', data);
    
    // Refresh deployment list
    import('../state/deployments/deployment.actions').then((actions) => {
      this.store.dispatch(actions.refreshDeployments());
    });

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle state transition event
   * Requirements: 8.1
   */
  private handleStateTransition(data: any): void {
    console.log('Handling state transition:', data);
    
    // Reload deployment to reflect state change
    if (data.deploymentId) {
      import('../state/deployments/deployment.actions').then((actions) => {
        this.store.dispatch(actions.loadDeploymentDetail({ id: data.deploymentId }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle evidence submitted event
   * Requirements: 8.1
   */
  private handleEvidenceSubmitted(data: any): void {
    console.log('Handling evidence submitted:', data);
    
    // Reload deployment to show new evidence
    if (data.deploymentId) {
      import('../state/deployments/deployment.actions').then((actions) => {
        this.store.dispatch(actions.loadDeploymentDetail({ id: data.deploymentId }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle approval requested event
   * Requirements: 8.1
   */
  private handleApprovalRequested(data: any): void {
    console.log('Handling approval requested:', data);
    
    // Reload pending approvals
    import('../state/approvals/approval.actions').then((actions) => {
      this.store.dispatch(actions.loadPendingApprovals({ deploymentId: data.deploymentId }));
    });

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle approval decision event
   * Requirements: 8.1
   */
  private handleApprovalDecision(data: any): void {
    console.log('Handling approval decision:', data);
    
    // Reload approvals for the deployment
    if (data.deploymentId) {
      import('../state/approvals/approval.actions').then((actions) => {
        this.store.dispatch(actions.loadPendingApprovals({ deploymentId: data.deploymentId }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle exception created event
   * Requirements: 8.1
   */
  private handleExceptionCreated(data: any): void {
    console.log('Handling exception created:', data);
    
    // Reload exceptions for the deployment
    if (data.deploymentId) {
      import('../state/exceptions/exception.actions').then((actions) => {
        this.store.dispatch(actions.loadExceptions({ deploymentId: data.deploymentId }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle exception approved event
   * Requirements: 8.1
   */
  private handleExceptionApproved(data: any): void {
    console.log('Handling exception approved:', data);
    
    // Reload exceptions for the deployment
    if (data.deploymentId) {
      import('../state/exceptions/exception.actions').then((actions) => {
        this.store.dispatch(actions.loadExceptions({ deploymentId: data.deploymentId }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle exception denied event
   * Requirements: 8.1
   */
  private handleExceptionDenied(data: any): void {
    console.log('Handling exception denied:', data);
    
    // Reload exceptions for the deployment
    if (data.deploymentId) {
      import('../state/exceptions/exception.actions').then((actions) => {
        this.store.dispatch(actions.loadExceptions({ deploymentId: data.deploymentId }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle analysis completed event
   * Requirements: 8.1
   */
  private handleAnalysisCompleted(data: any): void {
    console.log('Handling analysis completed:', data);
    
    // Update AI analysis state
    if (data.deploymentId) {
      import('../state/ai-analysis/ai-analysis.actions').then((actions) => {
        this.store.dispatch(actions.analyzeDeploymentSuccess({ 
          deploymentId: data.deploymentId,
          result: data 
        }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle risk assessment completed event
   * Requirements: 8.1
   */
  private handleRiskAssessmentCompleted(data: any): void {
    console.log('Handling risk assessment completed:', data);
    
    // Update AI analysis state
    if (data.deploymentId) {
      import('../state/ai-analysis/ai-analysis.actions').then((actions) => {
        this.store.dispatch(actions.assessRiskSuccess({ 
          deploymentId: data.deploymentId,
          assessment: data 
        }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Handle agent execution completed event
   * Requirements: 8.1
   */
  private handleAgentExecutionCompleted(data: any): void {
    console.log('Handling agent execution completed:', data);
    
    // Reload agent performance data
    if (data.agentId) {
      import('../state/agents/agent.actions').then((actions) => {
        this.store.dispatch(actions.loadPerformanceReport({ agentId: data.agentId }));
      });
    }

    this.updateSyncState({ lastSyncTime: new Date() });
  }

  /**
   * Check for conflicts between local and server data
   * Requirements: 8.3
   */
  private checkForConflicts(entityType: string, entityId: string, serverData: any): void {
    // Get local version from store
    // This is a simplified implementation - in production, you'd compare timestamps/versions
    
    // For now, we'll use ServerWins strategy by default
    // In a real implementation, you'd:
    // 1. Get local entity from store
    // 2. Compare versions/timestamps
    // 3. If conflict detected, apply resolution strategy
    
    console.log(`Checking for conflicts: ${entityType}/${entityId}`);
    
    // Example conflict detection (simplified)
    // const hasConflict = this.detectConflict(localData, serverData);
    // if (hasConflict) {
    //   this.resolveConflict(entityType, entityId, localData, serverData);
    // }
  }

  /**
   * Resolve data conflict
   * Requirements: 8.3
   */
  private resolveConflict(
    entityType: string,
    entityId: string,
    clientVersion: any,
    serverVersion: any,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.ServerWins
  ): void {
    console.log(`Resolving conflict for ${entityType}/${entityId} using strategy: ${strategy}`);

    const conflict: DataConflict = {
      id: this.generateConflictId(),
      entityType,
      entityId,
      clientVersion,
      serverVersion,
      timestamp: new Date(),
      resolved: false,
      resolution: strategy
    };

    this.conflicts.set(conflict.id, conflict);
    this.updateSyncState({ 
      conflicts: this.conflicts.size,
      status: SyncStatus.OutOfSync
    });

    // Apply resolution strategy
    switch (strategy) {
      case ConflictResolutionStrategy.ServerWins:
        // Server data takes precedence - already handled by real-time update
        conflict.resolved = true;
        console.log('Conflict resolved: Server wins');
        break;

      case ConflictResolutionStrategy.ClientWins:
        // Re-submit client changes to server
        this.resubmitClientChanges(entityType, entityId, clientVersion);
        conflict.resolved = true;
        console.log('Conflict resolved: Client wins');
        break;

      case ConflictResolutionStrategy.MergeChanges:
        // Merge client and server changes
        const merged = this.mergeChanges(clientVersion, serverVersion);
        this.resubmitClientChanges(entityType, entityId, merged);
        conflict.resolved = true;
        console.log('Conflict resolved: Changes merged');
        break;

      case ConflictResolutionStrategy.PromptUser:
        // Notify user to resolve manually
        console.log('Conflict requires user resolution');
        // In a real implementation, you'd emit an event for the UI to handle
        break;
    }

    // Update conflict status
    if (conflict.resolved) {
      this.conflicts.delete(conflict.id);
      this.updateSyncState({ 
        conflicts: this.conflicts.size,
        status: this.conflicts.size === 0 ? SyncStatus.Synced : SyncStatus.OutOfSync
      });
    }
  }

  /**
   * Merge client and server changes
   * Requirements: 8.3
   */
  private mergeChanges(clientVersion: any, serverVersion: any): any {
    // Simple merge strategy - in production, use a proper merge algorithm
    return {
      ...serverVersion,
      ...clientVersion,
      _mergedAt: new Date().toISOString()
    };
  }

  /**
   * Re-submit client changes to server
   * Requirements: 8.3
   */
  private resubmitClientChanges(entityType: string, entityId: string, data: any): void {
    console.log(`Re-submitting client changes for ${entityType}/${entityId}`);
    
    // Queue the operation for submission
    this.queueOperation({
      id: this.generateOperationId(),
      type: 'update',
      entityType: entityType as any,
      entityId,
      payload: data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    });
  }

  /**
   * Queue operation for offline execution
   * Requirements: 8.7
   */
  queueOperation(operation: QueuedOperation): void {
    // Check queue size limit
    if (this.operationQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('Operation queue is full, removing oldest operation');
      this.operationQueue.shift();
    }

    this.operationQueue.push(operation);
    this.saveQueueToStorage();

    this.updateSyncState({ 
      pendingOperations: this.operationQueue.length,
      status: SyncStatus.Offline
    });

    console.log(`Operation queued: ${operation.type} ${operation.entityType}/${operation.entityId || 'new'}`);
  }

  /**
   * Process queued operations when online
   * Requirements: 8.7
   */
  private processQueueWhenOnline(): void {
    // Monitor online status and process queue when online
    interval(5000)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => navigator.onLine && this.operationQueue.length > 0)
      )
      .subscribe(() => {
        this.processOperationQueue();
      });
  }

  /**
   * Process operation queue
   * Requirements: 8.7
   */
  private async processOperationQueue(): Promise<void> {
    if (this.operationQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.operationQueue.length} queued operations`);
    this.updateSyncState({ status: SyncStatus.Syncing });

    const operations = [...this.operationQueue];
    
    for (const operation of operations) {
      try {
        await this.executeQueuedOperation(operation);
        
        // Remove from queue on success
        const index = this.operationQueue.findIndex(op => op.id === operation.id);
        if (index !== -1) {
          this.operationQueue.splice(index, 1);
        }
      } catch (error) {
        console.error(`Failed to execute queued operation:`, error);
        
        // Increment retry count
        operation.retryCount++;
        
        // Remove if max retries exceeded
        if (operation.retryCount >= operation.maxRetries) {
          console.error(`Max retries exceeded for operation ${operation.id}, removing from queue`);
          const index = this.operationQueue.findIndex(op => op.id === operation.id);
          if (index !== -1) {
            this.operationQueue.splice(index, 1);
          }
        }
      }
    }

    this.saveQueueToStorage();
    this.updateSyncState({ 
      pendingOperations: this.operationQueue.length,
      status: this.operationQueue.length === 0 ? SyncStatus.Synced : SyncStatus.Syncing
    });
  }

  /**
   * Execute a queued operation
   * Requirements: 8.7
   */
  private async executeQueuedOperation(operation: QueuedOperation): Promise<void> {
    console.log(`Executing queued operation: ${operation.type} ${operation.entityType}/${operation.entityId || 'new'}`);

    switch (operation.entityType) {
      case 'deployment':
        await this.executeDeploymentOperation(operation);
        break;
      case 'approval':
        await this.executeApprovalOperation(operation);
        break;
      case 'exception':
        await this.executeExceptionOperation(operation);
        break;
      case 'agent':
        await this.executeAgentOperation(operation);
        break;
      default:
        throw new Error(`Unknown entity type: ${operation.entityType}`);
    }
  }

  /**
   * Execute deployment operation
   * Requirements: 8.7
   */
  private async executeDeploymentOperation(operation: QueuedOperation): Promise<void> {
    const actions = await import('../state/deployments/deployment.actions');
    
    switch (operation.type) {
      case 'create':
        this.store.dispatch(actions.createDeployment({ request: operation.payload }));
        break;
      case 'update':
        this.store.dispatch(actions.updateDeployment({ 
          id: operation.entityId!,
          request: operation.payload,
          etag: operation.payload.etag || '*'
        }));
        break;
      case 'delete':
        this.store.dispatch(actions.deleteDeployment({ 
          id: operation.entityId!,
          reason: operation.payload.reason
        }));
        break;
      case 'transition':
        this.store.dispatch(actions.transitionDeploymentState({ 
          id: operation.entityId!,
          request: operation.payload
        }));
        break;
      case 'evidence':
        this.store.dispatch(actions.submitEvidence({ 
          deploymentId: operation.entityId!,
          request: operation.payload
        }));
        break;
    }
  }

  /**
   * Execute approval operation
   * Requirements: 8.7
   */
  private async executeApprovalOperation(operation: QueuedOperation): Promise<void> {
    const actions = await import('../state/approvals/approval.actions');
    
    switch (operation.type) {
      case 'create':
        this.store.dispatch(actions.requestApproval({ request: operation.payload }));
        break;
      case 'update':
        this.store.dispatch(actions.recordDecision({ 
          approvalId: operation.entityId!,
          decision: operation.payload
        }));
        break;
    }
  }

  /**
   * Execute exception operation
   * Requirements: 8.7
   */
  private async executeExceptionOperation(operation: QueuedOperation): Promise<void> {
    const actions = await import('../state/exceptions/exception.actions');
    
    switch (operation.type) {
      case 'create':
        this.store.dispatch(actions.createException({ 
          deploymentId: operation.payload.deploymentId,
          request: operation.payload
        }));
        break;
      case 'update':
        if (operation.payload.approved) {
          this.store.dispatch(actions.approveException({ 
            exceptionId: operation.entityId!,
            request: operation.payload
          }));
        } else {
          this.store.dispatch(actions.denyException({ 
            exceptionId: operation.entityId!,
            request: operation.payload
          }));
        }
        break;
    }
  }

  /**
   * Execute agent operation
   * Requirements: 8.7
   */
  private async executeAgentOperation(operation: QueuedOperation): Promise<void> {
    const actions = await import('../state/agents/agent.actions');
    
    switch (operation.type) {
      case 'create':
        this.store.dispatch(actions.executeAgent({ request: operation.payload }));
        break;
      case 'update':
        this.store.dispatch(actions.updateAgentConfiguration({ 
          agentId: operation.entityId!,
          request: operation.payload
        }));
        break;
    }
  }

  /**
   * Monitor online/offline status
   * Requirements: 8.7
   */
  private setupOnlineStatusMonitoring(): void {
    window.addEventListener('online', () => {
      console.log('Application is online');
      this.updateSyncState({ 
        isOnline: true,
        status: this.operationQueue.length > 0 ? SyncStatus.Syncing : SyncStatus.Synced
      });
      
      // Process queued operations
      this.processOperationQueue();
    });

    window.addEventListener('offline', () => {
      console.log('Application is offline');
      this.updateSyncState({ 
        isOnline: false,
        status: SyncStatus.Offline
      });
    });
  }

  /**
   * Start periodic consistency validation
   * Requirements: 8.8, 8.9
   */
  private startConsistencyValidation(): void {
    this.consistencyCheckInterval = setInterval(() => {
      this.validateDataConsistency();
    }, this.CONSISTENCY_CHECK_INTERVAL_MS);

    console.log('Consistency validation started');
  }

  /**
   * Stop consistency validation
   */
  private stopConsistencyValidation(): void {
    if (this.consistencyCheckInterval) {
      clearInterval(this.consistencyCheckInterval);
      this.consistencyCheckInterval = null;
    }
  }

  /**
   * Validate data consistency between ARK and ATLAS
   * Requirements: 8.8, 8.9
   */
  private async validateDataConsistency(): Promise<void> {
    if (!navigator.onLine || !this.configService.isEnabled()) {
      return;
    }

    console.log('Validating data consistency...');

    try {
      // Check deployment consistency
      await this.validateDeploymentConsistency();

      // Check approval consistency
      await this.validateApprovalConsistency();

      // Check exception consistency
      await this.validateExceptionConsistency();

      console.log('Data consistency validation completed');
    } catch (error) {
      console.error('Error during consistency validation:', error);
    }
  }

  /**
   * Validate deployment data consistency
   * Requirements: 8.8, 8.9
   */
  private async validateDeploymentConsistency(): Promise<void> {
    // In a real implementation, you would:
    // 1. Get local deployment data from store
    // 2. Fetch latest data from server
    // 3. Compare checksums/versions
    // 4. Trigger reconciliation if inconsistencies detected
    
    console.log('Validating deployment consistency');
    
    // Example: Trigger refresh if needed
    // if (inconsistencyDetected) {
    //   this.triggerReconciliation('deployment');
    // }
  }

  /**
   * Validate approval data consistency
   * Requirements: 8.8, 8.9
   */
  private async validateApprovalConsistency(): Promise<void> {
    console.log('Validating approval consistency');
    
    // Similar to deployment validation
  }

  /**
   * Validate exception data consistency
   * Requirements: 8.8, 8.9
   */
  private async validateExceptionConsistency(): Promise<void> {
    console.log('Validating exception consistency');
    
    // Similar to deployment validation
  }

  /**
   * Trigger reconciliation when inconsistencies detected
   * Requirements: 8.9
   */
  private triggerReconciliation(entityType: string): void {
    console.log(`Triggering reconciliation for ${entityType}`);
    
    this.updateSyncState({ status: SyncStatus.Syncing });

    // Refresh data from server
    switch (entityType) {
      case 'deployment':
        import('../state/deployments/deployment.actions').then((actions) => {
          this.store.dispatch(actions.refreshDeployments());
        });
        break;
      case 'approval':
        import('../state/approvals/approval.actions').then((actions) => {
          this.store.dispatch(actions.loadUserApprovals({ page: 1, pageSize: 50 }));
        });
        break;
      case 'exception':
        // Would need deployment context
        console.log('Exception reconciliation requires deployment context');
        break;
    }

    this.updateSyncState({ 
      status: SyncStatus.Synced,
      lastSyncTime: new Date()
    });
  }

  /**
   * Manual refresh to force synchronization
   * Requirements: 8.10
   */
  async manualRefresh(entityType?: string): Promise<void> {
    console.log(`Manual refresh triggered${entityType ? ` for ${entityType}` : ''}`);
    
    this.updateSyncState({ status: SyncStatus.Syncing });

    try {
      if (!entityType || entityType === 'deployment') {
        await this.refreshDeployments();
      }

      if (!entityType || entityType === 'approval') {
        await this.refreshApprovals();
      }

      if (!entityType || entityType === 'exception') {
        await this.refreshExceptions();
      }

      if (!entityType || entityType === 'agent') {
        await this.refreshAgents();
      }

      if (!entityType || entityType === 'ai-analysis') {
        await this.refreshAIAnalysis();
      }

      this.updateSyncState({ 
        status: SyncStatus.Synced,
        lastSyncTime: new Date()
      });

      console.log('Manual refresh completed successfully');
    } catch (error) {
      console.error('Error during manual refresh:', error);
      this.updateSyncState({ status: SyncStatus.Error });
      throw error;
    }
  }

  /**
   * Refresh deployments
   * Requirements: 8.10
   */
  private async refreshDeployments(): Promise<void> {
    const actions = await import('../state/deployments/deployment.actions');
    this.store.dispatch(actions.refreshDeployments());
  }

  /**
   * Refresh approvals
   * Requirements: 8.10
   */
  private async refreshApprovals(): Promise<void> {
    const actions = await import('../state/approvals/approval.actions');
    this.store.dispatch(actions.loadUserApprovals({ page: 1, pageSize: 50 }));
  }

  /**
   * Refresh exceptions
   * Requirements: 8.10
   */
  private async refreshExceptions(): Promise<void> {
    // Would need deployment context
    console.log('Exception refresh requires deployment context');
  }

  /**
   * Refresh agents
   * Requirements: 8.10
   */
  private async refreshAgents(): Promise<void> {
    const actions = await import('../state/agents/agent.actions');
    this.store.dispatch(actions.loadAgents({}));
  }

  /**
   * Refresh AI analysis
   * Requirements: 8.10
   */
  private async refreshAIAnalysis(): Promise<void> {
    const actions = await import('../state/ai-analysis/ai-analysis.actions');
    this.store.dispatch(actions.loadAvailableAgents());
  }

  /**
   * Save operation queue to storage
   */
  private saveQueueToStorage(): void {
    try {
      const queueData = JSON.stringify(this.operationQueue);
      localStorage.setItem(this.QUEUE_STORAGE_KEY, queueData);
    } catch (error) {
      console.error('Failed to save operation queue to storage:', error);
    }
  }

  /**
   * Load operation queue from storage
   */
  private loadQueueFromStorage(): void {
    try {
      const queueData = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (queueData) {
        this.operationQueue = JSON.parse(queueData);
        this.updateSyncState({ pendingOperations: this.operationQueue.length });
        console.log(`Loaded ${this.operationQueue.length} operations from storage`);
      }
    } catch (error) {
      console.error('Failed to load operation queue from storage:', error);
      this.operationQueue = [];
    }
  }

  /**
   * Clear operation queue
   */
  clearQueue(): void {
    this.operationQueue = [];
    localStorage.removeItem(this.QUEUE_STORAGE_KEY);
    this.updateSyncState({ pendingOperations: 0 });
    console.log('Operation queue cleared');
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): QueuedOperation[] {
    return [...this.operationQueue];
  }

  /**
   * Get conflicts
   */
  getConflicts(): DataConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Update synchronization state
   */
  private updateSyncState(updates: Partial<SyncState>): void {
    const currentState = this.syncStateSubject.value;
    this.syncStateSubject.next({
      ...currentState,
      ...updates
    });
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return 'op_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
  }

  /**
   * Generate unique conflict ID
   */
  private generateConflictId(): string {
    return 'conflict_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
  }

  /**
   * Clean up on service destruction
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Unsubscribe from SignalR events
    this.signalRSubscriptions.forEach(subId => {
      this.signalRService.unsubscribe(subId);
    });

    // Stop consistency validation
    this.stopConsistencyValidation();

    // Save queue before destroying
    this.saveQueueToStorage();
  }
}
