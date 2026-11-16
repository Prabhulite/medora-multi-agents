import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { api, getErrorMessage } from '../../lib/api';
import { useAuth } from './AuthContext';

export function AccountSecurityPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      logout(); navigate('/login', { replace: true });
    } catch (err) { setError(getErrorMessage(err, 'Unable to change password')); }
    finally { setSaving(false); }
  };
  return <div style={{ maxWidth: 540 }}><PageHeader title="Account security" subtitle={`Change the password for ${user?.username || 'your account'}.`} />{error && <Alert tone="error">{error}</Alert>}<form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 18, padding: 24, background: '#fff', borderRadius: 12 }}><Input label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><Input label="New password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><Input label="Confirm new password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><p>Your sessions will end after the password changes. Sign in again with the new password.</p><Button type="submit" loading={saving}>Change password</Button></form></div>;
}
