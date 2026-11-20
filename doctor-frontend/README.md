# Doctor frontend

This folder contains the doctor entry point, routes, and layout in `src/`. It imports reusable features from `../frontend/src` and builds into `dist/`.

Local URL: `http://127.0.0.1:5165/doctor`. Start with `npm --prefix doctor-frontend run dev`.

Only doctor workspace, prescription, patient chart, notification, and account routes are included in this build. Configure `VITE_ADMIN_PORTAL_URL` to link to the separate admin origin in deployment.
