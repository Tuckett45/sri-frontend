import { FeatureFlagKey } from 'src/app/services/feature-flag.service';

export type DeploymentFeatureFlagKey =
  | 'notificationsEnabled'
  | 'autoAssignEnabled'
  | 'strictRoleEnforcement'
  | 'showRoleColors';

export const DEPLOYMENT_FEATURE_FLAG_MAP: Record<DeploymentFeatureFlagKey, FeatureFlagKey> = {
  notificationsEnabled: 'deploymentNotifications',
  autoAssignEnabled: 'deploymentAutoAssign',
  strictRoleEnforcement: 'deploymentStrictRoles',
  showRoleColors: 'deploymentRoleColors'
};

export const DEFAULT_DEPLOYMENT_FEATURE_FLAGS: Record<DeploymentFeatureFlagKey, boolean> = {
  notificationsEnabled: true,
  autoAssignEnabled: true,
  strictRoleEnforcement: false,
  showRoleColors: true
};
