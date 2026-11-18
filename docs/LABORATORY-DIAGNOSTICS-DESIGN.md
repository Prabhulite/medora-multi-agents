# Laboratory Diagnostics Vertical Slice

## Scope

Provide a manageable laboratory test catalog, patient-linked investigation orders, and a controlled workflow from order and specimen collection through draft result, independent verification, and release.

## Invariants and security

- Orders reference active, unmerged patients, active laboratory tests, and an active referring doctor when one is selected.
- Order entry uses a bounded, minimum-field patient lookup by MRD or name under `laboratory.create`; it returns only patient ID, MRD number, and display name, and excludes inactive or merged records.
- Order entry can attach an active referring doctor selected through a bounded lookup by name, code, or registration number; a linked active doctor account receives release and correction notices.
- The requested priority and clinical notes are stored on the order and remain available in the worklist response.
- Order numbers are allocated transactionally through the shared number sequence service.
- Order creation and specimen collection add patient audit entries in the same transaction as their workflow changes.
- Draft saves, verification, release, and addenda also add patient audit entries in the same transaction. Draft values and correction text are omitted from the audit summary; staff use the laboratory module to inspect the result.
- Cancelled orders cannot receive results.
- Authorized staff can cancel an uncollected order with a recorded reason, actor, and time. The same transaction adds a patient audit entry. Collection or later stages reject cancellation.
- Result values, units, ranges, and notes are validated server-side and attributed to the user who entered them.
- Drafts can be edited until verified. Verification requires a separate authorized staff account and explicit patient/specimen and quality-control review attestations. Verified results cannot be edited through the draft endpoint. Only an authorized release action makes the result completed and notifies a linked active referring doctor.
- Released values remain unchanged. Staff with `laboratory.amend` can append a dated correction with reason and author; the linked active referring doctor receives an in-app notice without result values. Viewers see all addenda alongside the original result.
- After release, staff with `laboratory.release` can record actual result contact attempts and confirmed delivery with method, recipient, summary, time, and recorder. Entries are append-only and patient-audited; in-app notification alone does not count as delivered. Staff must follow their escalation SOP for urgent or critical results.
- Users with `laboratory.view` alone see completed values; unreleased values and notes are masked. Staff with update, verify, or release permission can review drafts.
- Order list and mutation responses project patient name/MRD, test identity, referring doctor name, and collector name instead of serializing full patient, doctor, or staff records.
- The workbench uses a bounded `GET /api/laboratory/worklist` with page, page size, status, and order/patient/test search. It returns exact matching totals and unfiltered status summary counts. The older patient-scoped order list remains available for chart history; unscoped legacy lists return at most 100 orders.
- This is an internal authorization workflow. Staff must follow their laboratory's approved SOP, including actual QC review, urgent-result escalation, and any legal signature requirements. The system does not validate analyzer output, QC evidence, or accreditation compliance.
- All endpoints require authentication and laboratory-specific permissions.
- Staff with `laboratory.catalog.manage` can add validated catalog tests, retire them from future ordering, reactivate retired tests, and revise mutable catalog defaults with attributed field-level history. Test codes cannot be changed. Each order snapshots the selected test code and name at creation, so later catalog revisions cannot relabel existing orders or reports.

## API

- `GET /api/laboratory/tests`
- `GET /api/laboratory/worklist?page=1&pageSize=25&search=...&status=...` (`laboratory.view`)
- `POST /api/laboratory/tests` (`laboratory.catalog.manage`)
- `POST /api/laboratory/tests/:id/retire` (`laboratory.catalog.manage`)
- `GET /api/laboratory/tests/all` (`laboratory.catalog.manage`)
- `POST /api/laboratory/tests/:id/reactivate` (`laboratory.catalog.manage`)
- `GET /api/laboratory/patients?search=...` (`laboratory.create`)
- `GET /api/laboratory/doctors?search=...` (`laboratory.create`)
- `GET /api/laboratory/orders`
- `POST /api/laboratory/orders`
- `POST /api/laboratory/orders/:id/cancel` (`laboratory.cancel`)
- `PATCH /api/laboratory/orders/:id/collect`
- `PATCH /api/laboratory/orders/:id/result`
- `POST /api/laboratory/orders/:id/verify` (`laboratory.verify`)
- `POST /api/laboratory/orders/:id/release` (`laboratory.release`)
- `GET /api/laboratory/orders/:id/addenda` (`laboratory.view`, released orders only)
- `POST /api/laboratory/orders/:id/addenda` (`laboratory.amend`, released orders only)
- `GET /api/laboratory/orders/:id/communications` (`laboratory.view`)
- `POST /api/laboratory/orders/:id/communications` (`laboratory.release`, released orders only)

The UI is available at `/laboratory` and supports order creation, searchable worklist review, draft entry, verification, release, addenda, and read-only review of released results. Released results have a print layout containing patient and order identifiers, investigation, specimen, original result, addenda, reference range, and review/release times where recorded. Printing is disabled until addenda load, so a known correction is not silently omitted. Verified drafts do not expose a print action. Historical results completed before verification was introduced are labeled when verification metadata is absent. This is a browser print view, not a certified laboratory report, signed document, or independently stored PDF. The two-person review boundary follows the [WHO laboratory quality stepwise implementation guidance](https://extranet.who.int/lqsi/content/start-reviewing-and-authorizing-results-ie-validation-results-releasing-report).
