# Extractable Components

## AppShell
- Source: `frontend/src/components/layout/AppShell.tsx`
- Category: layout
- Description: Expandable Medora sidebar, header, nested navigation and user controls.
- Extractable props: none; active state comes from router.
- Hardcoded: Medora logos, menu labels, icons, spacing and colors.

## PageHeader
- Source: `frontend/src/components/ui/PageHeader.tsx`
- Category: basic
- Description: Page title/subtitle with right-side actions.
- Extractable props: title, subtitle, actions.

## Table
- Source: `frontend/src/components/ui/Table.tsx`
- Category: basic
- Description: Searchable, refreshable data table.
- Extractable props: columns, rows, searchPlaceholder.

## Badge
- Source: `frontend/src/components/ui/Badge.tsx`
- Category: basic
- Description: Status and role pill.
- Extractable props: tone, icon, children.
