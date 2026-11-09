import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import medoraLogo from '../../assets/medora/medora-stacked.png';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useAuth } from './AuthContext';
import './LoginPage.css';

type LoginField = 'username' | 'password';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { errors, setFieldErrors, clearError, clearAllErrors } = useFieldErrors<LoginField>();
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    clearAllErrors();

    const nextErrors: Partial<Record<LoginField, string>> = {};
    if (!username.trim()) nextErrors.username = 'Username is required';
    if (!password) nextErrors.password = 'Password is required';
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

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
      <div className="login-shell">
        <section className="login-shell__brand">
          <img src={medoraLogo} alt="Medora" className="login-shell__logo" />
          <h2>Welcome back!</h2>
          <p>
            Healing begins with connection. Sign in to continue seamless care,
            trusted collaboration, and stronger outcomes across every patient journey.
          </p>
        </section>

        <section className="login-shell__form">
          <form className="login-form" onSubmit={onSubmit} noValidate>
            <h1>Sign in</h1>
            <p className="login-form__subtitle">Enter your credentials to continue</p>

            {formError ? <Alert tone="error">{formError}</Alert> : null}

            <Input
              label="Username"
              name="username"
              fieldKey="username"
              autoComplete="username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                clearError('username');
              }}
              error={errors.username}
              placeholder="Enter username"
            />

            <Input
              label="Password"
              name="password"
              fieldKey="password"
              type="password"
              passwordToggle
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError('password');
              }}
              error={errors.password}
              placeholder="Enter password"
            />

            <Button type="submit" size="lg" loading={submitting} className="login-form__submit">
              Sign in
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
