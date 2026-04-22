# Bugfix Requirements Document

## Introduction

The Field Resource Management (FRM) system has 90+ TypeScript compilation errors in test files that completely block test execution. This is a P1 blocking issue identified during QA pass (task 21.1.2, ISSUE-001) that prevents:
- Running unit tests, integration tests, and property-based tests
- Measuring code coverage
- Validating functionality before production deployment
- Local development testing

The root cause is a mismatch between test mock data and the actual implementation, including incorrect enum values, missing required properties, selector signature mismatches, missing type definitions, and incorrect third-party library imports.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN test files reference `JobStatus` enum values (`Pending`, `Scheduled`, `InProgress`, `OnHold`) THEN the TypeScript compiler fails with "Property does not exist on type" errors

1.2 WHEN test files reference `JobType` enum values (`Installation`, `Maintenance`, `Repair`, `Inspection`) THEN the TypeScript compiler fails with "Property does not exist on type" errors

1.3 WHEN test files reference `Priority` enum values (`High`, `Medium`, `Low`) THEN the TypeScript compiler fails with "Property does not exist on type" errors

1.4 WHEN test files create `Skill` objects without the `level` property THEN the TypeScript compiler fails with "Property 'level' is missing" errors

1.5 WHEN test files reference `JobNote.content` property THEN the TypeScript compiler fails with "Property 'content' does not exist" errors

1.6 WHEN test files reference `Attachment.jobId` property THEN the TypeScript compiler fails with "Property 'jobId' does not exist" errors

1.7 WHEN test files reference `User.firstName` property THEN the TypeScript compiler fails with "Property 'firstName' does not exist" errors

1.8 WHEN test files call selectors like `selectTodaysJobs`, `selectOverdueJobs`, `selectUpcomingJobs`, `selectJobStatistics` with only 1 argument THEN the TypeScript compiler fails with "Expected 2 arguments, but got 1" errors

1.9 WHEN test files import `TechnicianStatus` enum from technician.model.ts THEN the TypeScript compiler fails with "Module has no exported member 'TechnicianStatus'" errors

1.10 WHEN test files import `UserRole` enum from user.model.ts THEN the TypeScript compiler fails with "Module has no exported member 'UserRole'" errors

1.11 WHEN test files reference `ConnectionStatus` type in UI state tests THEN the TypeScript compiler fails with type mismatch errors

1.12 WHEN csv-loader.service.ts uses `Papa.default` from papaparse import THEN the TypeScript compiler fails with "Property 'default' does not exist" errors

1.13 WHEN attempting to run `ng test` or `npm test` commands THEN the test suite fails to start due to compilation errors

1.14 WHEN attempting to measure code coverage THEN the coverage tools cannot execute due to compilation failures

### Expected Behavior (Correct)

2.1 WHEN test files reference `JobStatus` enum values THEN they SHALL use the actual implementation values (`NotStarted`, `EnRoute`, `OnSite`, `Issue`) and compile successfully

2.2 WHEN test files reference `JobType` enum values THEN they SHALL use the actual implementation values (`Install`, `Decom`, `SiteSurvey`, `PM`) and compile successfully

2.3 WHEN test files reference `Priority` enum values THEN they SHALL use the actual implementation values (`P1`, `P2`, `Normal`) and compile successfully

2.4 WHEN test files create `Skill` objects THEN they SHALL include the required `level: SkillLevel` property and compile successfully

2.5 WHEN test files reference job note properties THEN they SHALL use `text` instead of `content` and compile successfully

2.6 WHEN test files reference attachment properties THEN they SHALL NOT reference the non-existent `jobId` property and compile successfully

2.7 WHEN test files reference user properties THEN they SHALL use `name` instead of `firstName` and compile successfully

2.8 WHEN test files call selectors like `selectTodaysJobs`, `selectOverdueJobs`, `selectUpcomingJobs`, `selectJobStatistics` THEN they SHALL provide the correct number of arguments matching the selector signature and compile successfully

2.9 WHEN test files need technician status values THEN they SHALL use string literals or create the missing `TechnicianStatus` enum and compile successfully

2.10 WHEN test files need user role values THEN they SHALL use string literals matching the actual implementation and compile successfully

2.11 WHEN test files reference `ConnectionStatus` type THEN they SHALL use the correct type definition from the UI state and compile successfully

2.12 WHEN csv-loader.service.ts imports papaparse THEN it SHALL use named import syntax (`import * as Papa from 'papaparse'` or `import { parse } from 'papaparse'`) and compile successfully

2.13 WHEN running `ng test` or `npm test` commands THEN the test suite SHALL compile successfully and begin test execution (tests may fail at runtime, but compilation must succeed)

2.14 WHEN measuring code coverage THEN the coverage tools SHALL execute successfully and generate coverage reports

### Unchanged Behavior (Regression Prevention)

3.1 WHEN test files use correct enum values that already match the implementation THEN the system SHALL CONTINUE TO compile those tests successfully

3.2 WHEN test files use correct property names that already match the implementation THEN the system SHALL CONTINUE TO compile those tests successfully

3.3 WHEN test files call selectors with correct signatures that already match the implementation THEN the system SHALL CONTINUE TO compile those tests successfully

3.4 WHEN production code (non-test files) uses enums, types, and interfaces THEN the system SHALL CONTINUE TO compile production code without any changes

3.5 WHEN test files have correct imports that already match the implementation THEN the system SHALL CONTINUE TO compile those tests successfully

3.6 WHEN running tests that were already passing before this fix THEN the system SHALL CONTINUE TO pass those tests (no behavioral changes to test logic)

3.7 WHEN production application runs in development or production mode THEN the system SHALL CONTINUE TO function identically (no changes to runtime behavior)

3.8 WHEN developers use the FRM feature in the browser THEN the system SHALL CONTINUE TO provide the same user experience (no UI or functional changes)

3.9 WHEN NgRx state management operates during application runtime THEN the system SHALL CONTINUE TO manage state identically (no changes to reducers, effects, or selectors beyond test compatibility)

3.10 WHEN third-party libraries (other than papaparse) are imported and used THEN the system SHALL CONTINUE TO import and use them identically

## Bug Condition Derivation

### Bug Condition Function

```pascal
FUNCTION isBugCondition(TestFile)
  INPUT: TestFile of type TypeScriptFile
  OUTPUT: boolean
  
  // Returns true when the test file contains compilation-blocking mismatches
  RETURN (
    TestFile.usesIncorrectEnumValues(JobStatus, JobType, Priority) OR
    TestFile.omitsRequiredProperties(Skill.level, JobNote.text) OR
    TestFile.referencesNonExistentProperties(Attachment.jobId, User.firstName, JobNote.content) OR
    TestFile.callsSelectorsWithWrongArity(selectTodaysJobs, selectOverdueJobs, selectUpcomingJobs, selectJobStatistics) OR
    TestFile.importsNonExistentTypes(TechnicianStatus, UserRole) OR
    TestFile.usesMismatchedTypes(ConnectionStatus) OR
    TestFile.usesIncorrectImportSyntax(Papa.default)
  )
END FUNCTION
```

### Property Specification

```pascal
// Property: Fix Checking - Test Files Compile Successfully
FOR ALL TestFile WHERE isBugCondition(TestFile) DO
  fixedTestFile ← applyCompilationFixes(TestFile)
  compilationResult ← TypeScriptCompiler.compile(fixedTestFile)
  
  ASSERT compilationResult.success = true
  ASSERT compilationResult.errors.length = 0
  ASSERT compilationResult.canExecuteTests = true
END FOR
```

### Preservation Property

```pascal
// Property: Preservation Checking - Non-Buggy Files Unchanged
FOR ALL TestFile WHERE NOT isBugCondition(TestFile) DO
  originalBehavior ← TestFile.compilationBehavior
  fixedBehavior ← applyCompilationFixes(TestFile).compilationBehavior
  
  ASSERT originalBehavior = fixedBehavior
END FOR

// Property: Preservation Checking - Production Code Unchanged
FOR ALL ProductionFile IN FRM_Feature DO
  originalCode ← ProductionFile.content
  afterFixCode ← ProductionFile.content
  
  ASSERT originalCode = afterFixCode
END FOR

// Property: Preservation Checking - Runtime Behavior Unchanged
FOR ALL TestCase IN PassingTests DO
  originalResult ← TestCase.execute(originalCode)
  fixedResult ← TestCase.execute(fixedCode)
  
  ASSERT originalResult = fixedResult
END FOR
```

## Affected Files

The following test files contain compilation errors (90+ files total):

**State Management Tests:**
- `src/app/features/field-resource-management/state/jobs/job.selectors.spec.ts`
- `src/app/features/field-resource-management/state/jobs/job.effects.spec.ts`
- `src/app/features/field-resource-management/state/jobs/job.reducer.spec.ts`
- `src/app/features/field-resource-management/state/jobs/job.actions.spec.ts`
- `src/app/features/field-resource-management/state/technicians/technician.selectors.spec.ts`
- `src/app/features/field-resource-management/state/technicians/technician.effects.spec.ts`
- `src/app/features/field-resource-management/state/technicians/technician.reducer.spec.ts`
- `src/app/features/field-resource-management/state/technicians/technician.actions.spec.ts`
- `src/app/features/field-resource-management/state/crews/crew.*.spec.ts`
- `src/app/features/field-resource-management/state/assignments/assignment.*.spec.ts`
- `src/app/features/field-resource-management/state/reporting/reporting.*.spec.ts`
- `src/app/features/field-resource-management/state/ui/ui.*.spec.ts`

**Service Tests:**
- `src/app/features/field-resource-management/services/job.service.spec.ts`
- `src/app/features/field-resource-management/services/technician.service.spec.ts`
- `src/app/features/field-resource-management/services/crew.service.spec.ts`
- `src/app/features/field-resource-management/services/scheduling.service.spec.ts`
- `src/app/features/field-resource-management/services/reporting.service.spec.ts`
- `src/app/shared/services/csv-loader.service.ts` (production file with import error)

**Component Tests:**
- All component test files in the FRM feature that use mock data with incorrect enum values or properties

## Success Criteria

1. All 90+ test files compile without TypeScript errors
2. `ng test` command executes successfully (compilation phase)
3. Code coverage tools can run and generate reports
4. No changes to production code behavior or runtime functionality
5. No changes to passing test outcomes (only compilation fixes)
