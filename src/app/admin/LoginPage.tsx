import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useAuth } from './admin-context';
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="block text-3xl font-bold tracking-tight text-white">ADEF</span>
          <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--gold)]">
            TVET School · Admin
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
        >
          <div className="mb-5 flex items-center gap-2.5">
            <span className="rounded-lg bg-[var(--gold)]/12 p-2 text-[var(--gold)]">
              <Lock className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h1 className="text-base font-semibold text-[var(--navy)]">Sign in</h1>
              <p className="text-xs text-slate-500">Staff accounts only</p>
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            >
              {formError}
            </div>
          )}

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
                  className={`${inputClass} pr-10`}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-slate-400 hover:text-slate-700 ${focusRing}`}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </Field>
          </div>

          <Button type="submit" loading={submitting} className="mt-6 w-full">
            {submitting ? 'Signing in' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-white/45">
          Lost access? Ask a super administrator to reset your account.
        </p>
      </div>
    </div>
  );
}
