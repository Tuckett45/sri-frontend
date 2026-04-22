import { Injectable } from '@angular/core';
import { AtlasConfigService } from './atlas-config.service';

/**
 * Content Security Policy configuration
 */
export interface CspConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  frameSrc: string[];
  baseUri: string[];
  formAction: string[];
  frameAncestors: string[];
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
  reportUri?: string;
}

/**
 * AtlasCspService
 * 
 * Manages Content Security Policy headers for ATLAS resources.
 * Provides methods to configure and apply CSP directives to prevent
 * XSS, clickjacking, and other code injection attacks.
 * 
 * Requirements: 12.9
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasCspService {
  private readonly DEFAULT_CSP_CONFIG: CspConfig = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Note: unsafe-inline should be removed in production
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: true,
    blockAllMixedContent: true
  };

  private cspConfig: CspConfig;

  constructor(private configService: AtlasConfigService) {
    this.cspConfig = this.initializeCspConfig();
  }

  /**
   * Get the current CSP configuration
   */
  getConfig(): CspConfig {
    return { ...this.cspConfig };
  }

  /**
   * Update CSP configuration
   * Requirements: 12.9
   * 
   * @param updates - Partial CSP configuration updates
   */
  updateConfig(updates: Partial<CspConfig>): void {
    this.cspConfig = {
      ...this.cspConfig,
      ...updates
    };

    console.log('CSP configuration updated:', this.cspConfig);
  }

  /**
   * Generate CSP header value
   * Requirements: 12.9
   * 
   * @returns CSP header value string
   */
  generateCspHeader(): string {
    const directives: string[] = [];

    // Add each directive
    if (this.cspConfig.defaultSrc.length > 0) {
      directives.push(`default-src ${this.cspConfig.defaultSrc.join(' ')}`);
    }

    if (this.cspConfig.scriptSrc.length > 0) {
      directives.push(`script-src ${this.cspConfig.scriptSrc.join(' ')}`);
    }

    if (this.cspConfig.styleSrc.length > 0) {
      directives.push(`style-src ${this.cspConfig.styleSrc.join(' ')}`);
    }

    if (this.cspConfig.imgSrc.length > 0) {
      directives.push(`img-src ${this.cspConfig.imgSrc.join(' ')}`);
    }

    if (this.cspConfig.connectSrc.length > 0) {
      directives.push(`connect-src ${this.cspConfig.connectSrc.join(' ')}`);
    }

    if (this.cspConfig.fontSrc.length > 0) {
      directives.push(`font-src ${this.cspConfig.fontSrc.join(' ')}`);
    }

    if (this.cspConfig.objectSrc.length > 0) {
      directives.push(`object-src ${this.cspConfig.objectSrc.join(' ')}`);
    }

    if (this.cspConfig.mediaSrc.length > 0) {
      directives.push(`media-src ${this.cspConfig.mediaSrc.join(' ')}`);
    }

    if (this.cspConfig.frameSrc.length > 0) {
      directives.push(`frame-src ${this.cspConfig.frameSrc.join(' ')}`);
    }

    if (this.cspConfig.baseUri.length > 0) {
      directives.push(`base-uri ${this.cspConfig.baseUri.join(' ')}`);
    }

    if (this.cspConfig.formAction.length > 0) {
      directives.push(`form-action ${this.cspConfig.formAction.join(' ')}`);
    }

    if (this.cspConfig.frameAncestors.length > 0) {
      directives.push(`frame-ancestors ${this.cspConfig.frameAncestors.join(' ')}`);
    }

    // Add upgrade-insecure-requests directive
    if (this.cspConfig.upgradeInsecureRequests) {
      directives.push('upgrade-insecure-requests');
    }

    // Add block-all-mixed-content directive
    if (this.cspConfig.blockAllMixedContent) {
      directives.push('block-all-mixed-content');
    }

    // Add report-uri if configured
    if (this.cspConfig.reportUri) {
      directives.push(`report-uri ${this.cspConfig.reportUri}`);
    }

    return directives.join('; ');
  }

  /**
   * Generate CSP meta tag content
   * Requirements: 12.9
   * 
   * @returns CSP meta tag content attribute value
   */
  generateCspMetaTag(): string {
    return this.generateCspHeader();
  }

  /**
   * Add allowed source to a directive
   * Requirements: 12.9
   * 
   * @param directive - CSP directive name
   * @param source - Source to allow
   */
  addAllowedSource(
    directive: keyof Omit<CspConfig, 'upgradeInsecureRequests' | 'blockAllMixedContent' | 'reportUri'>,
    source: string
  ): void {
    if (Array.isArray(this.cspConfig[directive])) {
      const sources = this.cspConfig[directive] as string[];
      if (!sources.includes(source)) {
        sources.push(source);
        console.log(`Added ${source} to ${directive}`);
      }
    }
  }

  /**
   * Remove allowed source from a directive
   * Requirements: 12.9
   * 
   * @param directive - CSP directive name
   * @param source - Source to remove
   */
  removeAllowedSource(
    directive: keyof Omit<CspConfig, 'upgradeInsecureRequests' | 'blockAllMixedContent' | 'reportUri'>,
    source: string
  ): void {
    if (Array.isArray(this.cspConfig[directive])) {
      const sources = this.cspConfig[directive] as string[];
      const index = sources.indexOf(source);
      if (index > -1) {
        sources.splice(index, 1);
        console.log(`Removed ${source} from ${directive}`);
      }
    }
  }

  /**
   * Add ATLAS API endpoint to connect-src
   * Requirements: 12.9
   */
  addAtlasEndpoint(): void {
    const atlasBaseUrl = this.configService.getBaseUrl();
    
    // Extract origin from base URL
    try {
      const url = new URL(atlasBaseUrl);
      const origin = url.origin;
      this.addAllowedSource('connectSrc', origin);
    } catch (error) {
      // If base URL is relative, add it as-is
      this.addAllowedSource('connectSrc', atlasBaseUrl);
    }
  }

  /**
   * Configure CSP for ATLAS SignalR connection
   * Requirements: 12.9
   */
  configureSignalRCsp(): void {
    const atlasBaseUrl = this.configService.getBaseUrl();
    
    try {
      const url = new URL(atlasBaseUrl);
      const origin = url.origin;
      
      // Add to connect-src for WebSocket connections
      this.addAllowedSource('connectSrc', origin);
      this.addAllowedSource('connectSrc', origin.replace('https:', 'wss:'));
      this.addAllowedSource('connectSrc', origin.replace('http:', 'ws:'));
    } catch (error) {
      console.warn('Failed to configure SignalR CSP:', error);
    }
  }

  /**
   * Get CSP violation report handler
   * Requirements: 12.9
   * 
   * @returns Function to handle CSP violation reports
   */
  getCspViolationHandler(): (event: SecurityPolicyViolationEvent) => void {
    return (event: SecurityPolicyViolationEvent) => {
      console.error('CSP Violation:', {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        effectiveDirective: event.effectiveDirective,
        originalPolicy: event.originalPolicy,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber
      });

      // TODO: Send violation report to monitoring service
    };
  }

  /**
   * Install CSP violation event listener
   * Requirements: 12.9
   */
  installViolationListener(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('securitypolicyviolation', this.getCspViolationHandler());
      console.log('CSP violation listener installed');
    }
  }

  /**
   * Generate nonce for inline scripts
   * Requirements: 12.9
   * 
   * @returns Random nonce value
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Validate CSP configuration
   * Requirements: 12.9
   * 
   * @returns Validation result with errors
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unsafe directives in production
    if (this.isProduction()) {
      if (this.cspConfig.scriptSrc.includes("'unsafe-inline'")) {
        errors.push("'unsafe-inline' in script-src is not recommended for production");
      }
      if (this.cspConfig.scriptSrc.includes("'unsafe-eval'")) {
        errors.push("'unsafe-eval' in script-src is not recommended for production");
      }
      if (this.cspConfig.styleSrc.includes("'unsafe-inline'")) {
        errors.push("'unsafe-inline' in style-src is not recommended for production");
      }
    }

    // Check for overly permissive directives
    if (this.cspConfig.defaultSrc.includes('*')) {
      errors.push("Wildcard (*) in default-src is too permissive");
    }
    if (this.cspConfig.scriptSrc.includes('*')) {
      errors.push("Wildcard (*) in script-src is too permissive");
    }

    // Check for missing security directives
    if (this.cspConfig.objectSrc.length === 0 || !this.cspConfig.objectSrc.includes("'none'")) {
      errors.push("object-src should be set to 'none' for security");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Initialize CSP configuration based on environment
   * Requirements: 12.9
   */
  private initializeCspConfig(): CspConfig {
    const config = { ...this.DEFAULT_CSP_CONFIG };

    // Add ATLAS API endpoint to connect-src
    const atlasBaseUrl = this.configService.getBaseUrl();
    try {
      const url = new URL(atlasBaseUrl);
      config.connectSrc.push(url.origin);
    } catch (error) {
      // If base URL is relative, add it as-is
      config.connectSrc.push(atlasBaseUrl);
    }

    // Configure for production environment
    if (this.isProduction()) {
      // Remove unsafe-inline in production (use nonces instead)
      config.scriptSrc = config.scriptSrc.filter(src => src !== "'unsafe-inline'");
      config.styleSrc = config.styleSrc.filter(src => src !== "'unsafe-inline'");
    }

    return config;
  }

  /**
   * Check if running in production environment
   */
  private isProduction(): boolean {
    return this.configService.getEnvironment() === 'production';
  }
}
