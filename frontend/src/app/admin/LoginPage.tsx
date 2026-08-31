import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useAuth } from './admin-context';
import { AuthScreen, FormBanner } from './AuthScreen';
import { Button, Field, Spinner, focusRing, inputClass } from './ui';

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Sign in · ADEF Admin';
  }, []);

  if (loading) return <Spinner label="Checking your session" />;
  if (user) return <Navigate to="/admin" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await signIn(email, password);
      navigate('/admin', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fields ?? {});
        // Field-level messages are shown beside their inputs; only show a
        // banner when the failure does not belong to a specific field.
        if (!error.fields) setFormError(error.message);
      } else {
        setFormError('Could not reach the server. Check that the API is running.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      icon={<Lock className="h-4 w-4" aria-hidden />}
      title="Sign in"
      subtitle="Staff accounts only"
      footer={
        <Link to="/" className="hover:text-white/80">
          ← Back to the website
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {formError && <FormBanner tone="error">{formError}</FormBanner>}

        <div className="space-y-4">
          <Field label="Email" error={fieldErrors.email} required>
            <input
              type="email"
              name="email"
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="you@adef.rw"
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </Field>

          <Field label="Password" error={fieldErrors.password} required>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} pr-9`}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700 ${focusRing}`}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            </div>
          </Field>
        </div>

        <Button type="submit" loading={submitting} className="mt-5 w-full">
          {submitting ? 'Signing in' : 'Sign in'}
        </Button>

        <p className="mt-4 text-center">
          <Link
            to="/admin/forgot-password"
            className={`rounded text-[12px] text-slate-500 underline-offset-2 hover:text-[var(--orange)] hover:underline ${focusRing}`}
          >
            Forgotten your password?
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}
