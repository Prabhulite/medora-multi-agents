import { AppDataSource } from '../../config/data-source.js';

// Call from one scheduled worker. The notification uniqueness constraint makes repeated runs safe.
export async function runInternalReminders(now = new Date()): Promise<number> {
  const settings: Array<{ recipient_id: number; appointment_enabled: number; appointment_hours: number; prescription_enabled: number; prescription_days: number }> = await AppDataSource.query('SELECT * FROM automation_settings WHERE appointment_enabled = 1 OR prescription_enabled = 1');
  let created = 0;
  for (const setting of settings) {
    if (setting.appointment_enabled) {
      const appointments: Array<{ id: number; appointment_number: string; appointment_date: string; appointment_time: string }> = await AppDataSource.query("SELECT a.id, a.appointment_number, a.appointment_date, a.appointment_time FROM appointments a JOIN doctor_master d ON d.id = a.doctor_id WHERE d.account_user_id = ? AND a.status IN ('booked', 'confirmed') AND TIMESTAMP(a.appointment_date, a.appointment_time) BETWEEN ? AND DATE_ADD(?, INTERVAL ? HOUR)", [setting.recipient_id, now, now, setting.appointment_hours]);
      for (const appointment of appointments) {
        const result = await AppDataSource.query("INSERT IGNORE INTO user_notifications (recipient_id, kind, source_id, title, message, route) VALUES (?, 'appointment_reminder', ?, 'Upcoming appointment', ?, '/appointments')", [setting.recipient_id, appointment.id, `Appointment ${appointment.appointment_number} is scheduled for ${appointment.appointment_date} ${appointment.appointment_time}.`]);
        created += result.affectedRows || 0;
      }
    }
    if (setting.prescription_enabled) {
      const prescriptions: Array<{ id: number }> = await AppDataSource.query("SELECT p.id FROM prescriptions p JOIN clinical_encounters e ON e.id = p.encounter_id JOIN doctor_master d ON d.id = e.doctor_id WHERE d.account_user_id = ? AND p.status = 'active' AND p.created_at BETWEEN DATE_SUB(?, INTERVAL ? DAY) AND ?", [setting.recipient_id, now, setting.prescription_days, now]);
      for (const prescription of prescriptions) {
        const result = await AppDataSource.query("INSERT IGNORE INTO user_notifications (recipient_id, kind, source_id, title, message, route) VALUES (?, 'prescription_follow_up', ?, 'Prescription follow-up', 'Review this active prescription and follow up with the patient as needed.', '/prescriptions')", [setting.recipient_id, prescription.id]);
        created += result.affectedRows || 0;
      }
    }
  }
  return created;
}
