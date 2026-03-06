# Implementation Plan

## Overview
This task list addresses 90+ TypeScript compilation errors in test files that block test execution. The approach follows the exploratory bugfix workflow: explore the bug through testing, preserve existing behavior, implement fixes, and validate.

---

## Phase 1: Bug Condition Exploration

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Test Compilation Errors Block Test Execution
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate compilation errors exist
  - **Scoped PBT Approach**: Scope the property to concrete failing test files with known compilation errors
  - Create test file: `src/app/features/field-resource-management/test-compilation.fault.pbt.spec.ts`
  - Test that compilation succeeds for test files with known errors (from bugfix.md section 1.1-1.14)
  - Sample test files to check:
    - `state/jobs/job.selectors.spec.ts` (enum value errors)
    - `state/jobs/job.effects.spec.ts` (property errors)
    - `services/job.service.spec.ts` (selector signature errors)
    - `services/csv-loader.service.ts` (import syntax error)
  - Use TypeScript compiler API or `ts.transpileModule` to programmatically check compilation
  - Assert: `compilationResult.diagnostics.length === 0` (should fail on unfixed code)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with compilation errors (this is correct - it proves the bug exists)
  - Document counterexamples found (specific files and error messages)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14_

---

## Phase 2: Preservation Property Tests

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Test Files and Production Code Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Test files without compilation errors currently compile successfully
  - Observe: Production code (non-test files) currently compiles successfully
  - Observe: Passing tests currently produce specific outcomes
  - Create test file: `src/app/features/field-resource-management/test-compilation.preservation.pbt.spec.ts`
  - Write property-based test: For all test files that currently compile successfully, they continue to compile after fixes
  - Write property-based test: For all production files, content remains unchanged after fixes
  - Write property-based test: For all passing tests, outcomes remain identical after fixes
  - Sample files to verify preservation:
    - Test files already using correct enum values
    - Production code files (should have zero changes)
    - Integration tests that were passing
  - Use file content comparison and compilation checks
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

---

## Phase 3: Implementation

- [-] 3. Fix test compilation errors

  - [x] 3.1 Create backup and analysis script
    - Create script to backup affected test files
    - Create script to analyze and categorize all compilation errors
    - Run analysis to generate error report by category
    - _Bug_Condition: isBugCondition(TestFile) where TestFile contains enum/property/selector/import mismatches_
    - _Expected_Behavior: All test files compile successfully with zero TypeScript errors_
    - _Preservation: No changes to production code, no changes to passing test outcomes_
    - _Requirements: 1.13, 1.14, 2.13, 2.14_

  - [x] 3.2 Fix JobStatus enum references (automated)
    - Find all test files using incorrect JobStatus values: `Pending`, `Scheduled`, `InProgress`, `OnHold`
    - Replace with correct values: `NotStarted`, `EnRoute`, `OnSite`, `Issue`
    - Use find-and-replace or codemod script for consistency
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.usesIncorrectEnumValues(JobStatus)_
    - _Expected_Behavior: Test files use actual JobStatus enum values and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.1, 2.1_

  - [x] 3.3 Fix JobType enum references (automated)
    - Find all test files using incorrect JobType values: `Installation`, `Maintenance`, `Repair`, `Inspection`
    - Replace with correct values: `Install`, `Decom`, `SiteSurvey`, `PM`
    - Use find-and-replace or codemod script for consistency
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.usesIncorrectEnumValues(JobType)_
    - _Expected_Behavior: Test files use actual JobType enum values and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.2, 2.2_

  - [x] 3.4 Fix Priority enum references (automated)
    - Find all test files using incorrect Priority values: `High`, `Medium`, `Low`
    - Replace with correct values: `P1`, `P2`, `Normal`
    - Use find-and-replace or codemod script for consistency
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.usesIncorrectEnumValues(Priority)_
    - _Expected_Behavior: Test files use actual Priority enum values and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.3, 2.3_

  - [ ] 3.5 Fix Skill object property errors (automated)
    - Find all test files creating Skill objects without `level` property
    - Add required `level: SkillLevel` property to all Skill mock objects
    - Use appropriate SkillLevel enum value (e.g., `SkillLevel.Intermediate`)
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.omitsRequiredProperties(Skill.level)_
    - _Expected_Behavior: Test files include required level property and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.4, 2.4_

  - [x] 3.6 Fix JobNote property references (automated)
    - Find all test files referencing `JobNote.content`
    - Replace with correct property name: `text`
    - Use find-and-replace for consistency
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.referencesNonExistentProperties(JobNote.content)_
    - _Expected_Behavior: Test files use correct property name 'text' and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.5, 2.5_

  - [x] 3.7 Fix Attachment property references (manual)
    - Find all test files referencing `Attachment.jobId`
    - Remove or replace references to non-existent property
    - Review actual Attachment interface to use correct properties
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.referencesNonExistentProperties(Attachment.jobId)_
    - _Expected_Behavior: Test files do not reference non-existent jobId property and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.6, 2.6_

  - [x] 3.8 Fix User property references (automated)
    - Find all test files referencing `User.firstName`
    - Replace with correct property name: `name`
    - Use find-and-replace for consistency
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.referencesNonExistentProperties(User.firstName)_
    - _Expected_Behavior: Test files use correct property name 'name' and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.7, 2.7_

  - [x] 3.9 Fix selector signature mismatches (manual)
    - Find all test files calling selectors with incorrect arity:
      - `selectTodaysJobs`, `selectOverdueJobs`, `selectUpcomingJobs`, `selectJobStatistics`
    - Review actual selector signatures in implementation
    - Update test calls to provide correct number of arguments
    - Common fix: Add second argument (often date or filter parameter)
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.callsSelectorsWithWrongArity(...)_
    - _Expected_Behavior: Test files call selectors with correct signatures and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.8, 2.8_

  - [x] 3.10 Fix TechnicianStatus enum imports (manual)
    - Find all test files importing non-existent `TechnicianStatus` from technician.model.ts
    - Option A: Use string literals matching actual implementation
    - Option B: Create missing TechnicianStatus enum in technician.model.ts if appropriate
    - Update all references in test files
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.importsNonExistentTypes(TechnicianStatus)_
    - _Expected_Behavior: Test files use correct technician status values and compile successfully_
    - _Preservation: Minimal changes to production code if enum is added_
    - _Requirements: 1.9, 2.9_

  - [x] 3.11 Fix UserRole enum imports (manual)
    - Find all test files importing non-existent `UserRole` from user.model.ts
    - Use string literals matching actual implementation
    - Update all references in test files
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.importsNonExistentTypes(UserRole)_
    - _Expected_Behavior: Test files use correct user role values and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.10, 2.10_

  - [x] 3.12 Fix ConnectionStatus type mismatches (manual)
    - Find all test files with ConnectionStatus type errors in UI state tests
    - Review actual ConnectionStatus type definition in UI state
    - Update test files to use correct type definition
    - Verify changes with TypeScript compiler
    - _Bug_Condition: TestFile.usesMismatchedTypes(ConnectionStatus)_
    - _Expected_Behavior: Test files use correct ConnectionStatus type and compile successfully_
    - _Preservation: Only test files modified, production code unchanged_
    - _Requirements: 1.11, 2.11_

  - [x] 3.13 Fix papaparse import syntax
    - Open `src/app/shared/services/csv-loader.service.ts`
    - Replace `Papa.default` usage with correct import syntax
    - Option A: Use `import * as Papa from 'papaparse'` and call `Papa.parse()`
    - Option B: Use `import { parse } from 'papaparse'` and call `parse()`
    - Verify changes with TypeScript compiler
    - Test csv-loader.service functionality if possible
    - _Bug_Condition: TestFile.usesIncorrectImportSyntax(Papa.default)_
    - _Expected_Behavior: csv-loader.service uses correct papaparse import and compiles successfully_
    - _Preservation: Functional behavior of CSV loading unchanged_
    - _Requirements: 1.12, 2.12_

  - [x] 3.14 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Test Files Compile Successfully After Fixes
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - All previously failing test files now compile successfully
    - Zero TypeScript compilation errors in test suite
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

  - [x] 3.15 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Files and Production Code Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation properties still hold:
      - Non-buggy test files still compile
      - Production code unchanged
      - Passing tests still produce same outcomes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

---

## Phase 4: Validation

- [ ] 4. Checkpoint - Ensure all tests pass and compilation succeeds
  - Run full TypeScript compilation: `npm run build` or `ng build`
  - Verify zero compilation errors in output
  - Run test compilation: `ng test --dry-run` or similar
  - Verify test suite can start (compilation phase succeeds)
  - Run property-based tests from tasks 1 and 2
  - Verify all PBT tests pass
  - Document final compilation status
  - Ask user if any questions arise or if manual verification is needed

---

## Notes

**Automation Strategy:**
- Tasks 3.2-3.6, 3.8: Can be automated with find-and-replace or codemod scripts
- Tasks 3.7, 3.9-3.13: Require manual review due to context-specific changes

**Testing Strategy:**
- Property 1 (Fault Condition): Validates that compilation errors are fixed
- Property 2 (Preservation): Validates that non-buggy code is unchanged

**Success Criteria:**
- All 90+ test files compile without TypeScript errors
- `ng test` command executes successfully (compilation phase)
- Code coverage tools can run and generate reports
- No changes to production code behavior or runtime functionality
- No changes to passing test outcomes (only compilation fixes)
