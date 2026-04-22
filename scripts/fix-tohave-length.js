const fs = require('fs');
const path = require('path');

const filePath = 'src/app/features/field-resource-management/state/ui/ui.reducer.spec.ts';
const fullPath = path.join(process.cwd(), filePath);
let content = fs.readFileSync(fullPath, 'utf8');

// Replace toHaveLength with .length).toBe(
content = content.replace(
  /expect\((result\.notifications)\)\.toHaveLength\((\d+)\)/g,
  'expect($1.length).toBe($2)'
);

fs.writeFileSync(fullPath, content, 'utf8');
console.log(`Fixed: ${filePath}`);
