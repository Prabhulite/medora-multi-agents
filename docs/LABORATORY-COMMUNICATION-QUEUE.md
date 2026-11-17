# Urgent laboratory result communication queue

The laboratory workbench lists released urgent and STAT orders that have no recorded **delivered** result communication. A recorded contact attempt keeps the order in the queue; confirmed delivery removes it. The list is ordered by release time and shows priority, patient MRD/name, test, release time, attempt count, and last attempt time. It excludes result values and contact summaries. Staff with `laboratory.view` can see the queue, and staff with `laboratory.release` can record contact attempts or delivery through the existing append-only communication record. The queue uses server-side pagination and an exact total.

This implements a follow-up view for orders explicitly marked urgent or STAT. Medora does not detect critical values from numerical thresholds, define hospital escalation deadlines, page clinicians automatically, verify that a recipient understood the result, or substitute for direct contact. The laboratory must apply its approved critical-result and urgent-result procedure. [WHO's laboratory quality guidance](https://extranet.who.int/lqsi/node/144) calls for direct notification of urgent results and repeated attempts until the requester is reached; this queue supports documenting that process.

`GET /api/laboratory/communication-queue?page=1&pageSize=25` requires `laboratory.view`. `pageSize` is limited to 100.
