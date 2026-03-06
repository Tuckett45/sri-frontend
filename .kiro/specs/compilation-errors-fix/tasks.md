# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Compilation Errors for Missing Properties
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the compilation errors exist
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases - Skill objects without 'level' property and file-upload bindings with wrong property names
  - Test that TypeScript compilation fails for Skill objects missing 'level' property in job-template-manager.component.ts and technician-form.component.ts
  - Test that Angular template compilation fails for file-upload bindings using 'maxSizeBytes' and 'acceptedTypes' instead of 'maxFileSize' and 'allowedFileTypes'
  - Run compilation on UNFIXED code (e.g., `ng build --configuration development` or `tsc --noEmit`)
  - **EXPECTED OUTCOME**: Compilation FAILS with specific errors (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - "Property 'level' is missing in type but required in type 'Skill'" for job-template-manager.component.ts
    - "Property 'level' is missing in type but required in type 'Skill'" for technician-form.component.ts
    - "Can't bind to 'maxSizeBytes' since it isn't a known property" for job-form.component.html
    - "Can't bind to 'acceptedTypes' since it isn't a known property" for job-completion-form.component.html
  - Mark task complete when compilation is run, failures are confirmed, and error messages are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Code Compilation and Runtime Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy files (files that don't contain the specific buggy patterns)
  - Write property-based tests capturing observed compilation success and runtime behavior patterns:
    - Test that Skill objects with all required properties (including 'level') compile successfully
    - Test that file-upload component bindings using correct property names ('maxFileSize', 'allowedFileTypes') compile successfully
    - Test that other components and services compile successfully
    - Test that skill selection, filtering, and display work correctly in runtime
    - Test that file upload validation and UI work correctly in runtime
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix compilation errors

  - [x] 3.1 Add missing 'level' property to Skill objects in job-template-manager.component.ts
    - Import SkillLevel enum from technician.model.ts if not already imported
    - Add `level: SkillLevel.INTERMEDIATE` to Skill object at line 39: `{ id: 's1', name: 'Cat6', category: 'Cabling' }`
    - Add `level: SkillLevel.INTERMEDIATE` to Skill object at line 40: `{ id: 's2', name: 'OSHA10', category: 'Safety' }`
    - _Bug_Condition: isBugCondition(input) where input.containsSkillObjectLiteral() AND NOT input.hasProperty('level')_
    - _Expected_Behavior: All Skill objects include required 'level' property with valid SkillLevel enum value_
    - _Preservation: Skill objects that already include 'level' property continue to work correctly; other components and services remain unchanged_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.2 Add missing 'level' property to Skill objects in technician-form.component.ts
    - Import SkillLevel enum from technician.model.ts if not already imported
    - Add `level: SkillLevel.INTERMEDIATE` to all Skill objects in availableSkills array (around lines 28-32)
    - _Bug_Condition: isBugCondition(input) where input.containsSkillObjectLiteral() AND NOT input.hasProperty('level')_
    - _Expected_Behavior: All Skill objects include required 'level' property with valid SkillLevel enum value_
    - _Preservation: Skill objects that already include 'level' property continue to work correctly; other components and services remain unchanged_
    - _Requirements: 2.3, 2.4, 3.2_

  - [x] 3.3 Correct file-upload component property names in job-form.component.html
    - Change `[maxSizeBytes]` to `[maxFileSize]` in file-upload component binding
    - Change `[acceptedTypes]` to `[allowedFileTypes]` in file-upload component binding
    - _Bug_Condition: isBugCondition(input) where input.containsFileUploadBinding() AND (input.usesProperty('maxSizeBytes') OR input.usesProperty('acceptedTypes'))_
    - _Expected_Behavior: File-upload component bindings use correct @Input property names matching component declarations_
    - _Preservation: File upload component functionality (validation, preview, drag-drop) remains unchanged; other component bindings remain unchanged_
    - _Requirements: 2.5, 3.3, 3.4_

  - [x] 3.4 Correct file-upload component property names in job-completion-form.component.html
    - Change `[maxSizeBytes]` to `[maxFileSize]` in file-upload component binding
    - Change `[acceptedTypes]` to `[allowedFileTypes]` in file-upload component binding
    - _Bug_Condition: isBugCondition(input) where input.containsFileUploadBinding() AND (input.usesProperty('maxSizeBytes') OR input.usesProperty('acceptedTypes'))_
    - _Expected_Behavior: File-upload component bindings use correct @Input property names matching component declarations_
    - _Preservation: File upload component functionality (validation, preview, drag-drop) remains unchanged; other component bindings remain unchanged_
    - _Requirements: 2.6, 3.5_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Compilation Success
    - **IMPORTANT**: Re-run the SAME compilation check from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (successful compilation)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run TypeScript compilation on FIXED code (e.g., `ng build --configuration development` or `tsc --noEmit`)
    - **EXPECTED OUTCOME**: Compilation PASSES with no errors (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Runtime Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2 on FIXED code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions in compilation or runtime behavior)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
