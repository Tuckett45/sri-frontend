import { ChecklistItem, DeploymentRole, DeploymentStatus } from './deployment.models';

const photoRequirement = (
  id: string,
  label: string,
  description?: string,
  roles?: DeploymentRole[]
): ChecklistItem => ({
  id,
  label,
  description,
  notes: description,
  type: 'photo',
  required: true,
  assignedRoles: roles,
});

const fileRequirement = (
  id: string,
  label: string,
  description?: string,
  roles?: DeploymentRole[]
): ChecklistItem => ({
  id,
  label,
  description,
  notes: description,
  type: 'file',
  required: true,
  assignedRoles: roles,
});

export const ChecklistTemplates: Record<DeploymentStatus, ChecklistItem[]> = {
  [DeploymentStatus.Planned]: [
    {
      id: 'scope-approved',
      label: 'Scope approved',
      type: 'checkbox',
      required: true,
    },
    {
      id: 'kickoff-date',
      label: 'Kickoff date',
      type: 'date',
      required: true,
    },
    {
      id: 'notes',
      label: 'Planning notes',
      type: 'textarea',
    },
  ],
  [DeploymentStatus.Survey]: [
    {
      id: 'ru-available',
      label: 'RU available',
      type: 'checkbox',
      required: true,
    },
    {
      id: 'rails-set',
      label: 'Rails installed',
      type: 'checkbox',
      required: true,
    },
    {
      id: 'patch-ports',
      label: 'Patch ports available',
      type: 'checkbox',
      required: true,
    },
    {
      id: 'power-available',
      label: 'Power available',
      type: 'checkbox',
      required: true,
    },
    photoRequirement('rack-elevation-photo', 'Rack elevation photo'),
    photoRequirement('power-path-photo', 'Power path photo'),
  ],
  [DeploymentStatus.Inventory]: [
    {
      id: 'asset-count',
      label: 'Assets counted',
      type: 'number',
      required: true,
    },
    {
      id: 'asset-delta',
      label: 'Inventory deltas',
      type: 'textarea',
    },
    photoRequirement('inventory-staging-photo', 'Inventory staging area photo'),
  ],
  [DeploymentStatus.Install]: [
    {
      id: 'hardware-installed',
      label: 'Hardware installed',
      type: 'checkbox',
      required: true,
    },
    photoRequirement('front-cabinet-installed', 'Cabinet front photo'),
    photoRequirement('rear-cabinet-installed', 'Cabinet rear photo'),
    {
      id: 'install-issues',
      label: 'Install blockers',
      type: 'textarea',
    },
  ],
  [DeploymentStatus.Cabling]: [
    {
      id: 'power-separation',
      label: 'Power separation verified',
      type: 'checkbox',
      required: true,
    },
    {
      id: 'copper-rules',
      label: 'Copper cabling rules met',
      type: 'checkbox',
      required: true,
    },
    {
      id: 'fiber-rules',
      label: 'Fiber cabling rules met',
      type: 'checkbox',
      required: true,
    },
    fileRequirement('fluke-results', 'Fluke certification upload'),
    photoRequirement('cable-path-photo', 'Cable path photo'),
  ],
  [DeploymentStatus.Labeling]: [
    {
      id: 'labels-applied',
      label: 'Labels applied',
      type: 'checkbox',
      required: true,
    },
    {
      id: 'label-format',
      label: 'Label format',
      type: 'select',
      required: true,
      options: [
        { label: 'QR', value: 'qr' },
        { label: 'Barcode', value: 'barcode' },
        { label: 'Text', value: 'text' },
      ],
    },
    photoRequirement('label-sample-photo', 'Label sample photo'),
  ],
  [DeploymentStatus.Handoff]: [
    photoRequirement('cabinet-front-top', 'Cabinet front top', undefined, ['Vendor']),
    photoRequirement('cabinet-front-mid', 'Cabinet front middle', undefined, ['Vendor']),
    photoRequirement('cabinet-front-bottom', 'Cabinet front bottom', undefined, ['Vendor']),
    photoRequirement('cabinet-rear-top', 'Cabinet rear top', undefined, ['Vendor']),
    photoRequirement('cabinet-rear-mid', 'Cabinet rear middle', undefined, ['Vendor']),
    photoRequirement('cabinet-rear-bottom', 'Cabinet rear bottom', undefined, ['Vendor']),
    fileRequirement('as-built', 'As-Built package', undefined, ['Vendor']),
    fileRequirement('port-tests', 'Port test results', undefined, ['Vendor']),
    {
      id: 'de-validation',
      label: 'DE validation complete',
      type: 'checkbox',
      required: true,
      assignedRoles: ['ComcastDeploymentEngineer'],
    },
    {
      id: 'handoff-notes',
      label: 'Handoff notes',
      type: 'textarea',
      assignedRoles: ['ComcastDeploymentEngineer'],
    },
  ],
  [DeploymentStatus.Complete]: [
    {
      id: 'punch-resolved',
      label: 'All punch items resolved',
      type: 'checkbox',
      required: true,
    },
    {
      id: 'closeout-date',
      label: 'Closeout date',
      type: 'date',
      required: true,
    },
    {
      id: 'lessons-learned',
      label: 'Lessons learned',
      type: 'textarea',
    },
  ],
};
