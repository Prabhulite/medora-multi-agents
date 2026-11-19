import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, InputNumber, Space, Switch, Typography } from 'antd';
import { api, getErrorMessage } from '../../lib/api';

type Settings = { appointmentEnabled: boolean; appointmentHours: number; prescriptionEnabled: boolean; prescriptionDays: number };

export default function AutomationSettingsPage() {
  const [form] = Form.useForm<Settings>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ data: Settings }>('/automation/settings')
      .then((response) => form.setFieldsValue(response.data.data))
      .catch((cause) => setError(getErrorMessage(cause, 'Could not load automation settings')))
      .finally(() => setLoading(false));
  }, [form]);

  async function save(values: Settings) {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/automation/settings', values);
      setSaved(true);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not save automation settings'));
    } finally {
      setSaving(false);
    }
  }

  return <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
    <Typography.Title level={2}>Automation settings</Typography.Title>
    <Typography.Paragraph type="secondary">Create reminders in Medora's staff notification center. These settings do not contact patients.</Typography.Paragraph>
    {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
    {saved && <Alert type="success" message="Settings saved" showIcon style={{ marginBottom: 16 }} />}
    <Form form={form} layout="vertical" onFinish={save} disabled={loading || saving} initialValues={{ appointmentEnabled: false, appointmentHours: 24, prescriptionEnabled: false, prescriptionDays: 3 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card title="Appointment reminders">
          <Typography.Paragraph>Notify the assigned doctor about upcoming booked or confirmed appointments.</Typography.Paragraph>
          <Form.Item name="appointmentEnabled" label="Enable appointment reminders" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="appointmentHours" label="Notify within this many hours" rules={[{ required: true }]}><InputNumber min={1} max={168} style={{ width: 180 }} /></Form.Item>
        </Card>
        <Card title="Prescription follow-up">
          <Typography.Paragraph>Notify the prescribing doctor to review an active prescription and follow up with the patient as needed.</Typography.Paragraph>
          <Form.Item name="prescriptionEnabled" label="Enable prescription follow-up" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="prescriptionDays" label="Review prescriptions from the past days" rules={[{ required: true }]}><InputNumber min={1} max={30} style={{ width: 180 }} /></Form.Item>
        </Card>
        <Button type="primary" htmlType="submit" loading={saving}>Save settings</Button>
      </Space>
    </Form>
  </div>;
}
