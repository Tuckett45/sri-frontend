import { DeploymentRole } from '../models/deployment.models';
import { User } from 'src/app/models/user.model';
import { UserRole } from 'src/app/models/role.enum';

export interface RoleMetadata {
  readonly label: string;
  readonly className: string;
}

export const ROLE_METADATA: Record<DeploymentRole, RoleMetadata> = {
  Technician: {
    label: 'SRI Technician',
    className: 'role-tech',
  },
  ComcastDeploymentEngineer: {
    label: 'Comcast DE',
    className: 'role-de',
  },
  DcOps: {
    label: 'DC Ops',
    className: 'role-dcops',
  },
  Vendor: {
    label: 'Vendor',
    className: 'role-vendor',
  },
};

export function resolveUserDeploymentRole(user: User | null | undefined): DeploymentRole {
  const rawRole = ((user?.role ?? '') as string).trim();
  const roleValue = rawRole.toLowerCase();
  const companyValue = (user?.company ?? '').toLowerCase();

  if (!rawRole && companyValue.includes('comcast')) {
    return 'ComcastDeploymentEngineer';
  }

  if (
    rawRole === UserRole.ComcastDeploymentEngineer ||
    roleValue.includes('deployment engineer') ||
    roleValue === 'de' ||
    roleValue === 'deployment engineer'
  ) {
    return 'ComcastDeploymentEngineer';
  }

  if (
    rawRole === UserRole.DcOps ||
    roleValue.includes('dc ops') ||
    roleValue.includes('data center ops') ||
    roleValue.includes('operations')
  ) {
    return 'DcOps';
  }

  if (rawRole === UserRole.Vendor || roleValue.includes('vendor')) {
    return 'Vendor';
  }

  if (rawRole === UserRole.Technician || roleValue.includes('technician')) {
    return 'Technician';
  }

  if (companyValue && !companyValue.includes('sri')) {
    if (companyValue.includes('comcast')) {
      return 'ComcastDeploymentEngineer';
    }
    return 'Vendor';
  }

  return 'Technician';
}

export function normalizeRoles(roles?: DeploymentRole[] | null): DeploymentRole[] {
  if (!roles || roles.length === 0) {
    return [];
  }
  const visited = new Set<DeploymentRole>();
  roles.forEach(role => {
    if (ROLE_METADATA[role]) {
      visited.add(role);
    }
  });
  return Array.from(visited);
}

export function primaryRole(roles?: DeploymentRole[] | null): DeploymentRole | null {
  const normalized = normalizeRoles(roles);
  if (normalized.length) {
    return normalized[0];
  }
  return null;
}

export function isRoleAllowed(
  assignedRoles: DeploymentRole[] | null | undefined,
  activeRole: DeploymentRole
): boolean {
  const normalized = normalizeRoles(assignedRoles);
  if (!normalized.length) {
    return true;
  }
  return normalized.includes(activeRole);
}

export function roleClassList(roles?: DeploymentRole[] | null): string[] {
  const result: string[] = [];
  const primary = primaryRole(roles);
  if (primary) {
    result.push('role-accent', ROLE_METADATA[primary].className);
  }
  return result;
}

export function roleBadgeLabel(roles?: DeploymentRole[] | null): string | null {
  const normalized = normalizeRoles(roles);
  if (!normalized.length) {
    return null;
  }
  return normalized.map(role => ROLE_METADATA[role].label).join(' / ');
}
