# Backend Smoke Tests

Run `npm run smoke` from `backend/` after starting the API.

The smoke test uses the configured super-admin environment credentials and verifies health, authentication, protected menus, pharmacy inventory, laboratory tests, radiology modalities, operations JSON, audit logs, and the operations CSV export. It does not create or modify clinical records.

`npm run browser:smoke` additionally verifies the Operations dashboard Laboratory queue and its safe empty state. When the configured local database has a pending laboratory order, it follows the queue link and verifies that the worklist receives the selected order number in both the URL and search input.

`npm run browser:smoke:ci` first creates an idempotent, disposable pending laboratory-order fixture. It then requires the Operations queue drill-through scenario, so CI always verifies the selected order reaches the Laboratory worklist search.

For workflow coverage, run `npm run test:integration` from `backend/` with MySQL available. This command creates a uniquely named `medora_it_*` database, runs every migration, starts the API on a temporary local port, and exercises staff duty scheduling and overlap prevention, ambulance dispatch with driver registration and trip progression, operating theatre scheduling, emergency triage, inpatient admission and transfer, nursing care plans, medication administration, pharmacy fulfillment, charge master pricing and inactive charge rejection, insurance claim submission, decision, payment and settlement, billing refunds and patient ledger totals, laboratory collection and result completion, and password rotation. It drops that unique database in a `finally` block, including when an assertion fails. The configured MySQL user needs `CREATE DATABASE` and `DROP DATABASE` privileges. The working `DB_NAME` database is never selected by this test.
