# Laboratory Diagnostics Vertical Slice

## Scope

Provide a laboratory test catalog, patient-linked investigation orders, and a controlled workflow from order and specimen collection through draft result, independent verification, and release.

## Invariants and security

- Orders reference active, unmerged patients, active laboratory tests, and an active referring doctor when one is selected.
- Order entry uses a bounded, minimum-field patient lookup by MRD or name under `laboratory.create`; it returns only patient ID, MRD number, and display name, and excludes inactive or merged records.
- Order entry can attach an active referring doctor selected through a bounded lookup by name, code, or registration number; a linked active doctor account receives release and correction notices.
- The requested priority and clinical notes are stored on the order and remain available in the worklist response.
- Order numbers are allocated transactionally through the shared number sequence service.
- Cancelled orders cannot receive results.
- Result values, units, ranges, and notes are validated server-side and attributed to the user who entered them.
- Drafts can be edited until verified. Verification requires a separate authorized staff account and explicit patient/specimen and quality-control review attestations. Verified results cannot be edited through the draft endpoint. Only an authorized release action makes the result completed and notifies a linked active referring doctor.
- Released values remain unchanged. Staff with `laboratory.amend` can append a dated correction with reason and author; the linked active referring doctor receives an in-app notice without result values. Viewers see all addenda alongside the original result.
- Users with `laboratory.view` alone see completed values; unreleased values and notes are masked. Staff with update, verify, or release permission can review drafts.
- This is an internal authorization workflow. Staff must follow their laboratory's approved SOP, including actual QC review, urgent-result escalation, and any legal signature requirements. The system does not validate analyzer output, QC evidence, or accreditation compliance.
- All endpoints require authentication and laboratory-specific permissions.

## API

- `GET /api/laboratory/tests`
- `GET /api/laboratory/patients?search=...` (`laboratory.create`)
- `GET /api/laboratory/doctors?search=...` (`laboratory.create`)
- `GET /api/laboratory/orders`
- `POST /api/laboratory/orders`
- `PATCH /api/laboratory/orders/:id/collect`
- `PATCH /api/laboratory/orders/:id/result`
- `POST /api/laboratory/orders/:id/verify` (`laboratory.verify`)
- `POST /api/laboratory/orders/:id/release` (`laboratory.release`)
- `GET /api/laboratory/orders/:id/addenda` (`laboratory.view`, released orders only)
- `POST /api/laboratory/orders/:id/addenda` (`laboratory.amend`, released orders only)

The UI is available at `/laboratory` and supports order creation, searchable worklist review, draft entry, verification, release, addenda, and read-only review of released results. Released results have a print layout containing patient and order identifiers, investigation, specimen, original result, addenda, reference range, and review/release times where recorded. Printing is disabled until addenda load, so a known correction is not silently omitted. Verified drafts do not expose a print action. Historical results completed before verification was introduced are labeled when verification metadata is absent. This is a browser print view, not a certified laboratory report, signed document, or independently stored PDF. The two-person review boundary follows the [WHO laboratory quality stepwise implementation guidance](https://extranet.who.int/lqsi/content/start-reviewing-and-authorizing-results-ie-validation-results-releasing-report).
