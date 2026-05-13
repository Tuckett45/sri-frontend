const fs = require('fs');
const path = require('path');

const filePath = 'src/app/features/field-resource-management/state/jobs/job.effects.spec.ts';
const fullPath = path.join(process.cwd(), filePath);
let content = fs.readFileSync(fullPath, 'utf8');

// Replace all instances of description: in updateDto with scopeDescription:
content = content.replace(
  /(const updateDto(?:: UpdateJobDto)? = \{[\s\S]*?)description:/g,
  '$1scopeDescription:'
);

fs.writeFileSync(fullPath, content, 'utf8');
console.log(`Fixed: ${filePath}`);
