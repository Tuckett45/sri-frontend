# FRM Candidate Form Enhancement Work Items — sri-frontend (Frontend)

> These work items stem from confirmed requirements to enhance the ATLAS candidate intake form, offer status pipeline, and resource management workflow for Data Center roles.

---

## WI-7: Update Offer Status Type & Labels

**Priority:** High  
**Labels:** enhancement  
**Related:** WI-2 (Backend status update)

### Summary
Update the `OfferStatus` type, labels, and transition logic to match the new pipeline stages.

### Type Change
```typescript
// CURRENT
export type OfferStatus = 'pre_offer' | 'offer' | 'offer_acceptance';

// NEW
export type OfferStatus = 'needs_review' | 'vetted_available' | 'offer_extended' | 'offer_accepted_onboarding';
```

### Label Mapping
| Value | Display Label |
|-------|---------------|
| `needs_review` | Needs Review |
| `vetted_available` | Vetted/Available |
| `offer_extended` | Offer Extended |
| `offer_accepted_onboarding` | Offer Accepted/Onboarding |

### Transition Logic Update (`offer-status.util.ts`)
```typescript
export const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  needs_review: ['vetted_available'],
  vetted_available: ['offer_extended', 'needs_review'],
  offer_extended: ['offer_accepted_onboarding', 'vetted_available'],
  offer_accepted_onboarding: ['vetted_available'],  // for reassignment
};
```

### Files Impacted
- `models/onboarding.models.ts`
- `utils/offer-status.util.ts`
- `candidate-detail.component.ts` — STATUS_LABELS, getStatusClass, advanceStatus
- `candidate-list.component.ts` — OFFER_STATUS_LABELS, filter dropdown
- `candidate-form.component.ts` — ALL_OFFER_STATUSES array
- `add-candidate-modal.component.ts` — mat-option values
- `pipeline-dashboard.component.ts` — STATUS_LABELS, computeCounts

### Acceptance Criteria
- [ ] OfferStatus type updated everywhere
- [ ] Labels show new display names
- [ ] Transitions allow reassignment back to "Vetted/Available"
- [ ] Filter dropdown shows all 4 new statuses
- [ ] Status chips/badges use appropriate colors for new statuses
- [ ] No TypeScript compilation errors

---

## WI-8: Add New Fields to Candidate Form (Add Candidate Modal)

**Priority:** High  
**Labels:** enhancement  
**Related:** WI-1 (Backend entity), WI-4 (Backend DTOs)

### Summary
Add new form fields to the Add/Edit Candidate modal to capture middle name, home address (replacing work site label), referral source, resume upload, and headshot upload.

### Step 1 - Basic Info Additions

| Field | Input Type | Required | Validation | Notes |
|-------|-----------|----------|------------|-------|
| Middle Name | text input | Yes | required, allow "N/A" | Between First/Last name fields |
| Home Address | text input (replaces Work Site) | Yes | required | Label change from "Work Site" |
| Referred By | text input | No | maxLength(200) | New optional field |

### New Step or Integrated Upload Section

| Field | Input Type | Required | Validation | Notes |
|-------|-----------|----------|------------|-------|
| Resume | file input | Yes | .pdf, .doc, .docx; max 10MB | Show file name after selection |
| Headshot | file input | No | .jpg, .png; max 5MB | Show image preview |

### Model Changes (`onboarding.models.ts`)

Add to `Candidate` interface:
```typescript
middleName?: string;
homeAddress: string;
resumeUrl?: string;
headshotUrl?: string;
referredBy?: string;
```

Update `CreateCandidatePayload`:
```typescript
middleName: string;
homeAddress: string;
referredBy?: string;
```

Update `UpdateCandidatePayload`:
```typescript
middleName?: string;
homeAddress?: string;
referredBy?: string;
```

### Files Impacted
- `add-candidate-modal.component.ts` — form groups, template
- `models/onboarding.models.ts` — interfaces
- `services/onboarding.service.ts` — payload construction

### Acceptance Criteria
- [ ] Middle name field present and required
- [ ] Home Address replaces Work Site label
- [ ] Referred By field present and optional
- [ ] Resume file picker accepts PDF/DOC/DOCX
- [ ] Headshot file picker accepts JPG/PNG
- [ ] File names displayed after selection
- [ ] Validation prevents submission without required files
- [ ] Edit mode shows existing file names/links

---

## WI-9: Add Delete Button to Candidate List/Dashboard

**Priority:** Medium  
**Labels:** enhancement  
**Related:** Backend DELETE endpoint already exists

### Summary
Wire up the existing `OnboardingService.deleteCandidateById()` method to the UI. The service method exists but no component currently exposes a delete action.

### Implementation
- Add "Delete" button in the candidate list table's Actions column
- Add "Delete" button in the candidate detail view header
- Show confirmation dialog before deletion: "Are you sure you want to remove [Name]? This cannot be undone."
- After successful deletion, refresh the list / navigate back
- Show error toast/banner if deletion fails

### Files Impacted
- `candidate-list.component.ts` — add delete button in actions column
- `candidate-detail.component.ts` — add delete button in header-actions

### Acceptance Criteria
- [ ] Delete button visible in candidate list actions column
- [ ] Delete button visible on candidate detail page
- [ ] Confirmation dialog appears before deletion
- [ ] Successful deletion removes candidate from list
- [ ] Error handling shows message on failure
- [ ] Candidate list refreshes after deletion
- [ ] Works for removing duplicate records

---

## WI-10: Update Pipeline Dashboard for New Statuses

**Priority:** Medium  
**Labels:** enhancement  
**Related:** WI-7 (Status type update)

### Summary
Update the pipeline dashboard summary cards and funnel visualization to reflect the 4 new offer status stages.

### Changes

#### Summary Cards (currently 3 status cards → 4):
1. **Needs Review** — count of `needs_review`
2. **Vetted/Available** — count of `vetted_available`
3. **Offer Extended** — count of `offer_extended`
4. **Offer Accepted/Onboarding** — count of `offer_accepted_onboarding`
5. Incomplete Certs (unchanged)
6. Incomplete Drug Test (unchanged)
7. Starting Within 14 Days (unchanged)

#### Funnel Visualization:
Update to 4 stages with appropriate colors:
- Needs Review — light blue
- Vetted/Available — blue
- Offer Extended — dark blue
- Offer Accepted/Onboarding — green

#### Navigation:
- Each card click navigates to candidate list pre-filtered by that status

### Files Impacted
- `pipeline-dashboard.component.ts` — template, styles, computeCounts, buildFunnel

### Acceptance Criteria
- [ ] 4 status summary cards displayed
- [ ] Funnel shows 4 stages with correct colors
- [ ] Clicking each card filters candidate list to that status
- [ ] Counts are accurate
- [ ] Responsive layout handles 4+ cards gracefully

---

## WI-11: Update Candidate Form Component (Standalone)

**Priority:** High  
**Labels:** enhancement  
**Related:** WI-7 (Status values), WI-8 (Modal form)

### Summary
Update the standalone `CandidateFormComponent` to include the new fields and updated status values. This is the page-level form (not the modal).

### Changes
- Add form controls: `middleName`, `homeAddress`, `referredBy`
- Change "Work Site" label to "Home Address"
- Update offer status dropdown options to new values
- Update validators (middleName: required; homeAddress: required; referredBy: optional)
- Update `createCandidate()` and `updateCandidate()` payload construction

### Files Impacted
- `candidate-form.component.ts`

### Acceptance Criteria
- [ ] Middle Name field with required validator
- [ ] Home Address field replaces Work Site
- [ ] Referred By field (optional)
- [ ] Offer status dropdown shows 4 new values
- [ ] Form submission includes new fields in payload
- [ ] Edit mode populates new fields from existing data
- [ ] Validation messages display correctly

---

## WI-12: File Upload UI Components

**Priority:** Medium  
**Labels:** enhancement  
**Related:** WI-3 (Backend upload endpoints)

### Summary
Build file upload UI for resume and headshot, wired to the backend upload endpoints.

### Resume Upload Component
- File picker accepting `.pdf`, `.doc`, `.docx`
- Drag-and-drop zone or click-to-browse
- Show file name and size after selection
- Upload progress indicator
- Validation: required, max 10MB
- Error message for invalid file type/size

### Headshot Upload Component
- File picker accepting `.jpg`, `.png`
- Image preview after selection (thumbnail)
- Max 5MB
- Not required initially, but will be needed for offer stage
- Optional circular crop/preview

### Integration Points
- Upload triggered on form submission or immediately after file selection
- Wire to `POST /v1/onboarding/candidates/{id}/resume`
- Wire to `POST /v1/onboarding/candidates/{id}/headshot`
- Candidate detail view shows download link for existing resume
- Candidate detail view shows headshot thumbnail

### Files Impacted
- New component(s) or integrated into `add-candidate-modal.component.ts`
- `services/onboarding.service.ts` — add upload methods
- `candidate-detail.component.ts` — show existing files

### Acceptance Criteria
- [ ] Resume file picker works with valid types
- [ ] Headshot file picker works with valid types
- [ ] File size validation with user-friendly error
- [ ] Upload progress indicator shown
- [ ] Successful upload updates candidate record
- [ ] Existing resume/headshot shown on detail view
- [ ] Download link functional for existing files
- [ ] Error handling for upload failures
