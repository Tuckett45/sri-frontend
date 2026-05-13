const fs = require('fs');
const path = require('path');

// Error categories from the compilation output
const errorCategories = {
  incorrectProperties: {
    description: 'Properties incorrectly added to models',
    errors: [
      { file: 'crew-detail.component.spec.ts', property: 'market', model: 'Technician', lines: [54, 83, 102] },
      { file: 'crew-form.component.spec.ts', property: 'market', model: 'Technician', lines: [51, 71, 91] },
      { file: 'map.component.spec.ts', property: 'market', model: 'Technician', lines: [54, 76, 96] },
      { file: 'assignment-dialog.component.spec.ts', property: 'market', model: 'Technician', lines: [74] },
      { file: 'technician-schedule.component.spec.ts', property: 'market', model: 'Technician', lines: [41] },
      { file: 'batch-technician-dialog.component.spec.ts', property: 'market', model: 'Technician', lines: [33] },
      { file: 'technician-detail.component.spec.ts', property: 'market', model: 'Technician', lines: [61] },
      { file: 'technician-form.component.spec.ts', property: 'market', model: 'Technician', lines: [46] },
      { file: 'technician-list.component.spec.ts', property: 'market', model: 'Technician', lines: [48, 69] },
      { file: 'crew-workflows.e2e.spec.ts', property: 'market', model: 'Technician', lines: [109, 123, 137] },
      { file: 'job-detail.component.spec.ts', property: 'market', model: 'TimeEntry', lines: [279, 291, 310, 322] },
      { file: 'job-notes.component.spec.ts', property: 'market', model: 'JobNote', lines: [27, 36] },
      { file: 'job-card.component.spec.ts', property: 'market', model: 'TimeEntry', lines: [56] },
      { file: 'time-tracker.component.spec.ts', property: 'market', model: 'TimeEntry', lines: [67] },
      { file: 'timecard-dashboard.component.spec.ts', property: 'market', model: 'TimeEntry', lines: [54, 108] }
    ]
  },
  toHavePropertyErrors: {
    description: 'Jasmine toHaveProperty matcher not available',
    errors: [
      { file: 'job-template-manager.preservation.pbt.spec.ts', lines: [151, 152, 153, 154] }
    ]
  },
  missingProperties: {
    description: 'Required properties missing from objects',
    errors: [
      { file: 'real-time-marker-updates.integration.spec.ts', property: 'accuracy', model: 'GeoLocation', lines: [437, 475, 704, 742] },
      { file: 'calendar-view.component.spec.ts', property: 'status', model: 'Assignment', lines: [265] },
      { file: 'technician-schedule.component.spec.ts', property: 'status', model: 'Assignment', lines: [74] },
      { file: 'crew-workflows.e2e.spec.ts', properties: ['password', 'createdDate', 'isApproved'], model: 'User', lines: [71, 80, 90] }
    ]
  },
  wrongConstructorArgs: {
    description: 'Constructor called with wrong number of arguments',
    errors: [
      { file: 'file-upload.preservation.pbt.spec.ts', line: 280, issue: 'Missing imageCacheService argument' }
    ]
  },
  typeErrors: {
    description: 'Type mismatches and undefined types',
    errors: [
      { file: 'utilization-report.component.spec.ts', line: 128, issue: 'Installer not valid TechnicianRole' },
      { file: 'crew-workflows.e2e.spec.ts', lines: [106, 120, 134], issue: 'TechnicianRole not found' }
    ]
  },
  jasmineMatcherIssues: {
    description: 'Jasmine objectContaining type mismatches',
    errors: [
      { file: 'crew-workflows.e2e.spec.ts', lines: [356, 369, 382, 395, 460, 570, 719, 831, 1175, 1227, 1256], issue: 'objectContaining not compatible with DTO types' },
      { file: 'state-sync.integration.spec.ts', lines: [395, 398, 401], issue: 'jasmine.any(Object) not compatible with action props' }
    ]
  },
  propertyAccessErrors: {
    description: 'Accessing properties on never type',
    errors: [
      { file: 'real-time-events.integration.spec.ts', lines: [183, 264], issue: 'Property access on never type' }
    ]
  }
};

console.log('=== REMAINING COMPILATION ERRORS ANALYSIS ===\n');
console.log(`Total Error Categories: ${Object.keys(errorCategories).length}\n`);

let totalErrors = 0;
for (const [category, data] of Object.entries(errorCategories)) {
  const count = data.errors.reduce((sum, err) => {
    if (Array.isArray(err.lines)) return sum + err.lines.length;
    if (err.line) return sum + 1;
    return sum + 1;
  }, 0);
  totalErrors += count;
  
  console.log(`\n## ${category.toUpperCase()}`);
  console.log(`Description: ${data.description}`);
  console.log(`Error Count: ${count}`);
  console.log('Files affected:');
  data.errors.forEach(err => {
    console.log(`  - ${err.file}`);
    if (err.property) console.log(`    Property: ${err.property} on ${err.model}`);
    if (err.properties) console.log(`    Properties: ${err.properties.join(', ')} on ${err.model}`);
    if (err.issue) console.log(`    Issue: ${err.issue}`);
    if (err.lines) console.log(`    Lines: ${err.lines.join(', ')}`);
    if (err.line) console.log(`    Line: ${err.line}`);
  });
}

console.log(`\n\n=== TOTAL ERRORS: ${totalErrors} ===\n`);

// Priority order for fixes
console.log('\n=== RECOMMENDED FIX ORDER ===\n');
console.log('1. HIGHEST PRIORITY: incorrectProperties (undo bad automated changes)');
console.log('   - Remove "market" property from Technician objects (~15 files)');
console.log('   - Remove "market" property from TimeEntry objects (~5 files)');
console.log('   - Remove "market" property from JobNote objects (~1 file)');
console.log('');
console.log('2. HIGH PRIORITY: toHavePropertyErrors (simple fix)');
console.log('   - Replace toHaveProperty with toBeDefined checks');
console.log('');
console.log('3. MEDIUM PRIORITY: missingProperties');
console.log('   - Add missing "accuracy" to GeoLocation objects');
console.log('   - Add missing "status" to Assignment objects');
console.log('   - Add missing User properties');
console.log('');
console.log('4. MEDIUM PRIORITY: typeErrors and wrongConstructorArgs');
console.log('   - Fix TechnicianRole references');
console.log('   - Fix FileUploadComponent constructor call');
console.log('');
console.log('5. LOWER PRIORITY: jasmineMatcherIssues');
console.log('   - Fix objectContaining usage in crew-workflows.e2e.spec.ts');
console.log('   - Fix jasmine.any() usage in state-sync tests');
console.log('');
console.log('6. LOWER PRIORITY: propertyAccessErrors');
console.log('   - Fix type narrowing in real-time-events tests');

// Export for use in fix scripts
module.exports = errorCategories;
