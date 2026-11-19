# Internal automation integration

The settings page is available from Management > Automation. Its authenticated API is mounted at `/api/automation/settings`. Migration `1795200000000-AutomationSettings` creates the settings table and must be applied to each deployed database. The backend runs the reminder scan on startup and every hour.

The settings are per staff user and disabled by default. Appointment reminders apply to the assigned doctor's linked account. Prescription reminders apply to active prescriptions whose encounter doctor has a linked account. They appear only in the existing Medora notification center. No patient message or external delivery is performed.
