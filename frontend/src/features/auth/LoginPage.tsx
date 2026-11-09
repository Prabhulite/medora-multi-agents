import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from './AuthContext';
import './LoginPage.css';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
    const next: { username?: string; password?: string } = {};
    if (!username.trim()) next.username = 'Username is required';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__glow login-page__glow--one" />
      <div className="login-page__glow login-page__glow--two" />

      <section className="login-page__panel">
        <form className="login-card" onSubmit={onSubmit} noValidate>
          <div className="login-card__header">
            <img src="/assets/logos/medora-icon.png" alt="Medora" />
            <div>
              <h2>Welcome back</h2>
              <p>Enter your credentials to continue</p>
            </div>
          </div>

          {formError ? <Alert tone="error">{formError}</Alert> : null}

          <Input
            label="Username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={errors.username}
            placeholder="Enter username"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            placeholder="Enter password"
          />

          <Button type="submit" size="lg" loading={submitting} className="login-card__submit">
            Sign in
          </Button>
        </form>
      </section>
    </div>
  );
}
