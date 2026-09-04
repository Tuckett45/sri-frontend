# Bugfix Requirements Document

## Introduction

The candidate onboarding form in Field Resource Management now captures a candidate's home address as four split fields (`streetAddress`, `homeCity`, `homeState`, `homeZip`). These are combined into a single `homeAddress` string via `composeAddress` for backend storage and parsed back into the split fields via `parseAddress` when a candidate is edited. Separately, the candidate list derives the state for display, filtering, and sorting from the combined `homeAddress` string via `extractState`.

The combined address is not produced or parsed consistently. Certain valid combinations of the split fields do not round-trip cleanly (compose then parse yields different values than the original), and the state that `parseAddress` accepts is not the same as the state format that `extractState` in the candidate list can recognize. This causes address data corruption on edit and missing/blank state values in the candidate list.

This bugfix focuses on making the compose/parse round-trip correct and keeping the combined-address format consistent with how the candidate list extracts and derives state.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a candidate has a street, a city, a state, and a zip and the address is composed and then parsed back THEN the system SHALL produce split fields that match the original values (this baseline case works today and must be preserved).

1.2 WHEN the street field is empty but city, state, and zip are present THEN the composed string (e.g. "Austin, TX 78701") is parsed back with the city value incorrectly assigned to `streetAddress` and the original city lost.

1.3 WHEN the street field contains a comma (e.g. "123 Main St, Apt 4") THEN the composed string is parsed back with only the text before the first comma assigned to `streetAddress`, dropping the remainder and shifting the remaining segments into the wrong fields.

1.4 WHEN the state is stored as a full name (e.g. "Texas") or in lowercase (e.g. "tx") THEN `parseAddress` accepts it into the state field but `extractState` in the candidate list fails to recognize it, so the candidate list shows a blank state for display, filtering, and sorting.

1.5 WHEN the city field is empty but street, state, and zip are present THEN the composed string (e.g. "123 Main St, TX 78701") is parsed back with the state/zip segment interpreted correctly but the mismatch between the two-segment layout and the expected three-segment layout produces inconsistent city/state assignment.

### Expected Behavior (Correct)

2.1 WHEN a candidate has a street, a city, a state, and a zip and the address is composed and then parsed back THEN the system SHALL produce split fields equal to the original street, city, state, and zip values.

2.2 WHEN the street field is empty but city, state, and zip are present THEN the system SHALL parse the composed string back so that `city`, `state`, and `zip` match the originals and `streetAddress` is empty (no value is misassigned to `streetAddress`).

2.3 WHEN the street field contains a comma THEN the system SHALL preserve the full street value through compose and parse so that `streetAddress` after parsing equals the original street.

2.4 WHEN the state is present in any accepted form THEN the system SHALL produce a combined `homeAddress` whose state segment is recognized identically by both `parseAddress` and the candidate list's `extractState`, so the parsed state and the list-derived state agree.

2.5 WHEN the city field is empty but street, state, and zip are present THEN the system SHALL parse the composed string back so that `streetAddress`, `state`, and `zip` match the originals and `city` is empty.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN all four split fields (street, city, state, zip) are present and well-formed THEN the system SHALL CONTINUE TO compose them into a "Street, City, State Zip" formatted string and parse them back to the original values.

3.2 WHEN a state is selected via the Google Geocoding autocomplete (`onAddressInput` / `selectAddress`) THEN the system SHALL CONTINUE TO populate the split fields from the selected suggestion.

3.3 WHEN the `homeAddress` is empty or undefined THEN the system SHALL CONTINUE TO return empty split fields from `parseAddress` without error.

3.4 WHEN a state/zip segment is a two-letter uppercase state followed by a 5-digit or ZIP+4 zip (e.g. "TX 78701" or "TX 78701-1234") THEN the system SHALL CONTINUE TO split it into the correct state and zip.

3.5 WHEN the candidate list derives state from a combined address whose state segment is a two-letter uppercase code THEN the system SHALL CONTINUE TO extract that state for display, filtering, and sorting.

## Bug Condition and Properties

**Key Definitions:**
- **F**: The original (unfixed) compose/parse behavior in `CandidateFormComponent` and `extractState` in `CandidateListComponent`.
- **F'**: The fixed behavior after this change.
- **X**: The set of split address field values `{ streetAddress, homeCity, homeState, homeZip }`.

### Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X = { streetAddress, homeCity, homeState, homeZip }
  OUTPUT: boolean

  // Buggy when a component is empty (street or city), when the street
  // contains a comma, or when the state is not a plain two-letter
  // uppercase code that extractState can recognize.
  RETURN (isEmpty(X.streetAddress) AND NOT isEmpty(X.homeCity))
      OR (isEmpty(X.homeCity) AND NOT isEmpty(X.streetAddress))
      OR contains(X.streetAddress, ',')
      OR (NOT isEmpty(X.homeState) AND NOT isTwoLetterUpperState(X.homeState))
END FUNCTION
```

### Property: Fix Checking (Round-Trip Correctness)

```pascal
// For every buggy input, composing and parsing must return the original parts.
FOR ALL X WHERE isBugCondition(X) DO
  combined ← composeAddress'(X)
  parsed   ← parseAddress'(combined, X.homeState)
  ASSERT parsed.streetAddress = X.streetAddress
     AND parsed.city          = X.homeCity
     AND parsed.state         = normalizedState(X.homeState)
     AND parsed.zip           = X.homeZip
END FOR
```

### Property: State Consistency

```pascal
// The state parsed from the combined string must equal the state the
// candidate list derives from the same combined string.
FOR ALL X WHERE NOT isEmpty(X.homeState) DO
  combined ← composeAddress'(X)
  ASSERT parseAddress'(combined, X.homeState).state = extractState'(combined)
END FOR
```

### Property: Preservation Checking

```pascal
// For all non-buggy inputs, the fixed behavior matches the original behavior.
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT composeAddress'(X) = composeAddress(X)
  ASSERT parseAddress'(composeAddress'(X), X.homeState) = parseAddress(composeAddress(X), X.homeState)
  ASSERT extractState'(composeAddress'(X)) = extractState(composeAddress(X))
END FOR
```
