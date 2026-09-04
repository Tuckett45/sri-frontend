# Candidate Address Format Combine Bugfix Design

## Overview

The candidate onboarding form captures a home address as four split fields
(`streetAddress`, `homeCity`, `homeState`, `homeZip`). These are combined into a
single backend `homeAddress` string by `CandidateFormComponent.composeAddress`
and parsed back into split fields by `CandidateFormComponent.parseAddress` when a
candidate is edited. The candidate list separately derives the state from the
combined string via `CandidateListComponent.extractState` for display, filtering,
and sorting.

Today the compose/parse pair is not a clean round-trip and the two state readers
disagree:

- `composeAddress` uses `[street, city, stateZip].filter(Boolean).join(', ')`,
  which **silently drops empty segments**. When street or city is empty, the
  resulting string has fewer comma segments than `parseAddress` expects, so
  `parseAddress` maps the surviving segments into the wrong fields.
- `parseAddress` splits the whole address on `,` before analyzing it, so a
  street that itself contains a comma (e.g. `"123 Main St, Apt 4"`) produces an
  extra segment and shifts every later field.
- `splitStateZip` accepts any `[A-Za-z .]+` as the state (full names, lowercase),
  but `extractState` only matches a strict two-letter uppercase code
  (`[A-Z]{2}`). So an address composed from `"Texas"` or `"tx"` parses back with
  a state the list cannot recognize, yielding a blank state in the list.

The fix keeps the human-readable `"Street, City, State Zip"` format for the
well-formed case (preserving all current behavior) but makes compose emit a
**positionally stable** string, makes parse **position-aware** and comma-safe for
the street, and **normalizes the state** to a two-letter uppercase code so
`parseAddress` and `extractState` always agree. The fix is confined to the three
static/instance helpers; call sites (`populateForm`, submit handlers,
`onAddressInput`/`selectAddress`) are unchanged.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — an address whose
  street or city is empty, whose street contains a comma, or whose state is not
  already a plain two-letter uppercase code.
- **Property (P)**: The desired behavior — compose then parse returns the
  original split parts (with the state normalized), and the state parsed from the
  combined string equals the state the candidate list derives from it.
- **Preservation**: The existing behavior for well-formed four-part addresses
  (`"Street, City, State Zip"`), Google autocomplete population, empty-address
  handling, and two-letter-uppercase state extraction that must remain unchanged.
- **composeAddress**: Static method in
  `src/app/features/field-resource-management/components/onboarding/candidate-form/candidate-form.component.ts`
  that joins the split fields into the backend `homeAddress` string.
- **parseAddress**: Static method in the same file that splits a stored
  `homeAddress` back into `{ streetAddress, city, state, zip }`.
- **splitStateZip**: Private static helper in the same file that separates a
  trailing `"STATE ZIP"` segment into state and zip.
- **extractState**: Instance method in
  `src/app/features/field-resource-management/components/onboarding/candidate-list/candidate-list.component.ts`
  (~line 1281) that derives the two-letter state from the combined address for
  the list's display/filter/sort.
- **homeState (candidate field)**: The separate `Candidate.homeState` value the
  list prefers over `extractState` (`candidate.homeState || extractState(...)`);
  the fix must keep the address-derived fallback consistent with it.

## Bug Details

### Bug Condition

The bug manifests when the split fields cannot survive the compose/parse
round-trip, or when the composed state segment is not readable by the candidate
list. There are three interacting causes: `composeAddress` drops empty segments
so segment positions become ambiguous; `parseAddress` splits the street on commas
so a comma-containing street shifts later fields; and `splitStateZip` accepts
states that `extractState` cannot match.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X = { streetAddress, homeCity, homeState, homeZip }
  OUTPUT: boolean

  RETURN (isEmpty(X.streetAddress) AND NOT isEmpty(X.homeCity))
      OR (isEmpty(X.homeCity) AND NOT isEmpty(X.streetAddress))
      OR contains(X.streetAddress, ',')
      OR (NOT isEmpty(X.homeState) AND NOT isTwoLetterUpperState(X.homeState))
END FUNCTION
```

### Examples

- **Empty street (1.2 / 2.2)**: `{ street: '', city: 'Austin', state: 'TX', zip: '78701' }`
  composes to `"Austin, TX 78701"`. Parse sees 2 segments and assigns
  `streetAddress = "Austin"` (wrong) with the city lost.
  *Expected:* `streetAddress = ''`, `city = 'Austin'`, `state = 'TX'`, `zip = '78701'`.
- **Comma in street (1.3 / 2.3)**: `{ street: '123 Main St, Apt 4', city: 'Austin', state: 'TX', zip: '78701' }`
  composes to `"123 Main St, Apt 4, Austin, TX 78701"`. Parse splits into 4
  segments: `streetAddress = "123 Main St"`, `city = "Apt 4"`, tail = `"Austin, TX 78701"`.
  *Expected:* `streetAddress = '123 Main St, Apt 4'`, `city = 'Austin'`, etc.
- **Full-name / lowercase state (1.4 / 2.4)**: `{ street: '123 Main St', city: 'Austin', state: 'Texas', zip: '78701' }`
  composes to `"123 Main St, Austin, Texas 78701"`. `parseAddress` returns
  `state = 'Texas'`, but `extractState` returns `''` (no two-letter uppercase
  match), so the list shows a blank state.
  *Expected:* both read `'TX'`.
- **Empty city (1.5 / 2.5)**: `{ street: '123 Main St', city: '', state: 'TX', zip: '78701' }`
  composes to `"123 Main St, TX 78701"`. Parse sees 2 segments and treats
  `"123 Main St"` as street and `"TX 78701"` as state/zip — city assignment is
  incidental rather than guaranteed empty.
  *Expected:* `streetAddress = '123 Main St'`, `city = ''`, `state = 'TX'`, `zip = '78701'`.
- **Well-formed (1.1 / 2.1 — must be preserved)**: `{ street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' }`
  composes to `"123 Main St, Austin, TX 78701"` and parses back to the originals.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Well-formed four-part addresses SHALL continue to compose into
  `"Street, City, State Zip"` and parse back to the original values (3.1).
- Google Geocoding autocomplete (`onAddressInput` / `selectAddress`) SHALL
  continue to populate the split fields from the selected suggestion (3.2).
- An empty or undefined `homeAddress` SHALL continue to yield empty split fields
  from `parseAddress` with no error (3.3).
- A `"TWO-LETTER-UPPER 5-digit"` or ZIP+4 state/zip segment (e.g. `"TX 78701"`,
  `"TX 78701-1234"`) SHALL continue to split into the correct state and zip (3.4).
- The candidate list SHALL continue to extract a two-letter uppercase state code
  from a combined address for display, filtering, and sorting (3.5).

**Scope:**
All inputs where `isBugCondition(X)` is false SHALL be completely unaffected by
this fix. This includes:
- Well-formed addresses with all four parts present and a two-letter uppercase
  state (the composed string and parsed result are byte-for-byte identical to
  today's output).
- Addresses populated via Google autocomplete (which already produce abbreviated
  states and comma-free street segments).
- Empty/undefined addresses.

**Note:** The expected correct behavior for buggy inputs is defined in the
Correctness Properties section (Property 1). This section focuses on what must
NOT change.

## Hypothesized Root Cause

Based on the code in `candidate-form.component.ts` and `candidate-list.component.ts`,
the likely causes are:

1. **Lossy compose collapses positions**: `composeAddress` builds the string with
   `[street, city, stateZip].filter(Boolean).join(', ')`. Dropping empty segments
   means an empty street or empty city changes the number of comma-separated
   segments, so `parseAddress` (which is driven by segment count: `>= 3`, `=== 2`,
   else) can no longer tell which segment is which.

2. **Street is not comma-safe on parse**: `parseAddress` does
   `raw.split(',')` over the entire address, so any comma inside the street is
   treated as a field separator. `parseAddress` assumes `parts[0]` is the whole
   street and `parts[1]` is the whole city, which breaks for multi-comma streets.

3. **State format mismatch between the two readers**: `splitStateZip` matches the
   state with `^([A-Za-z .]+?)?\s*(\d{5}(?:-\d{4})?)?$` — accepting full names and
   lowercase — while `extractState` matches only `,\s*([A-Z]{2})[\s.]*(\d{5})?`.
   Neither compose nor parse normalizes the state, so the two readers disagree
   whenever the state is not already `[A-Z]{2}`.

4. **Ambiguous two-segment branch**: The `parts.length === 2` branch guesses
   whether the second segment is a city or a state/zip. With a lossy compose it
   cannot reliably distinguish the empty-street case from the empty-city case.

The primary fixes target causes 1–3; the two-segment ambiguity (cause 4) is
resolved as a consequence of using positionally stable segments plus explicit
empty-part markers, rather than by guessing.

## Correctness Properties

Property 1: Bug Condition - Round-Trip Correctness With Normalized State

_For any_ input where the bug condition holds (isBugCondition returns true), the
fixed `composeAddress`/`parseAddress` pair SHALL round-trip so that the parsed
`streetAddress`, `city`, and `zip` equal the original split values (with an empty
street or empty city preserved as empty and a comma-containing street preserved
in full), and the parsed `state` equals the normalized two-letter uppercase form
of the original state.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

Property 2: State Consistency Between Parse And List

_For any_ input where a non-empty state is present, the state produced by the
fixed `parseAddress` from the combined string SHALL equal the state the fixed
`extractState` derives from that same combined string, so display, filtering, and
sorting in the candidate list agree with the parsed form.

**Validates: Requirements 2.4, 3.5**

Property 3: Preservation - Well-Formed And Non-Buggy Inputs Unchanged

_For any_ input where the bug condition does NOT hold (isBugCondition returns
false), the fixed functions SHALL produce the same results as the original
functions: `composeAddress'(X) = composeAddress(X)`,
`parseAddress'(composeAddress'(X)) = parseAddress(composeAddress(X))`, and
`extractState'(composeAddress'(X)) = extractState(composeAddress(X))`, preserving
well-formed `"Street, City, State Zip"` behavior, autocomplete population, empty
addresses, and two-letter-uppercase extraction.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct, all changes are confined to the
three address helpers. Call sites remain unchanged.

**File**: `src/app/features/field-resource-management/components/onboarding/candidate-form/candidate-form.component.ts`

1. **Add a state normalizer**: Introduce a private static
   `normalizeState(raw: string): string` that maps a state value to a two-letter
   uppercase code recognized by `extractState`.
   - If the input is already `[A-Za-z]{2}`, uppercase and return it.
   - If the input is a full US state name (case-insensitive), map it to its
     USPS two-letter code via a name→code lookup table.
   - Otherwise return the trimmed, uppercased input unchanged (best-effort, no
     data loss) so unknown values still round-trip through compose/parse.

2. **Make `composeAddress` positionally stable**: Stop collapsing the string with
   `filter(Boolean)`. Preserve the well-formed output exactly, but for the buggy
   cases:
   - Normalize the state with `normalizeState` before building the `stateZip`
     segment, so the composed segment is always a two-letter uppercase code that
     `extractState` matches.
   - Keep segment positions stable so parse can recover empty street/city (e.g.
     retain an empty slot for a missing street or city rather than silently
     removing the comma), while ensuring the all-four-parts case still yields the
     identical `"Street, City, State Zip"` string produced today.

3. **Make `parseAddress` position-aware and comma-safe**:
   - Identify the trailing state/zip segment first (via `splitStateZip`) and
     strip it from the tail, so the state/zip is never confused with street/city.
   - Treat the remaining leading text as `street` + optional `city`, splitting off
     the **last** comma-separated segment as the city (when present) so that a
     comma-containing street is preserved in `streetAddress` in full.
   - Assign empty string to `streetAddress`/`city` when the corresponding
     positional slot is empty, instead of shifting later segments forward.
   - Normalize the resolved state through `normalizeState` so parse and
     `extractState` agree.

4. **Keep `splitStateZip` behavior for the preserved case**: Continue to split a
   `"STATE ZIP"` / ZIP+4 tail correctly (3.4). Normalization of non-standard state
   text happens in `normalizeState`, not here, so the preserved two-letter case is
   byte-for-byte unchanged.

**File**: `src/app/features/field-resource-management/components/onboarding/candidate-list/candidate-list.component.ts`

5. **Confirm `extractState` compatibility (no behavior change expected)**: Because
   compose now always emits a two-letter uppercase state, the existing
   `extractState` regex (`,\s*([A-Z]{2})[\s.]*(\d{5})?[.\s]*$`) will match. If the
   round-trip tests reveal an anchoring gap for the empty-city composed layout,
   adjust `extractState` minimally to recognize the same trailing
   `"STATE ZIP"` segment `parseAddress` uses — without changing results for
   already-matching two-letter inputs (3.5 preserved). This change is applied only
   if a test demonstrates the need.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples
that demonstrate the bug on the unfixed code, then verify the fix works correctly
and preserves existing behavior. Tests live alongside the components
(`candidate-form.component.spec.ts`, `candidate-list.component.spec.ts`) using
Karma/Jasmine, with property-based tests written using `fast-check`.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the
fix. Confirm or refute the root cause analysis. If we refute it, we re-hypothesize.

**Test Plan**: Write tests that call `composeAddress(X)` then
`parseAddress(composed, X.homeState)` for each buggy input class, and tests that
compare `parseAddress(composed).state` against `extractState(composed)`. Run these
on the UNFIXED code to observe the failures.

**Test Cases**:
1. **Empty street**: `{ street: '', city: 'Austin', state: 'TX', zip: '78701' }` —
   expect `streetAddress = ''`, `city = 'Austin'` (will fail on unfixed code —
   city is misassigned to street).
2. **Comma in street**: `{ street: '123 Main St, Apt 4', city: 'Austin', state: 'TX', zip: '78701' }` —
   expect `streetAddress = '123 Main St, Apt 4'` (will fail on unfixed code —
   street is truncated at the first comma).
3. **Full-name / lowercase state**: `{ street: '123 Main St', city: 'Austin', state: 'Texas', zip: '78701' }` —
   expect `parseAddress(...).state === extractState(composed)` and both equal
   `'TX'` (will fail on unfixed code — `extractState` returns `''`).
4. **Empty city (edge case)**: `{ street: '123 Main St', city: '', state: 'TX', zip: '78701' }` —
   expect `city = ''`, `streetAddress = '123 Main St'` (may fail on unfixed code —
   ambiguous two-segment handling).

**Expected Counterexamples**:
- Compose drops empty segments so parse maps segments to the wrong fields.
- Parse truncates a comma-containing street at the first comma.
- Parse accepts a non-two-letter state that `extractState` cannot read.
- Possible causes: lossy `filter(Boolean)` compose, whole-string `split(',')` in
  parse, and no shared state normalization between `splitStateZip` and
  `extractState`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed
functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  combined := composeAddress_fixed(X)
  parsed   := parseAddress_fixed(combined, X.homeState)
  ASSERT parsed.streetAddress = X.streetAddress
     AND parsed.city          = X.homeCity
     AND parsed.state         = normalizeState(X.homeState)
     AND parsed.zip           = X.homeZip
  ASSERT parseAddress_fixed(combined, X.homeState).state = extractState_fixed(combined)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the
fixed functions produce the same results as the original functions.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT composeAddress_fixed(X) = composeAddress_original(X)
  ASSERT parseAddress_fixed(composeAddress_fixed(X))   = parseAddress_original(composeAddress_original(X))
  ASSERT extractState_fixed(composeAddress_fixed(X))   = extractState_original(composeAddress_original(X))
END FOR
```

**Testing Approach**: Property-based testing (`fast-check`) is recommended for
preservation checking because:
- It generates many address combinations automatically across the input domain.
- It catches edge cases that hand-written unit tests miss (unusual zip formats,
  whitespace, mixed casing).
- It gives strong guarantees that non-buggy behavior is unchanged.

**Test Plan**: Observe behavior on the UNFIXED code first for well-formed
four-part addresses, autocomplete-populated values, and empty addresses, then
write property-based tests that capture that behavior and assert it is unchanged
after the fix.

**Test Cases**:
1. **Well-formed round-trip**: Observe `"Street, City, State Zip"` round-trips on
   unfixed code, then assert it still does (2.1 / 3.1).
2. **Two-letter state extraction**: Observe `extractState` returns the code for a
   well-formed address on unfixed code, then assert it is unchanged (3.5).
3. **Empty address**: Observe `parseAddress('')` / `parseAddress(undefined)`
   returns empty parts without error, then assert unchanged (3.3).
4. **STATE ZIP / ZIP+4 splitting**: Observe `"TX 78701"` and `"TX 78701-1234"`
   split correctly, then assert unchanged (3.4).

### Unit Tests

- `composeAddress` for each field-presence combination (all four; empty street;
  empty city; comma street; full-name/lowercase state).
- `parseAddress` for each composed string, including empty/undefined input and
  ZIP+4 tails.
- `normalizeState` mapping (two-letter passthrough, full-name lookup, lowercase
  uppercasing, unknown passthrough).
- `extractState` for two-letter and normalized composed strings.

### Property-Based Tests

- Round-trip: generate random `{ street (with/without commas), city (possibly
  empty), state (code/name/lowercase), zip (5 or ZIP+4) }` and assert Property 1
  and Property 2 hold for all `isBugCondition(X)` inputs.
- Preservation: generate random non-buggy `X` and assert `composeAddress`,
  `parseAddress`, and `extractState` outputs equal the original implementations'
  outputs (Property 3).
- State agreement: generate random non-empty states and assert
  `parseAddress(compose(X)).state === extractState(compose(X))`.

### Integration Tests

- Edit flow: load a candidate whose stored `homeAddress` matches each buggy class,
  confirm `populateForm` fills the split fields correctly, then re-save and confirm
  the stored `homeAddress` is stable (no corruption on repeated edits).
- Candidate list: render candidates whose `homeState` is empty so the list falls
  back to `extractState(homeAddress)`, and confirm the state column, the
  `availableStates` filter list, the search match, and the sort comparator all
  show the normalized two-letter state.
- Autocomplete: confirm `onAddressInput` / `selectAddress` still populate the
  split fields and that the composed address round-trips (3.2).
