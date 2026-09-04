# Implementation Plan

## Overview

This bugfix restores a consistent, lossless round-trip between `CandidateFormComponent.composeAddress` / `parseAddress` and keeps the parsed state in agreement with `CandidateListComponent.extractState`. The current `composeAddress` collapses empty segments with `filter(Boolean)` and `parseAddress` splits the whole string on commas, so empty street/city, comma-containing streets, and non-two-letter state values (full names or lowercase) get mapped to the wrong fields or become unreadable by `extractState`. The fix adds a `normalizeState` helper, makes `composeAddress` positionally stable with a normalized two-letter state segment, makes `parseAddress` position-aware and comma-safe, and confirms `extractState` compatibility. Work follows the bug-condition methodology: an exploration test (Property 1) that fails on unfixed code and preservation tests (Property 2) that pass on unfixed code are written first, then the fix, then verification.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Round-Trip Correctness With Normalized State
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists and confirm/refute the root cause analysis
  - **Scoped PBT Approach**: Write a `fast-check` property scoped to buggy inputs (`isBugCondition(X)` true), plus concrete deterministic cases from the design's examples for reproducibility
  - Add the test to `src/app/features/field-resource-management/components/onboarding/candidate-form/candidate-form.component.spec.ts` (compose/parse round-trip) and `candidate-list.component.spec.ts` (state consistency vs `extractState`)
  - Call `CandidateFormComponent.composeAddress(X)` then `CandidateFormComponent.parseAddress(composed, X.homeState)` and assert `parsed.streetAddress = X.streetAddress`, `parsed.city = X.homeCity`, `parsed.zip = X.homeZip`, and `parsed.state = normalizeState(X.homeState)`
  - Assert `CandidateFormComponent.parseAddress(composed, X.homeState).state === new CandidateListComponent(...).extractState(composed)` for non-empty state
  - Concrete cases from design (Bug Condition examples):
    - Empty street: `{ streetAddress: '', homeCity: 'Austin', homeState: 'TX', homeZip: '78701' }` → expect `streetAddress = ''`, `city = 'Austin'` (unfixed: city misassigned to street)
    - Comma in street: `{ streetAddress: '123 Main St, Apt 4', homeCity: 'Austin', homeState: 'TX', homeZip: '78701' }` → expect `streetAddress = '123 Main St, Apt 4'` (unfixed: truncated at first comma)
    - Full-name / lowercase state: `{ streetAddress: '123 Main St', homeCity: 'Austin', homeState: 'Texas', homeZip: '78701' }` → expect `parseAddress(...).state === extractState(composed) === 'TX'` (unfixed: `extractState` returns `''`)
    - Empty city: `{ streetAddress: '123 Main St', homeCity: '', homeState: 'TX', homeZip: '78701' }` → expect `city = ''`, `streetAddress = '123 Main St'` (unfixed: ambiguous two-segment handling)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: lossy `filter(Boolean)` compose drops empty segments so parse maps segments to wrong fields; whole-string `split(',')` in parse truncates comma-containing street; `splitStateZip` accepts a state `extractState`'s `[A-Z]{2}` regex cannot read
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Well-Formed And Non-Buggy Inputs Unchanged
  - **IMPORTANT**: Follow observation-first methodology - capture current outputs on UNFIXED code before asserting them
  - Add tests to `candidate-form.component.spec.ts` and `candidate-list.component.spec.ts`
  - Observe behavior on UNFIXED code for non-buggy inputs (`isBugCondition(X)` false), then write `fast-check` properties that assert it is unchanged:
    - Well-formed round-trip: `{ streetAddress: '123 Main St', homeCity: 'Austin', homeState: 'TX', homeZip: '78701' }` composes to `"123 Main St, Austin, TX 78701"` and parses back to originals (2.1 / 3.1)
    - Two-letter state extraction: `extractState("123 Main St, Austin, TX 78701")` returns `'TX'` (3.5)
    - Empty address: `parseAddress('')` and `parseAddress(undefined)` return empty parts with no error (3.3)
    - STATE ZIP / ZIP+4 splitting: `"TX 78701"` and `"TX 78701-1234"` split into correct state and zip (3.4)
  - Write a property-based test generating random non-buggy `X` (all four parts present, two-letter uppercase state, comma-free street, 5-digit or ZIP+4 zip) asserting the composed string, parsed result, and `extractState` output match the current implementation's output byte-for-byte
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for inconsistent compose/parse round-trip and state format mismatch

  - [x] 3.1 Add `normalizeState` state normalizer
    - Add a private static `normalizeState(raw: string): string` to `CandidateFormComponent` (`src/app/features/field-resource-management/components/onboarding/candidate-form/candidate-form.component.ts`)
    - If input is already `[A-Za-z]{2}`, uppercase and return it
    - If input is a full US state name (case-insensitive), map to its USPS two-letter code via a name→code lookup table
    - Otherwise return the trimmed, uppercased input unchanged (best-effort, no data loss)
    - _Bug_Condition: isBugCondition(X) where NOT isEmpty(X.homeState) AND NOT isTwoLetterUpperState(X.homeState)_
    - _Expected_Behavior: parsed.state = normalizedState(X.homeState), recognized by extractState_
    - _Requirements: 2.4_

  - [x] 3.2 Make `composeAddress` positionally stable
    - Update `CandidateFormComponent.composeAddress` (~line 858); stop collapsing with `filter(Boolean)` for buggy cases
    - Normalize the state with `normalizeState` before building the `stateZip` segment so the composed segment is always a two-letter uppercase code `extractState` matches
    - Keep segment positions stable so parse can recover an empty street or city (retain an empty slot rather than silently removing the comma)
    - Ensure the all-four-parts well-formed case still yields the identical `"Street, City, State Zip"` string produced today
    - _Bug_Condition: isBugCondition(X) — empty street/city, comma street, or non-two-letter state_
    - _Expected_Behavior: composeAddress'(X) emits a positionally stable string with a normalized two-letter state segment_
    - _Preservation: well-formed four-part compose output byte-for-byte unchanged (3.1)_
    - _Requirements: 2.2, 2.4, 2.5, 3.1_

  - [x] 3.3 Make `parseAddress` position-aware and comma-safe
    - Update `CandidateFormComponent.parseAddress` (~line 877); identify the trailing state/zip segment first via `splitStateZip` and strip it from the tail so state/zip is never confused with street/city
    - Treat remaining leading text as `street` + optional `city`, splitting off the **last** comma-separated segment as the city (when present) so a comma-containing street is preserved in `streetAddress` in full
    - Assign empty string to `streetAddress`/`city` when the positional slot is empty instead of shifting later segments forward
    - Normalize the resolved state through `normalizeState` so parse and `extractState` agree
    - Keep `splitStateZip` (~line 913) splitting `"STATE ZIP"` / ZIP+4 tails correctly for the preserved case (3.4)
    - _Bug_Condition: isBugCondition(X) — empty street/city, comma street, or non-two-letter state_
    - _Expected_Behavior: parsed.streetAddress = X.streetAddress, parsed.city = X.homeCity, parsed.zip = X.homeZip, parsed.state = normalizeState(X.homeState)_
    - _Preservation: empty/undefined address yields empty parts (3.3); STATE ZIP / ZIP+4 splitting unchanged (3.4)_
    - _Requirements: 2.2, 2.3, 2.5, 3.3, 3.4_

  - [x] 3.4 Confirm `extractState` compatibility (apply change only if a test requires it)
    - Review `CandidateListComponent.extractState` (`src/app/features/field-resource-management/components/onboarding/candidate-list/candidate-list.component.ts`, line 1281) with regex `/,\s*([A-Z]{2})[\s.]*(\d{5})?[.\s]*$/`
    - Because compose now always emits a two-letter uppercase state, the existing regex should match; no behavior change expected
    - Only if a round-trip test reveals an anchoring gap for the empty-city composed layout, adjust `extractState` minimally to recognize the same trailing `"STATE ZIP"` segment `parseAddress` uses, without changing results for already-matching two-letter inputs
    - Keep the `candidate.homeState || extractState(...)` fallback and its consumers (`updateAvailableStates` line 1716, search filter line 1746, `homeStateFilter` line 1758, sort comparator lines 1792-1793) consistent
    - _Bug_Condition: isBugCondition(X) where the composed state segment must be readable by extractState_
    - _Expected_Behavior: extractState'(composed) equals parseAddress'(composed).state for non-empty state_
    - _Preservation: two-letter uppercase extraction for display/filter/sort unchanged (3.5)_
    - _Requirements: 2.4, 3.5_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Round-Trip Correctness With Normalized State
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior; when it passes it confirms the fix is correct
    - Run the bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed for empty street, comma street, full-name/lowercase state, and empty city)
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Well-Formed And Non-Buggy Inputs Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run the preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in well-formed round-trip, empty address, STATE ZIP/ZIP+4 splitting, and two-letter extraction)
    - Confirm all tests still pass after the fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Add unit tests for the address helpers
  - `composeAddress` for each field-presence combination (all four; empty street; empty city; comma street; full-name/lowercase state)
  - `parseAddress` for each composed string, including empty/undefined input and ZIP+4 tails
  - `normalizeState` mapping: two-letter passthrough, full-name lookup, lowercase uppercasing, unknown passthrough
  - `extractState` for two-letter and normalized composed strings
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.3, 3.4, 3.5_

- [ ] 5. Add property-based tests with `fast-check` for state agreement
  - Round-trip: generate random `{ street (with/without commas), city (possibly empty), state (code/name/lowercase), zip (5 or ZIP+4) }` and assert Property 1 and Property 2 hold for all `isBugCondition(X)` inputs
  - Preservation: generate random non-buggy `X` and assert `composeAddress`, `parseAddress`, and `extractState` outputs equal the original implementations' outputs (Property 3)
  - State agreement: generate random non-empty states and assert `parseAddress(compose(X)).state === extractState(compose(X))`
  - _Requirements: 2.4, 3.1, 3.5_

- [ ] 6. Add integration tests for edit flow, candidate list, and autocomplete
  - Edit flow: load a candidate whose stored `homeAddress` matches each buggy class, confirm `populateForm` (line 677, calls `parseAddress`) fills the split fields correctly, then re-save (submit handlers at lines 725/764 call `composeAddress`) and confirm the stored `homeAddress` is stable across repeated edits (no corruption)
  - Candidate list: render candidates whose `homeState` is empty so the list falls back to `extractState(homeAddress)`, and confirm the state column (template line 255), the `availableStates` filter list (line 1716), the search match (line 1746), and the sort comparator (lines 1792-1793) all show the normalized two-letter state
  - Autocomplete: confirm `onAddressInput` / `selectAddress` still populate the split fields and that the composed address round-trips (3.2)
  - _Requirements: 3.2, 3.5_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Run `npm test` and ensure all unit, property-based, and integration tests pass
  - Confirm the exploration test (task 1) passes, preservation tests (task 2) still pass, and no regressions exist
  - Ask the user if questions arise

## Task Dependency Graph

```
1  (Bug Condition exploration test — fails on unfixed code)
2  (Preservation tests — pass on unfixed code)
        │
        ▼
3  Fix (parent)
   3.1 normalizeState helper
        │
        ▼
   3.2 composeAddress positionally stable      (depends on 3.1)
   3.3 parseAddress position-aware & comma-safe (depends on 3.1)
        │
        ▼
   3.4 Confirm extractState compatibility       (depends on 3.2, 3.3)
        │
        ▼
   3.5 Verify exploration test passes  (re-runs task 1; after 3.1–3.4)
   3.6 Verify preservation tests pass  (re-runs task 2; after 3.1–3.4)
        │
        ▼
4  Unit tests for address helpers        (after 3)
5  Property-based tests (fast-check)      (after 3)
6  Integration tests (edit/list/autocomplete) (after 3)
        │
        ▼
7  Checkpoint — ensure all tests pass     (last, after 4, 5, 6)
```

Ordering summary:
- Tasks 1 and 2 come before any implementation (3.x).
- 3.1 precedes 3.2 and 3.3; 3.4 follows 3.2/3.3.
- 3.5 and 3.6 run after the implementation sub-tasks (3.1–3.4).
- Tasks 4, 5, and 6 depend on the completed fix (task 3).
- Task 7 is last, after 4, 5, and 6.

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "dependsOn": []
    },
    {
      "wave": 2,
      "tasks": ["3.1"],
      "dependsOn": [1]
    },
    {
      "wave": 3,
      "tasks": ["3.2", "3.3"],
      "dependsOn": [2]
    },
    {
      "wave": 4,
      "tasks": ["3.4"],
      "dependsOn": [3]
    },
    {
      "wave": 5,
      "tasks": ["3.5", "3.6"],
      "dependsOn": [4]
    },
    {
      "wave": 6,
      "tasks": ["4", "5", "6"],
      "dependsOn": [5]
    },
    {
      "wave": 7,
      "tasks": ["7"],
      "dependsOn": [6]
    }
  ]
}
```

## Notes

- Tasks 1 and 2 must be authored and run against the UNFIXED code first: task 1 is expected to FAIL (proving the bug), task 2 is expected to PASS (baseline to preserve). Do not modify code to make task 1 pass at that stage.
- Property 1 (Bug Condition / Expected Behavior) and Property 2 (Preservation) use the `**Property N:**` format so hover status tracking works; tasks 3.5/3.6 re-run the same tests from tasks 1/2 rather than writing new ones.
- Tests target `candidate-form.component.spec.ts` and `candidate-list.component.spec.ts`; property-based tests use `fast-check` per the project test stack.
- The well-formed four-part case must remain byte-for-byte identical in both `composeAddress` output and `parseAddress` results to avoid regressions.
- `extractState` (task 3.4) should need no change once compose emits a normalized two-letter state; adjust it only if a round-trip test reveals an anchoring gap, and without altering already-matching two-letter results.
- Run `npm test` for the final checkpoint (task 7).
