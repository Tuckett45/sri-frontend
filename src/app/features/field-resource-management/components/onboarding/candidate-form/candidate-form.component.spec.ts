/**
 * Bug condition exploration test for candidate-address-format-combine bugfix.
 *
 * Property 1: Bug Condition - Round-Trip Correctness With Normalized State
 *
 * For any input where the bug condition holds (isBugCondition returns true),
 * the fixed composeAddress/parseAddress pair SHALL round-trip so that the parsed
 * streetAddress, city, and zip equal the original split values (empty street or
 * empty city preserved as empty, comma-containing street preserved in full), and
 * the parsed state equals the normalized two-letter uppercase form of the
 * original state.
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
 *
 * CRITICAL: This test is EXPECTED TO FAIL on the unfixed code. Failure confirms
 * the bug exists. Do NOT modify the code or the test to make it pass at this
 * stage; the fix implementation (task 3) is what makes it pass.
 */
import * as fc from 'fast-check';
import { CandidateFormComponent } from './candidate-form.component';

/** Split address parts as captured by the onboarding form. */
interface AddressParts {
  streetAddress: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
}

/**
 * Local replica of the normalization the fix is expected to apply to the state.
 * normalizeState is not yet implemented on the component, so we encode the
 * expected behavior here: full US state names map to their USPS two-letter
 * code, two-letter values are uppercased, everything else is uppercased as a
 * best-effort passthrough.
 */
const STATE_NAME_TO_CODE: Record<string, string> = {
  texas: 'TX',
  california: 'CA',
  florida: 'FL',
  'new york': 'NY',
};

function expectedNormalizeState(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return '';
  }
  const lower = trimmed.toLowerCase();
  if (STATE_NAME_TO_CODE[lower]) {
    return STATE_NAME_TO_CODE[lower];
  }
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed.toUpperCase();
}

function isEmpty(value: string): boolean {
  return !value || value.trim() === '';
}

function isTwoLetterUpperState(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

/** Mirrors isBugCondition from the design / bugfix spec. */
function isBugCondition(x: AddressParts): boolean {
  return (
    (isEmpty(x.streetAddress) && !isEmpty(x.homeCity)) ||
    (isEmpty(x.homeCity) && !isEmpty(x.streetAddress)) ||
    x.streetAddress.includes(',') ||
    (!isEmpty(x.homeState) && !isTwoLetterUpperState(x.homeState))
  );
}

describe('Property 1: Bug Condition - Round-Trip Correctness With Normalized State', () => {
  // Concrete deterministic cases from the design's Bug Condition examples.
  const concreteCases: { name: string; input: AddressParts }[] = [
    {
      name: 'empty street (1.2)',
      input: { streetAddress: '', homeCity: 'Austin', homeState: 'TX', homeZip: '78701' },
    },
    {
      name: 'comma in street (1.3)',
      input: { streetAddress: '123 Main St, Apt 4', homeCity: 'Austin', homeState: 'TX', homeZip: '78701' },
    },
    {
      name: 'full-name / lowercase state (1.4)',
      input: { streetAddress: '123 Main St', homeCity: 'Austin', homeState: 'Texas', homeZip: '78701' },
    },
    {
      name: 'empty city (1.5)',
      input: { streetAddress: '123 Main St', homeCity: '', homeState: 'TX', homeZip: '78701' },
    },
  ];

  concreteCases.forEach(({ name, input }) => {
    it(`round-trips split parts for buggy input: ${name}`, () => {
      const composed = CandidateFormComponent.composeAddress(input);
      const parsed = CandidateFormComponent.parseAddress(composed, input.homeState);

      expect(parsed.streetAddress).toBe(input.streetAddress);
      expect(parsed.city).toBe(input.homeCity);
      expect(parsed.zip).toBe(input.homeZip);
      expect(parsed.state).toBe(expectedNormalizeState(input.homeState));
    });
  });

  // **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
  it('round-trips any buggy input (isBugCondition true) preserving street, city, zip and normalizing state', () => {
    const streetArb = fc.oneof(
      fc.constant(''),
      fc.string({ minLength: 1, maxLength: 20 }).map((s) => s.replace(/,/g, '').trim() || 'Main St'),
      fc
        .tuple(
          fc.string({ minLength: 1, maxLength: 12 }).map((s) => s.replace(/,/g, '').trim() || 'Main St'),
          fc.string({ minLength: 1, maxLength: 8 }).map((s) => s.replace(/,/g, '').trim() || 'Apt 1')
        )
        .map(([a, b]) => `${a}, ${b}`)
    );
    const cityArb = fc.oneof(
      fc.constant(''),
      fc.constantFrom('Austin', 'Dallas', 'Houston', 'Miami', 'Fresno')
    );
    const stateArb = fc.constantFrom('TX', 'tx', 'Texas', 'CA', 'ca', 'California', 'FL', 'Florida');
    const zipArb = fc.constantFrom('78701', '90001', '33101', '78701-1234');

    fc.assert(
      fc.property(streetArb, cityArb, stateArb, zipArb, (streetAddress, homeCity, homeState, homeZip) => {
        const input: AddressParts = { streetAddress, homeCity, homeState, homeZip };
        // Scope the property to buggy inputs only.
        fc.pre(isBugCondition(input));

        const composed = CandidateFormComponent.composeAddress(input);
        const parsed = CandidateFormComponent.parseAddress(composed, input.homeState);

        expect(parsed.streetAddress).toBe(input.streetAddress);
        expect(parsed.city).toBe(input.homeCity);
        expect(parsed.zip).toBe(input.homeZip);
        expect(parsed.state).toBe(expectedNormalizeState(input.homeState));
      }),
      { numRuns: 200 }
    );
  });
});

/**
 * Preservation property tests for candidate-address-format-combine bugfix.
 *
 * Property 2 (Property 3 in design): Preservation - Well-Formed And Non-Buggy
 * Inputs Unchanged.
 *
 * For any input where the bug condition does NOT hold (isBugCondition returns
 * false), the fixed functions SHALL produce the same results as the original
 * functions:
 *   composeAddress'(X)                    = composeAddress(X)
 *   parseAddress'(composeAddress'(X))     = parseAddress(composeAddress(X))
 *   extractState'(composeAddress'(X))     = extractState(composeAddress(X))
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * OBSERVATION-FIRST NOTE: The `original*` reference functions below are exact
 * copies of composeAddress / parseAddress / splitStateZip observed on the
 * UNFIXED code. They capture the current baseline. On unfixed code the
 * component methods equal these references (tests PASS). After the fix, the
 * fix must NOT alter non-buggy behavior, so these tests must still PASS.
 */
describe('Property 2: Preservation - Well-Formed And Non-Buggy Inputs Unchanged', () => {
  // ---- Reference copies of the ORIGINAL (unfixed) implementation ----------
  function originalComposeAddress(formValue: AddressParts): string {
    const street = (formValue.streetAddress || '').trim();
    const city = (formValue.homeCity || '').trim();
    const state = (formValue.homeState || '').trim();
    const zip = (formValue.homeZip || '').trim();
    const stateZip = [state, zip].filter(Boolean).join(' ');
    return [street, city, stateZip].filter(Boolean).join(', ');
  }

  function originalSplitStateZip(text: string): { state: string; zip: string } {
    const trimmed = (text || '').trim();
    const match = trimmed.match(/^([A-Za-z .]+?)?\s*(\d{5}(?:-\d{4})?)?$/);
    if (match) {
      return { state: (match[1] || '').trim(), zip: (match[2] || '').trim() };
    }
    return { state: trimmed, zip: '' };
  }

  function originalParseAddress(
    homeAddress?: string,
    homeState?: string
  ): { streetAddress: string; city: string; state: string; zip: string } {
    const result = { streetAddress: '', city: '', state: homeState || '', zip: '' };
    const raw = (homeAddress || '').trim();
    if (!raw) {
      return result;
    }
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      result.streetAddress = parts[0];
      result.city = parts[1];
      const tail = parts.slice(2).join(', ');
      const { state, zip } = originalSplitStateZip(tail);
      result.state = state || result.state;
      result.zip = zip;
    } else if (parts.length === 2) {
      result.streetAddress = parts[0];
      const { state, zip } = originalSplitStateZip(parts[1]);
      if (state || zip) {
        result.state = state || result.state;
        result.zip = zip;
      } else {
        result.city = parts[1];
      }
    } else {
      result.streetAddress = parts[0];
    }
    return result;
  }

  // ---- Concrete cases from the task / design ------------------------------

  // Well-formed round-trip (2.1 / 3.1)
  it('well-formed address composes to "Street, City, State Zip" and parses back to originals', () => {
    const input: AddressParts = {
      streetAddress: '123 Main St',
      homeCity: 'Austin',
      homeState: 'TX',
      homeZip: '78701',
    };
    const composed = CandidateFormComponent.composeAddress(input);
    expect(composed).toBe('123 Main St, Austin, TX 78701');

    const parsed = CandidateFormComponent.parseAddress(composed, input.homeState);
    expect(parsed.streetAddress).toBe('123 Main St');
    expect(parsed.city).toBe('Austin');
    expect(parsed.state).toBe('TX');
    expect(parsed.zip).toBe('78701');
  });

  // Empty address (3.3)
  it('parseAddress("") returns empty parts with no error', () => {
    const parsed = CandidateFormComponent.parseAddress('');
    expect(parsed).toEqual({ streetAddress: '', city: '', state: '', zip: '' });
  });

  it('parseAddress(undefined) returns empty parts with no error', () => {
    const parsed = CandidateFormComponent.parseAddress(undefined);
    expect(parsed).toEqual({ streetAddress: '', city: '', state: '', zip: '' });
  });

  // STATE ZIP splitting (3.4)
  it('splits "STATE ZIP" (5-digit) into correct state and zip via round-trip', () => {
    const input: AddressParts = {
      streetAddress: '500 Oak Ave',
      homeCity: 'Dallas',
      homeState: 'TX',
      homeZip: '78701',
    };
    const composed = CandidateFormComponent.composeAddress(input);
    const parsed = CandidateFormComponent.parseAddress(composed, input.homeState);
    expect(parsed.state).toBe('TX');
    expect(parsed.zip).toBe('78701');
  });

  // STATE ZIP+4 splitting (3.4)
  it('splits "STATE ZIP+4" into correct state and zip via round-trip', () => {
    const input: AddressParts = {
      streetAddress: '500 Oak Ave',
      homeCity: 'Dallas',
      homeState: 'TX',
      homeZip: '78701-1234',
    };
    const composed = CandidateFormComponent.composeAddress(input);
    const parsed = CandidateFormComponent.parseAddress(composed, input.homeState);
    expect(parsed.state).toBe('TX');
    expect(parsed.zip).toBe('78701-1234');
  });

  // ---- Property-based preservation over random non-buggy X ----------------
  // **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
  it('compose and parse for any non-buggy input match the original implementation byte-for-byte', () => {
    // Non-buggy generator: all four parts present, two-letter uppercase state,
    // comma-free street, 5-digit or ZIP+4 zip.
    const streetArb = fc
      .string({ minLength: 1, maxLength: 24 })
      .map((s) => s.replace(/,/g, '').trim())
      .filter((s) => s.length > 0);
    const cityArb = fc.constantFrom('Austin', 'Dallas', 'Houston', 'Miami', 'Fresno', 'Denver');
    const stateArb = fc.constantFrom('TX', 'CA', 'FL', 'NY', 'CO', 'WA');
    const zipArb = fc.constantFrom('78701', '90001', '33101', '10001', '80202', '78701-1234');

    fc.assert(
      fc.property(streetArb, cityArb, stateArb, zipArb, (streetAddress, homeCity, homeState, homeZip) => {
        const input: AddressParts = { streetAddress, homeCity, homeState, homeZip };
        // Restrict to non-buggy inputs only.
        fc.pre(!isBugCondition(input));

        const composed = CandidateFormComponent.composeAddress(input);
        const expectedComposed = originalComposeAddress(input);
        expect(composed).toBe(expectedComposed);

        const parsed = CandidateFormComponent.parseAddress(composed, input.homeState);
        const expectedParsed = originalParseAddress(expectedComposed, input.homeState);
        expect(parsed).toEqual(expectedParsed);
      }),
      { numRuns: 200 }
    );
  });
});
