import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { AuthScreen, FormBanner } from './AuthScreen';
import { Button, Field, Spinner, focusRing, inputClass } from './ui';

type Status = 'checking' | 'valid' | 'invalid' | 'done';

/**
 * Step two: choose the new password.
 *
 * The link is verified before the form is shown. Letting someone type a new
 * password twice and only then telling them the link expired is the kind of
 * small cruelty that makes people give up and phone the office.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>('checking');
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [invalidReason, setInvalidReason] = useState<string>('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Choose a new password · ADEF Admin';
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setInvalidReason('That link is missing its token. Copy the whole address from the email.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await api.auth.checkResetToken(token);
        if (!cancelled) {
          setAccount(result);
          setStatus('valid');
        }
      } catch (caught) {
        if (cancelled) return;
        setInvalidReason(
          caught instanceof ApiError
            ? caught.message
            : 'Could not check that link. Try again in a moment.',
        );
        setStatus('invalid');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.auth.resetPassword({ token, password, confirmPassword });
      setStatus('done');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fields ?? {});
        if (!caught.fields) setError(caught.message);
      } else {
        setError('Could not reach the server. Try again in a moment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'checking') {
    return (
      <AuthScreen
        icon={<KeyRound className="h-4 w-4" aria-hidden />}
        title="Checking your link"
        subtitle="One moment"
      >
        <Spinner label="Checking" />
      </AuthScreen>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthScreen
        icon={<ShieldAlert className="h-4 w-4" aria-hidden />}
        title="This link no longer works"
        subtitle="Reset links expire and can only be used once"
        footer={
          <Link to="/admin/login" className="hover:text-white/80">
            ← Back to sign in
          </Link>
        }
      >
        <FormBanner tone="error">{invalidReason}</FormBanner>

        <Link to="/admin/forgot-password">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </AuthScreen>
    );
  }

  if (status === 'done') {
    return (
      <AuthScreen
        icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        title="Password changed"
        subtitle="You can sign in with it now"
      >
        <FormBanner tone="success">
          Your password has been changed and every device has been signed out.
        </FormBanner>

        <Button className="w-full" onClick={() => navigate('/admin/login', { replace: true })}>
          Go to sign in
        </Button>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      icon={<KeyRound className="h-4 w-4" aria-hidden />}
      title="Choose a new password"
      subtitle={account ? `For ${account.email}` : 'For your staff account'}
      footer={
        <Link to="/admin/login" className="hover:text-white/80">
          ← Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate>
        {error && <FormBanner tone="error">{error}</FormBanner>}

        <div className="space-y-4">
          <Field
            label="New password"
            error={fieldErrors.password}
            help="At least 12 characters. A short phrase is easier to remember and harder to guess."
            required
          >
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} pr-9`}
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700 ${focusRing}`}
              >
                {show ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            </div>
          </Field>

          <Field label="Confirm new password" error={fieldErrors.confirmPassword} required>
            <input
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Button type="submit" loading={submitting} className="mt-5 w-full">
          {submitting ? 'Saving' : 'Set new password'}
        </Button>
      </form>
    </AuthScreen>
  );
}
