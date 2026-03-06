const fs = require('fs');
const path = require('path');

const filePath = 'src/app/features/field-resource-management/integration-tests/crew-workflows.e2e.spec.ts';
const fullPath = path.join(process.cwd(), filePath);

let content = fs.readFileSync(fullPath, 'utf8');

// Fix all jasmine.objectContaining with filters parameter
content = content.replace(
  /filters: jasmine\.objectContaining\(/g,
  'filters: jasmine.objectContaining('
);

// Add 'as any' after each closing paren of objectContaining when used with filters
content = content.replace(
  /(filters: jasmine\.objectContaining\({[^}]+}\))/g,
  '$1 as any'
);

// Fix crew parameter with objectContaining
content = content.replace(
  /(crew: jasmine\.objectContaining\({[^}]+}\))/g,
  '$1 as any'
);

fs.writeFileSync(fullPath, content, 'utf8');

console.log('✅ Fixed all jasmine.objectContaining type issues in crew-workflows.e2e.spec.ts');
