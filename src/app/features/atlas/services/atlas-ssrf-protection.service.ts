import { Injectable } from '@angular/core';
import { AtlasSecurityLoggerService, SecurityEventType, SecurityEventSeverity } from './atlas-security-logger.service';

/**
 * URL validation result
 */
export interface UrlValidationResult {
  isValid: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

/**
 * SSRF protection configuration
 */
export interface SsrfProtectionConfig {
  allowedProtocols: string[];
  allowedDomains: string[];
  blockPrivateIps: boolean;
  blockLocalhost: boolean;
  blockMetadataEndpoints: boolean;
  allowedPorts: number[];
}

/**
 * AtlasSsrfProtectionService
 * 
 * Validates ATLAS endpoint URLs to prevent Server-Side Request Forgery (SSRF) attacks.
 * Blocks requests to private IPs, localhost, cloud metadata endpoints, and
 * validates against allowed protocols and domains.
 * 
 * Requirements: 12.8
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasSsrfProtectionService {
  private readonly DEFAULT_CONFIG: SsrfProtectionConfig = {
    allowedProtocols: ['https:', 'http:'],
    allowedDomains: [], // Empty means all domains allowed (except blocked ones)
    blockPrivateIps: true,
    blockLocalhost: true,
    blockMetadataEndpoints: true,
    allowedPorts: [] // Empty means all ports allowed
  };

  // Private IP ranges (CIDR notation)
  private readonly PRIVATE_IP_RANGES = [
    { start: '10.0.0.0', end: '10.255.255.255' },       // 10.0.0.0/8
    { start: '172.16.0.0', end: '172.31.255.255' },     // 172.16.0.0/12
    { start: '192.168.0.0', end: '192.168.255.255' },   // 192.168.0.0/16
    { start: '169.254.0.0', end: '169.254.255.255' },   // 169.254.0.0/16 (link-local)
    { start: '127.0.0.0', end: '127.255.255.255' },     // 127.0.0.0/8 (loopback)
    { start: '0.0.0.0', end: '0.255.255.255' }          // 0.0.0.0/8 (current network)
  ];

  // Cloud metadata endpoints
  private readonly METADATA_ENDPOINTS = [
    '169.254.169.254',  // AWS, Azure, GCP metadata
    'metadata.google.internal',
    'metadata.azure.com'
  ];

  // Localhost patterns
  private readonly LOCALHOST_PATTERNS = [
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0'
  ];

  private config: SsrfProtectionConfig = this.DEFAULT_CONFIG;

  constructor(private securityLogger: AtlasSecurityLoggerService) {}

  /**
   * Get the current SSRF protection configuration
   */
  getConfig(): SsrfProtectionConfig {
    return { ...this.config };
  }

  /**
   * Update SSRF protection configuration
   * Requirements: 12.8
   * 
   * @param updates - Partial configuration updates
   */
  updateConfig(updates: Partial<SsrfProtectionConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };

    console.log('SSRF protection configuration updated:', this.config);
  }

  /**
   * Validate URL for SSRF protection
   * Requirements: 12.8
   * 
   * @param url - URL to validate
   * @returns Validation result
   */
  validateUrl(url: string): UrlValidationResult {
    try {
      // Parse URL
      const urlObj = new URL(url);

      // Validate protocol
      const protocolResult = this.validateProtocol(urlObj);
      if (!protocolResult.isValid) {
        this.logSsrfAttempt(url, protocolResult.reason!);
        return protocolResult;
      }

      // Validate hostname
      const hostnameResult = this.validateHostname(urlObj);
      if (!hostnameResult.isValid) {
        this.logSsrfAttempt(url, hostnameResult.reason!);
        return hostnameResult;
      }

      // Validate port
      const portResult = this.validatePort(urlObj);
      if (!portResult.isValid) {
        this.logSsrfAttempt(url, portResult.reason!);
        return portResult;
      }

      // Validate domain (if whitelist configured)
      const domainResult = this.validateDomain(urlObj);
      if (!domainResult.isValid) {
        this.logSsrfAttempt(url, domainResult.reason!);
        return domainResult;
      }

      return {
        isValid: true,
        sanitizedUrl: urlObj.toString()
      };
    } catch (error) {
      const reason = 'Invalid URL format';
      this.logSsrfAttempt(url, reason);
      return {
        isValid: false,
        reason
      };
    }
  }

  /**
   * Validate protocol
   * Requirements: 12.8
   */
  private validateProtocol(urlObj: URL): UrlValidationResult {
    if (!this.config.allowedProtocols.includes(urlObj.protocol)) {
      return {
        isValid: false,
        reason: `Protocol ${urlObj.protocol} is not allowed. Allowed protocols: ${this.config.allowedProtocols.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate hostname for SSRF protection
   * Requirements: 12.8
   */
  private validateHostname(urlObj: URL): UrlValidationResult {
    const hostname = urlObj.hostname.toLowerCase();

    // Check for localhost
    if (this.config.blockLocalhost && this.isLocalhost(hostname)) {
      return {
        isValid: false,
        reason: 'Localhost addresses are not allowed'
      };
    }

    // Check for metadata endpoints
    if (this.config.blockMetadataEndpoints && this.isMetadataEndpoint(hostname)) {
      return {
        isValid: false,
        reason: 'Cloud metadata endpoints are not allowed'
      };
    }

    // Check for private IPs
    if (this.config.blockPrivateIps && this.isPrivateIp(hostname)) {
      return {
        isValid: false,
        reason: 'Private IP addresses are not allowed'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate port
   * Requirements: 12.8
   */
  private validatePort(urlObj: URL): UrlValidationResult {
    // If no port restrictions, allow all
    if (this.config.allowedPorts.length === 0) {
      return { isValid: true };
    }

    const port = urlObj.port ? parseInt(urlObj.port, 10) : this.getDefaultPort(urlObj.protocol);

    if (!this.config.allowedPorts.includes(port)) {
      return {
        isValid: false,
        reason: `Port ${port} is not allowed. Allowed ports: ${this.config.allowedPorts.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate domain against whitelist
   * Requirements: 12.8
   */
  private validateDomain(urlObj: URL): UrlValidationResult {
    // If no domain whitelist, allow all (except blocked ones)
    if (this.config.allowedDomains.length === 0) {
      return { isValid: true };
    }

    const hostname = urlObj.hostname.toLowerCase();

    // Check if hostname matches any allowed domain
    const isAllowed = this.config.allowedDomains.some(domain => {
      const domainLower = domain.toLowerCase();
      
      // Exact match
      if (hostname === domainLower) {
        return true;
      }

      // Subdomain match (e.g., api.example.com matches example.com)
      if (hostname.endsWith('.' + domainLower)) {
        return true;
      }

      return false;
    });

    if (!isAllowed) {
      return {
        isValid: false,
        reason: `Domain ${hostname} is not in the allowed domains list`
      };
    }

    return { isValid: true };
  }

  /**
   * Check if hostname is localhost
   */
  private isLocalhost(hostname: string): boolean {
    return this.LOCALHOST_PATTERNS.some(pattern => hostname === pattern);
  }

  /**
   * Check if hostname is a cloud metadata endpoint
   */
  private isMetadataEndpoint(hostname: string): boolean {
    return this.METADATA_ENDPOINTS.some(endpoint => hostname === endpoint);
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIp(hostname: string): boolean {
    // Check if it's an IPv4 address
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);

    if (!match) {
      // Not an IPv4 address, could be domain name or IPv6
      // For IPv6, we'll be conservative and block link-local and loopback
      if (hostname.startsWith('fe80:') || hostname === '::1') {
        return true;
      }
      return false;
    }

    // Convert to IP number for range checking
    const ipNum = this.ipToNumber(hostname);

    // Check against private IP ranges
    return this.PRIVATE_IP_RANGES.some(range => {
      const startNum = this.ipToNumber(range.start);
      const endNum = this.ipToNumber(range.end);
      return ipNum >= startNum && ipNum <= endNum;
    });
  }

  /**
   * Convert IP address string to number for comparison
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(part => parseInt(part, 10));
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  /**
   * Get default port for protocol
   */
  private getDefaultPort(protocol: string): number {
    switch (protocol) {
      case 'http:':
        return 80;
      case 'https:':
        return 443;
      case 'ftp:':
        return 21;
      default:
        return 0;
    }
  }

  /**
   * Log SSRF attempt
   */
  private logSsrfAttempt(url: string, reason: string): void {
    this.securityLogger.logSsrfAttempt(url, reason);
  }

  /**
   * Add allowed domain to whitelist
   * Requirements: 12.8
   * 
   * @param domain - Domain to allow
   */
  addAllowedDomain(domain: string): void {
    if (!this.config.allowedDomains.includes(domain)) {
      this.config.allowedDomains.push(domain);
      console.log(`Added ${domain} to allowed domains`);
    }
  }

  /**
   * Remove allowed domain from whitelist
   * Requirements: 12.8
   * 
   * @param domain - Domain to remove
   */
  removeAllowedDomain(domain: string): void {
    const index = this.config.allowedDomains.indexOf(domain);
    if (index > -1) {
      this.config.allowedDomains.splice(index, 1);
      console.log(`Removed ${domain} from allowed domains`);
    }
  }

  /**
   * Add allowed port
   * Requirements: 12.8
   * 
   * @param port - Port to allow
   */
  addAllowedPort(port: number): void {
    if (!this.config.allowedPorts.includes(port)) {
      this.config.allowedPorts.push(port);
      console.log(`Added port ${port} to allowed ports`);
    }
  }

  /**
   * Remove allowed port
   * Requirements: 12.8
   * 
   * @param port - Port to remove
   */
  removeAllowedPort(port: number): void {
    const index = this.config.allowedPorts.indexOf(port);
    if (index > -1) {
      this.config.allowedPorts.splice(index, 1);
      console.log(`Removed port ${port} from allowed ports`);
    }
  }

  /**
   * Check if URL is safe (convenience method)
   * Requirements: 12.8
   * 
   * @param url - URL to check
   * @returns True if URL is safe
   */
  isSafeUrl(url: string): boolean {
    return this.validateUrl(url).isValid;
  }

  /**
   * Get sanitized URL (throws error if invalid)
   * Requirements: 12.8
   * 
   * @param url - URL to sanitize
   * @returns Sanitized URL
   * @throws Error if URL is invalid
   */
  getSanitizedUrl(url: string): string {
    const result = this.validateUrl(url);
    
    if (!result.isValid) {
      throw new Error(`Invalid URL: ${result.reason}`);
    }

    return result.sanitizedUrl!;
  }
}
