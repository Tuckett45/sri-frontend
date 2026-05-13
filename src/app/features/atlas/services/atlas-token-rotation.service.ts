import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { AtlasAuthService, AtlasToken } from './atlas-auth.service';

/**
 * Token rotation configuration
 */
export interface TokenRotationConfig {
  enabled: boolean;
  rotationIntervalMs: number; // How often to rotate tokens
  maxTokenAge: number; // Maximum age of a token before forced rotation (ms)
  rotateBeforeExpiry: number; // Rotate this many ms before expiry
}

/**
 * Token rotation status
 */
export interface TokenRotationStatus {
  lastRotation: Date | null;
  nextRotation: Date | null;
  rotationCount: number;
  isRotating: boolean;
  lastError: string | null;
}

/**
 * AtlasTokenRotationService
 * 
 * Implements automatic token rotation to minimize exposure window.
 * Periodically rotates ATLAS access tokens to reduce the risk of
 * token theft and unauthorized access.
 * 
 * Requirements: 12.6
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasTokenRotationService {
  private readonly DEFAULT_CONFIG: TokenRotationConfig = {
    enabled: true,
    rotationIntervalMs: 15 * 60 * 1000, // Rotate every 15 minutes
    maxTokenAge: 30 * 60 * 1000, // Max token age: 30 minutes
    rotateBeforeExpiry: 5 * 60 * 1000 // Rotate 5 minutes before expiry
  };

  private config: TokenRotationConfig = this.DEFAULT_CONFIG;
  private rotationSubscription?: Subscription;
  private statusSubject = new BehaviorSubject<TokenRotationStatus>({
    lastRotation: null,
    nextRotation: null,
    rotationCount: 0,
    isRotating: false,
    lastError: null
  });

  constructor(private authService: AtlasAuthService) {
    // Start rotation if enabled
    if (this.config.enabled) {
      this.startRotation();
    }

    // Monitor auth state changes
    this.authService.authState.subscribe(state => {
      if (state.isAuthenticated && this.config.enabled && !this.rotationSubscription) {
        this.startRotation();
      } else if (!state.isAuthenticated && this.rotationSubscription) {
        this.stopRotation();
      }
    });
  }

  /**
   * Get the current rotation status as an observable
   */
  get status$(): Observable<TokenRotationStatus> {
    return this.statusSubject.asObservable();
  }

  /**
   * Get the current rotation status synchronously
   */
  get status(): TokenRotationStatus {
    return this.statusSubject.value;
  }

  /**
   * Get the current rotation configuration
   */
  getConfig(): TokenRotationConfig {
    return { ...this.config };
  }

  /**
   * Update rotation configuration
   * Requirements: 12.6
   * 
   * @param updates - Partial configuration updates
   */
  updateConfig(updates: Partial<TokenRotationConfig>): void {
    const oldEnabled = this.config.enabled;
    this.config = { ...this.config, ...updates };

    // Restart rotation if enabled state changed
    if (this.config.enabled && !oldEnabled) {
      this.startRotation();
    } else if (!this.config.enabled && oldEnabled) {
      this.stopRotation();
    } else if (this.config.enabled) {
      // Restart with new configuration
      this.stopRotation();
      this.startRotation();
    }

    console.log('Token rotation configuration updated:', this.config);
  }

  /**
   * Start automatic token rotation
   * Requirements: 12.6
   */
  startRotation(): void {
    if (this.rotationSubscription) {
      console.warn('Token rotation already started');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      console.warn('Cannot start token rotation: not authenticated');
      return;
    }

    console.log('Starting token rotation with interval:', this.config.rotationIntervalMs, 'ms');

    // Schedule periodic rotation
    this.rotationSubscription = interval(this.config.rotationIntervalMs).subscribe(() => {
      this.rotateToken();
    });

    // Calculate next rotation time
    const nextRotation = new Date(Date.now() + this.config.rotationIntervalMs);
    this.updateStatus({ nextRotation });
  }

  /**
   * Stop automatic token rotation
   */
  stopRotation(): void {
    if (this.rotationSubscription) {
      this.rotationSubscription.unsubscribe();
      this.rotationSubscription = undefined;
      console.log('Token rotation stopped');
    }

    this.updateStatus({ nextRotation: null });
  }

  /**
   * Manually trigger token rotation
   * Requirements: 12.6
   * 
   * @returns Promise resolving to new token
   */
  async rotateToken(): Promise<AtlasToken> {
    const currentStatus = this.statusSubject.value;

    // Prevent concurrent rotations
    if (currentStatus.isRotating) {
      console.warn('Token rotation already in progress');
      throw new Error('Token rotation already in progress');
    }

    this.updateStatus({ isRotating: true, lastError: null });

    try {
      console.log('Rotating ATLAS token...');

      // Check if token needs rotation
      const authState = this.authService.currentAuthState;
      if (!authState.isAuthenticated || !authState.token) {
        throw new Error('Not authenticated');
      }

      // Check token age
      const tokenAge = authState.lastRefreshed 
        ? Date.now() - authState.lastRefreshed.getTime()
        : 0;

      // Check time until expiry
      const timeUntilExpiry = authState.token.expiresAt.getTime() - Date.now();

      // Determine if rotation is needed
      const needsRotation = 
        tokenAge >= this.config.maxTokenAge ||
        timeUntilExpiry <= this.config.rotateBeforeExpiry;

      if (!needsRotation) {
        console.log('Token rotation not needed yet');
        this.updateStatus({ isRotating: false });
        return authState.token;
      }

      // Perform token refresh (rotation)
      const newToken = await this.authService.refreshToken();

      // Update status
      const now = new Date();
      const nextRotation = new Date(now.getTime() + this.config.rotationIntervalMs);
      
      this.updateStatus({
        lastRotation: now,
        nextRotation,
        rotationCount: currentStatus.rotationCount + 1,
        isRotating: false,
        lastError: null
      });

      console.log('Token rotated successfully. Next rotation:', nextRotation);
      return newToken;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Token rotation failed:', errorMessage);

      this.updateStatus({
        isRotating: false,
        lastError: errorMessage
      });

      throw error;
    }
  }

  /**
   * Check if token needs rotation based on age and expiry
   * Requirements: 12.6
   * 
   * @returns True if token should be rotated
   */
  shouldRotateToken(): boolean {
    const authState = this.authService.currentAuthState;

    if (!authState.isAuthenticated || !authState.token) {
      return false;
    }

    // Check token age
    const tokenAge = authState.lastRefreshed 
      ? Date.now() - authState.lastRefreshed.getTime()
      : 0;

    if (tokenAge >= this.config.maxTokenAge) {
      return true;
    }

    // Check time until expiry
    const timeUntilExpiry = authState.token.expiresAt.getTime() - Date.now();

    if (timeUntilExpiry <= this.config.rotateBeforeExpiry) {
      return true;
    }

    return false;
  }

  /**
   * Get time until next rotation in milliseconds
   * 
   * @returns Time until next rotation or null if rotation not scheduled
   */
  getTimeUntilNextRotation(): number | null {
    const status = this.statusSubject.value;

    if (!status.nextRotation) {
      return null;
    }

    return Math.max(0, status.nextRotation.getTime() - Date.now());
  }

  /**
   * Get token age in milliseconds
   * 
   * @returns Token age or null if not authenticated
   */
  getTokenAge(): number | null {
    const authState = this.authService.currentAuthState;

    if (!authState.isAuthenticated || !authState.lastRefreshed) {
      return null;
    }

    return Date.now() - authState.lastRefreshed.getTime();
  }

  /**
   * Reset rotation statistics
   */
  resetStatistics(): void {
    this.updateStatus({
      rotationCount: 0,
      lastError: null
    });
  }

  /**
   * Update rotation status
   * 
   * @param updates - Partial status updates
   */
  private updateStatus(updates: Partial<TokenRotationStatus>): void {
    const currentStatus = this.statusSubject.value;
    this.statusSubject.next({
      ...currentStatus,
      ...updates
    });
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    this.stopRotation();
  }
}
