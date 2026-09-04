# Atlas API — Delete Endpoint Contract (Org Structure, PTO, Overtime)

## Why this document exists

The Org Structure, PTO, and Overtime **delete/remove** actions in `sri-frontend`
are fully wired end-to-end on the client (button → NgRx action → effect → API
service → store update). They fail at runtime because the endpoints they call
live on the **Atlas platform API** (`environment.atlasApiUrl`, e.g.
`https://atlas-api-…azurewebsites.net/v1`), which is a **separate service, not
part of `sri-backend` or `sri-frontend`**. `sri-backend` only *syncs users* to
Atlas (`AtlasSyncService`); it has no PTO/overtime/hierarchy endpoints.

This document is the exact contract the frontend expects, so the Atlas backend
can implement (or fix) these three endpoints. Nothing in the frontend needs to
change for deletes to start working — the client already handles the responses
described below.

> Base URL: value of `atlasApiUrl` per environment
> (`src/environments/environments.ts`).
> - prod: `https://atlas-api-fqf5e6dfgdebepan.centralus-01.azurewebsites.net/v1`
> - staging: `https://atlas-api-staging.azurewebsites.net/v1`
> - local: `https://localhost:7028/v1`

---

## 1. Delete a PTO request

**Client call:** `PtoApiService.deleteRequest(id)`
→ `state/pto/pto.effects.ts` (`deleteRequest$`)
→ on success reducer runs `adapter.removeOne(requestId)`.

```
DELETE {atlasApiUrl}/pto-requests/{id}
```

| | |
|---|---|
| Path param | `id` — PTO request GUID |
| Request body | none |
| Auth | Bearer token (attached by the app's auth interceptor) |
| Success | **204 No Content** (empty body). `200` with a body is also tolerated — the client ignores the body. |

**Authorization expected:** an employee may delete **their own** request in any
status. (The client will also be tightened to only *offer* delete on own
requests, but the server must still enforce ownership.)

**Error responses** (client maps status → message via `handleError`):

| Status | Client behavior |
|---|---|
| 400 | shows server `message`/`title`/`detail` or "Invalid request…" |
| 401 | "Unauthorized. Please log in again." |
| 403 | "You do not have permission to perform this action" |
| 404 | "Request not found" |
| 409 | "Request was updated by another user" |
| 422 | validation message |
| 500 | server `message` or "Server error. Please try again later." |

---

## 2. Delete an Overtime request

**Client call:** `OvertimeApiService.deleteRequest(id)`
→ `state/overtime/overtime.effects.ts` (`deleteRequest$`)
→ on success reducer runs `overtimeAdapter.removeOne(requestId)`.

```
DELETE {atlasApiUrl}/overtime-requests/{id}
```

| | |
|---|---|
| Path param | `id` — overtime request GUID |
| Request body | none |
| Success | **204 No Content** (empty body) |

Authorization and error mapping are identical to the PTO endpoint above
(same `handleError` implementation).

---

## 3. Remove a manager assignment (Org Structure)

**Client call:** `HierarchyApiService.removeManager(employeeUserId)`
→ `components/org-structure/org-structure.component.ts` (`removeManager`)
→ on success the component reloads the tree (`loadTree()`).

```
DELETE {atlasApiUrl}/hierarchy/{employeeUserId}
```

| | |
|---|---|
| Path param | `employeeUserId` — the user whose **manager link** should be removed |
| Request body | none |
| Semantics | Detach `employeeUserId` from its current manager (unparent it). This does **not** delete the user; their own direct reports should be re-parented per Atlas's hierarchy rules (e.g. promoted to the removed node's former parent, or to root). |
| Success | **200** or **204**. The client ignores the body and re-fetches `GET /hierarchy/tree`. |

**Error responses:** on failure the component shows
"Failed to remove manager assignment." (any non-2xx). Returning a JSON body with
`{ "message": "…" }` is preferred for other hierarchy calls (`assign`,
`create-manager`) which *do* surface `err.error.message`.

### Related hierarchy endpoints the tree view depends on (for context)

These are already called by the same screen; listed so the delete behavior is
consistent with the surrounding flow:

- `GET {atlasApiUrl}/hierarchy/tree?market={market?}` → `OrgTreeNode[]`
- `GET {atlasApiUrl}/hierarchy/users?market={market?}` → `OrgUser[]`
- `POST {atlasApiUrl}/hierarchy/assign` body `{ employeeUserId, managerUserId }`
- `POST {atlasApiUrl}/hierarchy/create-manager` body `{ employeeUserId }`

---

## Reference — enum values the client sends/expects

**PTO `RequestStatus`** (`models/pto.models.ts`):
`Pending_Manager_Approval`, `Pending_Backoffice_Approval`, `Approved`,
`Rejected`, `Cancelled`.

**Overtime `OvertimeRequestStatus`** (`models/overtime.models.ts`):
`Pending_Manager_Approval`, `Approved`, `Rejected`, `Cancelled`.
Note: the Atlas API currently returns the short form `Pending` for overtime,
which the client normalizes to `Pending_Manager_Approval` — deletes are not
status-gated, so this does not affect the delete contract.

---

## How to verify once implemented

From an authenticated client (or curl with a valid bearer token):

```bash
# PTO
curl -i -X DELETE "$ATLAS/v1/pto-requests/$ID" -H "Authorization: Bearer $TOKEN"
# expect: 204 No Content

# Overtime
curl -i -X DELETE "$ATLAS/v1/overtime-requests/$ID" -H "Authorization: Bearer $TOKEN"
# expect: 204 No Content

# Org structure (remove manager link)
curl -i -X DELETE "$ATLAS/v1/hierarchy/$EMPLOYEE_ID" -H "Authorization: Bearer $TOKEN"
# expect: 200 or 204; GET /v1/hierarchy/tree no longer nests the user under its old manager
```

A `404`/`405`/`000` (route not found / method not allowed / unreachable) on any
of the three is the signature of the current failure: the route is not
implemented on Atlas.
