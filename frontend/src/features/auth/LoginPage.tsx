import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import medoraLogo from '../../assets/medora/medora-stacked.png';
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
              passwordToggle
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
