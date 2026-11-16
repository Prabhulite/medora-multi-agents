# Shared Layouts

## `frontend/src/components/layout/AppShell.tsx`
Authenticated application shell. A left expandable sidebar contains Medora icon, menu search, nested route navigation and user/logout controls. The right pane has a 72px header with hamburger and Medora horizontal logo, followed by a pale green content surface with `<Outlet />`. Sidebar expanded width is 260px. Navigation uses green active states and inline SVG icons.

Key source details: imports `medora-horizontal.png`, `AppShell.css`, `Button`, `Modal`, auth context and menu icon mapping. Sidebar classes include `app-shell__sidebar`, `app-shell__nav`, `app-shell__nav-link`, `app-shell__nav-children`, `app-shell__sidebar-footer`; main classes include `app-shell__header`, `app-shell__content`.
