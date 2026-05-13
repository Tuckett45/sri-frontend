# Requirements Document

## Introduction

This document defines the requirements for the Onboarding Backend API, which provides the RESTful HTTP endpoints consumed by the Angular frontend "Onboarding Technician Actions" feature. The API manages technician records, certifications (typed credentials), equipment assignments, technical competencies, performance review cycles (PRC), and role-based credential templates. The backend must enforce data validation, uniqueness constraints, and return consistent response shapes that the frontend relies on for onboarding progress computation.

## Glossary

- **API**: The RESTful HTTP backend service hosted at the `/technicians` base path
- **Technician_Record**: The persisted entity representing a field technician with personal, role, and onboarding tracking fields
- **Typed_Credential**: A certification record using a discriminated union on `credentialType` with type-specific fields (Drivers_License, Drug_Screen, OSHA_Training_Cert, Offer_Letter, Background_Check, SSN_Last_Four)
- **Equipment_Assignment**: A record tracking a physical asset (badge, laptop, other) assigned to a technician
- **Technical_Competency**: A record tracking a technician's proficiency level in a specific skill area
- **PRC**: Performance Review Cycle record tracking 60-day review cycles with associated goals
- **Role_Template**: A RoleCredentialTemplate defining the required onboarding items for a given technician role
- **Asset_Identifier**: A unique string identifying a physical asset across all equipment assignments
- **Credential_Type**: One of: Drivers_License, Drug_Screen, OSHA_Training_Cert, Offer_Letter, Background_Check, SSN_Last_Four
- **Equipment_Status**: One of: assigned, returned, lost
- **PRC_Status**: One of: upcoming, overdue, completed
- **Proficiency_Level**: One of: beginner, intermediate, advanced, expert
- **Technician_Role**: One of: Installer, Lead, Level1, Level2, Level3, Level4

## Requirements

### Requirement 1: Retrieve Technician by ID

**User Story:** As a frontend client, I want to retrieve a single technician record by ID, so that I can display the technician's full profile including onboarding tracking fields.

#### Acceptance Criteria

1. WHEN a GET request is received at `/technicians/:id` with a valid technician ID, THE API SHALL return a 200 response containing the full Technician_Record including all onboarding fields (role, fiberExperience, liftCertifications, shiftAvailability, backgroundCheckStatus, drugScreenStatus, oshaCertified, oshaCertNumber, oshaCertExpiration, isVeteran, militaryBranch)
2. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response with an error message
3. THE API SHALL include `createdAt` and `updatedAt` timestamps in ISO 8601 format in the Technician_Record response
4. THE API SHALL return the `role` field as one of the defined Technician_Role enum values

### Requirement 2: Retrieve Technician Certifications

**User Story:** As a frontend client, I want to retrieve all certifications for a technician, so that I can display credential status and compute onboarding completion.

#### Acceptance Criteria

1. WHEN a GET request is received at `/technicians/:id/certifications` with a valid technician ID, THE API SHALL return a 200 response containing an array of Typed_Credential objects
2. WHEN a technician has no certifications on file, THE API SHALL return a 200 response with an empty array
3. THE API SHALL include the `credentialType` discriminator field on each Typed_Credential in the response
4. THE API SHALL include type-specific fields for each Typed_Credential based on its `credentialType` (licenseNumber and issuingState for Drivers_License, testDate and result for Drug_Screen, certificationNumber and trainingProvider for OSHA_Training_Cert, offerDate and offerStatus for Offer_Letter, submissionDate and result for Background_Check, lastFourDigits for SSN_Last_Four)
5. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response

### Requirement 3: Create Technician Certification

**User Story:** As a frontend client, I want to create a new certification for a technician, so that onboarding progress can be tracked as credentials are obtained.

#### Acceptance Criteria

1. WHEN a POST request is received at `/technicians/:id/certifications` with a valid request body, THE API SHALL create the Typed_Credential and return a 201 response containing the created record with a generated `id`
2. THE API SHALL validate that the `credentialType` field is one of the defined Credential_Type values
3. THE API SHALL validate that all required type-specific fields are present based on the `credentialType`
4. IF any required field is missing or invalid, THEN THE API SHALL return a 400 response with a descriptive error message identifying the invalid fields
5. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response
6. THE API SHALL set `createdAt` and `updatedAt` timestamps automatically on creation

### Requirement 4: Update Technician Certification

**User Story:** As a frontend client, I want to update an existing certification, so that credential information can be corrected or renewed.

#### Acceptance Criteria

1. WHEN a PUT request is received at `/technicians/:id/certifications/:certId` with a valid request body, THE API SHALL update the Typed_Credential and return a 200 response containing the updated record
2. THE API SHALL allow partial updates (only fields provided in the request body are updated)
3. THE API SHALL update the `updatedAt` timestamp on modification
4. IF the certification ID does not correspond to an existing Typed_Credential for the specified technician, THEN THE API SHALL return a 404 response
5. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response

### Requirement 5: Delete Technician Certification

**User Story:** As a frontend client, I want to delete a certification from a technician's record, so that incorrect or obsolete credentials can be removed.

#### Acceptance Criteria

1. WHEN a DELETE request is received at `/technicians/:id/certifications/:certId` with valid IDs, THE API SHALL permanently remove the Typed_Credential and return a 204 response with no body
2. THE API SHALL perform a hard delete (the record is permanently removed, not soft-deleted)
3. IF the certification ID does not correspond to an existing Typed_Credential for the specified technician, THEN THE API SHALL return a 404 response
4. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response

### Requirement 6: Retrieve Equipment Assignments

**User Story:** As a frontend client, I want to retrieve all equipment assignments for a technician, so that I can display assigned assets and compute onboarding completion.

#### Acceptance Criteria

1. WHEN a GET request is received at `/technicians/:id/equipment` with a valid technician ID, THE API SHALL return a 200 response containing an array of Equipment_Assignment objects
2. WHEN a technician has no equipment assignments, THE API SHALL return a 200 response with an empty array
3. THE API SHALL include all Equipment_Assignment fields: id, technicianId, assetType, assetIdentifier, assignmentDate, returnDate, status, notes, createdAt, updatedAt
4. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response

### Requirement 7: Create Equipment Assignment

**User Story:** As a frontend client, I want to assign equipment to a technician, so that asset tracking is maintained during onboarding.

#### Acceptance Criteria

1. WHEN a POST request is received at `/technicians/:id/equipment` with a valid request body, THE API SHALL create the Equipment_Assignment and return a 201 response containing the created record with a generated `id`
2. THE API SHALL validate that `assetType` is one of: badge, laptop, other
3. THE API SHALL validate that `assetIdentifier` is a non-empty string
4. THE API SHALL validate that `assetIdentifier` is unique across all Equipment_Assignment records with status "assigned" (excluding returned or lost equipment)
5. IF the `assetIdentifier` is not unique among active assignments, THEN THE API SHALL return a 409 response with an error message indicating the asset is already assigned
6. THE API SHALL set the initial `status` to "assigned" and set `assignmentDate` to the current date if not provided
7. THE API SHALL set `createdAt` and `updatedAt` timestamps automatically on creation
8. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response
9. IF any required field is missing or invalid, THEN THE API SHALL return a 400 response with a descriptive error message

### Requirement 8: Validate Asset Identifier Uniqueness

**User Story:** As a frontend client, I want to validate whether an asset identifier is unique before submitting an equipment assignment, so that I can provide immediate feedback to the user.

#### Acceptance Criteria

1. WHEN a GET request is received at `/technicians/equipment/validate/:identifier`, THE API SHALL return a 200 response with a JSON object containing an `isUnique` boolean field
2. THE API SHALL return `isUnique: true` when no active Equipment_Assignment (status "assigned") exists with the specified asset identifier
3. THE API SHALL return `isUnique: false` when an active Equipment_Assignment (status "assigned") exists with the specified asset identifier
4. WHEN an optional `excludeTechnicianId` query parameter is provided, THE API SHALL exclude equipment assignments belonging to that technician from the uniqueness check
5. THE API SHALL treat the asset identifier comparison as case-sensitive

### Requirement 9: Retrieve Technical Competencies

**User Story:** As a frontend client, I want to retrieve all technical competencies for a technician, so that I can display proficiency levels and compute onboarding completion.

#### Acceptance Criteria

1. WHEN a GET request is received at `/technicians/:id/competencies` with a valid technician ID, THE API SHALL return a 200 response containing an array of Technical_Competency objects
2. WHEN a technician has no competencies recorded, THE API SHALL return a 200 response with an empty array
3. THE API SHALL include all Technical_Competency fields: id, technicianId, competencyName, verificationDate, verifiedBy, proficiencyLevel, notes, createdAt, updatedAt
4. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response

### Requirement 10: Retrieve Performance Review Cycle

**User Story:** As a frontend client, I want to retrieve the current PRC for a technician, so that I can display review status and compute onboarding completion.

#### Acceptance Criteria

1. WHEN a GET request is received at `/technicians/:id/prc` with a valid technician ID that has a PRC record, THE API SHALL return a 200 response containing the PRC object with nested goals array
2. WHEN a technician has no PRC record, THE API SHALL return a 200 response with a null body
3. THE API SHALL include the `status` field with one of the defined PRC_Status values: upcoming, overdue, completed
4. THE API SHALL include the `goals` array containing all PRCGoal objects associated with the PRC
5. THE API SHALL include all PRC fields: id, technicianId, dueDate, completionDate, status, goals, createdAt, updatedAt
6. THE API SHALL include all PRCGoal fields: id, prcId, description, targetDate, status, completionNotes, createdAt, updatedAt
7. IF the technician ID does not correspond to an existing Technician_Record, THEN THE API SHALL return a 404 response

### Requirement 11: Retrieve Role Credential Template

**User Story:** As a frontend client, I want to retrieve the role-based credential template for a given role, so that I can compute the onboarding checklist delta and completion percentage.

#### Acceptance Criteria

1. WHEN a GET request is received at `/technicians/role-templates/:role` with a valid Technician_Role value, THE API SHALL return a 200 response containing the Role_Template object
2. THE API SHALL return the Role_Template with the shape: `{ role: string, requiredItems: [{ category: string, name: string, credentialType?: string, assetType?: string, competencyName?: string }] }`
3. THE API SHALL include the `category` field on each required item with one of: credential, equipment, competency, prc
4. IF no Role_Template exists for the specified role, THEN THE API SHALL return a 404 response
5. IF the role parameter is not a valid Technician_Role value, THEN THE API SHALL return a 400 response with an error message

### Requirement 12: Error Response Format

**User Story:** As a frontend client, I want consistent error response formats across all endpoints, so that I can implement uniform error handling logic.

#### Acceptance Criteria

1. WHEN any endpoint returns a 4xx or 5xx status code, THE API SHALL return a JSON response body with at minimum a `message` field containing a human-readable error description
2. WHEN a validation error occurs (400), THE API SHALL include a `errors` array field identifying the specific fields that failed validation
3. THE API SHALL return 404 for resource-not-found errors with a message identifying the resource type and ID
4. THE API SHALL return 400 for malformed request bodies or invalid parameter values
5. THE API SHALL return 409 for uniqueness constraint violations
6. THE API SHALL return 500 for unexpected server errors with a generic message that does not expose internal implementation details

### Requirement 13: List Endpoints Empty State

**User Story:** As a frontend client, I want list endpoints to return empty arrays instead of 404 when no items exist, so that I can distinguish between "technician not found" and "technician has no items."

#### Acceptance Criteria

1. WHEN a technician exists but has no certifications, THE API SHALL return a 200 response with an empty array for GET `/technicians/:id/certifications`
2. WHEN a technician exists but has no equipment assignments, THE API SHALL return a 200 response with an empty array for GET `/technicians/:id/equipment`
3. WHEN a technician exists but has no competencies, THE API SHALL return a 200 response with an empty array for GET `/technicians/:id/competencies`
4. THE API SHALL reserve 404 responses exclusively for cases where the parent technician resource does not exist

### Requirement 14: Request Content Type and Response Headers

**User Story:** As a frontend client, I want the API to accept and return JSON consistently, so that the Angular HttpClient can serialize and deserialize payloads without special handling.

#### Acceptance Criteria

1. THE API SHALL accept request bodies with Content-Type `application/json`
2. THE API SHALL return response bodies with Content-Type `application/json` for all non-204 responses
3. THE API SHALL return 415 (Unsupported Media Type) when a request body is provided with a Content-Type other than `application/json`
4. THE API SHALL support CORS headers for cross-origin requests from the frontend application origin
