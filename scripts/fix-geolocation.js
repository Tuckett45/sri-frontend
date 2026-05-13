const fs = require('fs');
const path = require('path');

const filePath = 'src/app/features/field-resource-management/services/frm-signalr.service.spec.ts';
const fullPath = path.join(process.cwd(), filePath);
let content = fs.readFileSync(fullPath, 'utf8');

// Add accuracy property to all GeoLocation objects
content = content.replace(
  /\{ latitude: ([\d.-]+), longitude: ([\d.-]+) \}/g,
  '{ latitude: $1, longitude: $2, accuracy: 10 }'
);

fs.writeFileSync(fullPath, content, 'utf8');
console.log(`Fixed: ${filePath}`);
