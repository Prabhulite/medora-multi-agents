# Admin frontend

This folder contains the admin entry point, routes, and layout in `src/`. It imports reusable features from `../frontend/src` and builds into `dist/`.

Local URL: `http://localhost:5164`. Start with `npm --prefix admin-frontend run dev`.

Only admin and staff routes are included in this build. Configure `VITE_DOCTOR_PORTAL_URL` to link to the separate doctor origin in deployment.
