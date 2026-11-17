# Radiology finding communication follow-up

The radiology workbench lists performed or reported urgent and STAT studies until a delivered finding communication is recorded. A final report of any priority returns to the queue after an addendum until a new delivery occurs after the latest addendum. Earlier deliveries and attempts do not clear or count toward contact for a correction. Attempts remain pending until delivery is recorded. Staff can search by order, patient MRD/name, or study; the server returns an exact total and up to 100 rows per page.

The queue shows patient identity, study, priority, follow-up start time, attempt count, and last attempt time. It does not include the finding summary or report text. `radiology.view` is required to see the queue; `radiology.update` is required to append a contact attempt or confirmed delivery through the existing communications form. The contact log records recipient, method, actual contact time, summary, and staff attribution. The application cannot verify that a recipient understood a finding or that an external message was received.

This is an operational follow-up list for explicitly urgent/STAT studies and corrected final reports. Medora does not identify critical findings automatically, impose hospital escalation deadlines, or send messages. Staff must follow their approved radiology communication procedure. The [ACR communication practice parameter](https://www.acr.org/-/media/acr/files/practice-parameters/communicationdiag.pdf) informs the report communication boundary; this feature is not a claim of compliance.

`GET /api/radiology/communication-queue?page=1&pageSize=25` requires `radiology.view`.
