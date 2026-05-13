const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all spec files
const specFiles = glob.sync('src/app/features/field-resource-management/**/*.spec.ts', {
  cwd: process.cwd()
});

specFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Pattern: Find Job objects that have updatedAt but don't have market
  // This is a heuristic to find Job objects
  const lines = content.split('\n');
  const newLines = [];
  let inJobObject = false;
  let jobObjectIndent = '';
  let hasMarket = false;
  let hasCompany = false;
  let hasCreatedBy = false;
  let updatedAtLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line has updatedAt: Date
    if (line.match(/updatedAt:\s*(?:new Date\(|Date)/)) {
      updatedAtLine = i;
      // Look back to see if we have market, company, createdBy
      for (let j = Math.max(0, i - 20); j < i; j++) {
        if (lines[j].includes('market:')) hasMarket = true;
        if (lines[j].includes('company:')) hasCompany = true;
        if (lines[j].includes('createdBy:')) hasCreatedBy = true;
      }
      
      // If missing any, add them before updatedAt
      if (!hasMarket || !hasCompany || !hasCreatedBy) {
        const indent = line.match(/^(\s*)/)[1];
        const additions = [];
        if (!hasMarket) additions.push(`${indent}market: 'DALLAS',`);
        if (!hasCompany) additions.push(`${indent}company: 'TEST_COMPANY',`);
        if (!hasCreatedBy) additions.push(`${indent}createdBy: 'test-user',`);
        
        if (additions.length > 0) {
          newLines.push(...additions);
          modified = true;
        }
      }
      
      // Reset flags
      hasMarket = false;
      hasCompany = false;
      hasCreatedBy = false;
    }
    
    newLines.push(line);
  }
  
  if (modified) {
    content = newLines.join('\n');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
});

console.log('Done!');
