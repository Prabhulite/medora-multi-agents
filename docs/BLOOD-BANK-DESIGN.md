# Blood bank workflow design

This module tracks individually identified blood components. It is an inventory and traceability workflow, not a clinical compatibility engine or a substitute for licensed blood bank procedures.

## Unit lifecycle

1. A staff member records a component unit with its source identifier, component type, ABO/Rh label, collection and expiry dates, and storage location. New units are **quarantined**.
2. Authorized blood bank staff record screening clearance and its reference, then release a nonexpired unit to **available** stock. A failed or missing screen cannot release stock.
3. Issue requires an identified patient, a documented crossmatch reference, and an authorized staff member. Issue is a one-way transition from **available** to **issued**; it is not a record of transfusion administration.
4. An authorized staff member can discard a quarantined or available unit with a reason. Issued units require a separate return and disposition workflow before any stock reuse; they cannot be silently made available.

Every state change records actor, timestamp, prior and next state, and a reference or reason in an append-only event table. A transaction locks the unit row so concurrent requests cannot issue the same unit twice. Search and list results exclude donor identifying details; those belong in a separately governed donor system. Reports must distinguish quarantined, available, issued, expired, and discarded stock. An expired unit is never issuable even if its stored status is available.

## Boundaries and later work

Required follow-up includes component-specific testing rules, label/barcode printing, temperature monitoring, reservations, adverse reaction records, returns, recall and traceability reports, transfusion administration documentation, and review against the hospital's approved blood bank procedures. ABO/Rh labels alone are insufficient for deciding compatibility. No automatic matching or transfusion recommendation is planned without clinical validation.
