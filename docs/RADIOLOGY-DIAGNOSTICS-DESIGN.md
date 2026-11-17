# Radiology Diagnostics Vertical Slice

View-only access to a performed study does not expose draft report text or impression through the order list or worklist. Contact history shows outcome, recipient, method, time, and attribution before finalization, but withholds finding summary and notes from view-only staff. Users with `radiology.update` can see draft content for reporting and direct communication; finalized content is visible to `radiology.view`.

Cancellation is available to `radiology.cancel` for ordered or scheduled studies only. It records reason, actor, and time, preserves booking details, writes a patient audit event, and releases the reserved scanner slot by changing the order status. A linked active doctor receives an in-app notice. Cancellation never removes a performed study or final report.

## Scope

Provide an imaging modality catalog, patient-linked radiology orders, priority and clinical notes, and a report workflow from ordered through performed/reported.

## Invariants and security

- Orders reference existing patients and active imaging modalities.
- Radiology order numbers use the transactional shared sequence service.
- Cancelled orders cannot receive reports.
- Final reports cannot be overwritten. Only finalized reports can receive append-only addenda with a reason, author, and timestamp.
- A linked active referring doctor receives an in-app notification when a final report or addendum is recorded. Notification text excludes clinical findings.
- After a study is performed, staff can record an attempted or delivered nonroutine finding communication. Each append-only entry captures the finding summary, recipient, method, contact time, recorder, and optional note. A delivered entry is a staff assertion of actual delivery; the application does not infer it from a notification.
- Pending orders can be booked for a future study time. Rescheduling requires a reason; every booking change is recorded with the previous time and actor. Performed and finalized orders cannot be rescheduled.
- Authorized resource managers can register and activate/deactivate scanners or rooms for a modality. A booking can assign one resource and duration. The scheduler locks that resource and rejects overlapping scheduled studies, including concurrent requests. Deactivation is blocked while future bookings remain. Bookings without a resource are allowed for existing workflows and do not receive collision protection.
- Report text and impression are validated and attributed to the reporting user.
- All endpoints require authentication and radiology-specific permissions.

## API

- `GET /api/radiology/modalities`
- `GET /api/radiology/orders`
- `POST /api/radiology/orders`
- `PATCH /api/radiology/orders/:id/report`
- `GET /api/radiology/orders/:id/addenda`
- `POST /api/radiology/orders/:id/addenda`
- `GET /api/radiology/orders/:id/communications`
- `POST /api/radiology/orders/:id/communications`
- `GET /api/radiology/orders/:id/schedule-events`
- `PATCH /api/radiology/orders/:id/schedule`
- `GET /api/radiology/resources`
- `POST /api/radiology/resources` (`radiology.resources.manage`)
- `PATCH /api/radiology/resources/:id/status` (`radiology.resources.manage`)

The UI is available at `/radiology` with a searchable worklist, scheduling and history, resource management, imaging-order form, report-entry form, final-report addendum history, and communication history. Resource collision checks cover booked studies in Medora only; they do not account for maintenance windows, emergency use, staff availability, or external scheduling systems. Staff must follow their hospital's urgent escalation procedure outside the app. The system does not detect critical findings, enforce contact deadlines, verify recipients, or automate escalation. Clinician attestation, image management, and RIS/PACS integration remain future work. The communication fields follow the [ACR practice parameter for communication of diagnostic imaging findings](https://gravitas.acr.org/PPTS/GetDocumentView?docId=74); this is not a claim of compliance.
