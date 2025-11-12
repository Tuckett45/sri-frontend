import { Injectable } from '@angular/core';
import { DeploymentRole, DeploymentStatus } from '../models/deployment.models';
import { UserRole } from 'src/app/models/role.enum';

/**
 * Maps deployment phases to the roles responsible for them based on the Deployment Run Book v7.
 * Color coding from the document:
 * - Purple: Comcast Deployment Engineer (DE)
 * - Blue: DC Ops
 * - Green: Vendor Rep
 * - White/Black: SRI Tech (Technician role, company = SRI)
 */
@Injectable({
  providedIn: 'root'
})
export class DeploymentRoleService {
  
  /**
   * Maps each deployment phase to the primary role(s) responsible
   * Based on the Deployment Run Book color coding
   */
  private readonly phaseRoleMap: Record<DeploymentStatus, DeploymentRole[]> = {
    [DeploymentStatus.Planned]: [DeploymentRole.DeploymentEngineer], // DE plans and initiates
    [DeploymentStatus.Survey]: [
      DeploymentRole.VendorRep, // Section 1.0: Vendor or Operations project lead
      DeploymentRole.DCOps,
      DeploymentRole.SRITech
    ],
    [DeploymentStatus.Inventory]: [
      DeploymentRole.VendorRep, // Section 2.0: Vendor responsible for receiving/inventory
      DeploymentRole.SRITech
    ],
    [DeploymentStatus.Install]: [
      DeploymentRole.SRITech, // Section 3.0: Installation work (black/white text = SRI Tech)
      DeploymentRole.VendorRep
    ],
    [DeploymentStatus.Cabling]: [
      DeploymentRole.SRITech, // Section 4.0: Cabling work (black/white text = SRI Tech)
      DeploymentRole.VendorRep
    ],
    [DeploymentStatus.Labeling]: [
      DeploymentRole.SRITech, // Section 5.0: Labeling work (black/white text = SRI Tech)
      DeploymentRole.VendorRep
    ],
    [DeploymentStatus.Handoff]: [
      DeploymentRole.DeploymentEngineer, // Section 6.3-6.4: DE validates and signs off
      DeploymentRole.VendorRep, // Section 6.1-6.2: Vendor configures and provides documentation
      DeploymentRole.SRITech
    ],
    [DeploymentStatus.Complete]: [
      DeploymentRole.DeploymentEngineer // DE provides final validation
    ]
  };

  /**
   * Maps UserRole (from auth) to DeploymentRole
   */
  mapUserRoleToDeploymentRole(userRole: string, company?: string): DeploymentRole | null {
    switch (userRole) {
      case UserRole.DeploymentEngineer:
        return DeploymentRole.DeploymentEngineer;
      case UserRole.DCOps:
        return DeploymentRole.DCOps;
      case UserRole.VendorRep:
      case UserRole.PM: // PMs from vendor companies act as Vendor Reps
        return DeploymentRole.VendorRep;
      case UserRole.SRITech:
      case UserRole.CM: // CMs from SRI act as SRI Techs
        // Only if company is SRI
        return (company && company.toUpperCase() === 'SRI') ? DeploymentRole.SRITech : null;
      default:
        return null;
    }
  }

  /**
   * Check if a user can access a specific deployment phase
   */
  canAccessPhase(
    userRole: string,
    userCompany: string | undefined,
    phase: DeploymentStatus
  ): boolean {
    const deploymentRole = this.mapUserRoleToDeploymentRole(userRole, userCompany);
    if (!deploymentRole) return false;

    const allowedRoles = this.phaseRoleMap[phase] || [];
    return allowedRoles.includes(deploymentRole);
  }

  /**
   * Check if a user can complete/sign off on a phase
   */
  canSignOffPhase(
    userRole: string,
    userCompany: string | undefined,
    phase: DeploymentStatus
  ): boolean {
    // Same logic as canAccessPhase, but can be extended for stricter rules
    return this.canAccessPhase(userRole, userCompany, phase);
  }

  /**
   * Get the list of roles that can work on a specific phase
   */
  getRolesForPhase(phase: DeploymentStatus): DeploymentRole[] {
    return this.phaseRoleMap[phase] || [];
  }

  /**
   * Determine which role should be notified for a phase
   */
  getRoleToNotify(phase: DeploymentStatus): DeploymentRole | null {
    const roles = this.getRolesForPhase(phase);
    return roles.length > 0 ? roles[0] : null;
  }

  /**
   * Get role display color based on runbook (for UI styling)
   */
  getRoleColor(role: DeploymentRole): string {
    switch (role) {
      case DeploymentRole.DeploymentEngineer:
        return '#9B59B6'; // Purple
      case DeploymentRole.DCOps:
        return '#3498DB'; // Blue
      case DeploymentRole.VendorRep:
        return '#27AE60'; // Green
      case DeploymentRole.SRITech:
        return '#2C3E50'; // Dark gray/black
      default:
        return '#95A5A6'; // Gray
    }
  }

  /**
   * Check if all required sign-offs are complete for deployment handoff
   * Per Section 6: Requires sign-offs from Comcast DE, Vendor Rep, and SRI Tech
   */
  isFullySignedOff(
    vendorSignedBy?: string,
    deSignedBy?: string,
    techSignedBy?: string
  ): boolean {
    return !!(vendorSignedBy && deSignedBy && techSignedBy);
  }

  /**
   * Get the required sign-off roles for deployment completion
   */
  getRequiredSignOffRoles(): DeploymentRole[] {
    return [
      DeploymentRole.VendorRep,
      DeploymentRole.DeploymentEngineer,
      DeploymentRole.SRITech
    ];
  }

  /**
   * Get human-readable phase description based on role
   */
  getPhaseDescriptionForRole(phase: DeploymentStatus, role: DeploymentRole): string {
    const descriptions: Record<DeploymentStatus, Partial<Record<DeploymentRole, string>>> = {
      [DeploymentStatus.Planned]: {
        [DeploymentRole.DeploymentEngineer]: 'Plan deployment strategy, assign resources, and schedule deployment timeline'
      },
      [DeploymentStatus.Survey]: {
        [DeploymentRole.VendorRep]: 'Check data center and cabinets, verify rack requirements and patch panel ports',
        [DeploymentRole.DCOps]: 'Assist with site survey and facility access',
        [DeploymentRole.SRITech]: 'Perform site survey and report issues'
      },
      [DeploymentStatus.Inventory]: {
        [DeploymentRole.VendorRep]: 'Receive equipment, verify work orders, document serial numbers',
        [DeploymentRole.SRITech]: 'Assist with inventory and equipment verification'
      },
      [DeploymentStatus.Install]: {
        [DeploymentRole.SRITech]: 'Install equipment per manufacturer specs, mount rails, apply labels',
        [DeploymentRole.VendorRep]: 'Oversee installation quality and standards compliance'
      },
      [DeploymentStatus.Cabling]: {
        [DeploymentRole.SRITech]: 'Install power cords, copper and fiber cables per standards',
        [DeploymentRole.VendorRep]: 'Verify cabling meets Comcast standards'
      },
      [DeploymentStatus.Labeling]: {
        [DeploymentRole.SRITech]: 'Apply device labels, patch cord labels, and power cord labels',
        [DeploymentRole.VendorRep]: 'Verify labeling accuracy and completeness'
      },
      [DeploymentStatus.Handoff]: {
        [DeploymentRole.VendorRep]: 'Configure management IPs, provide documentation and photos, sign handoff checklist',
        [DeploymentRole.DeploymentEngineer]: 'Validate connections, inspect work, perform final sign-off',
        [DeploymentRole.SRITech]: 'Complete final documentation and technician sign-off'
      },
      [DeploymentStatus.Complete]: {
        [DeploymentRole.DeploymentEngineer]: 'Review final deployment documentation and archive project records'
      }
    };

    return descriptions[phase]?.[role] || 'Complete assigned tasks for this phase';
  }
}
