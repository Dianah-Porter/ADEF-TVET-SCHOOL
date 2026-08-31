import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { KeyRound, MailCheck } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { AuthScreen, FormBanner } from './AuthScreen';
import { Button, Field, focusRing, inputClass } from './ui';

/**
 * Step one of the reset flow: ask for the address.
 *
 * The confirmation is deliberately vague about whether the account exists,
 * matching what the API returns — otherwise this page would be a way to test
 * which staff addresses are real.
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Reset your password · ADEF Admin';
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.auth.forgotPassword(email);
      setSent(true);
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

  if (sent) {
    return (
      <AuthScreen
        icon={<MailCheck className="h-4 w-4" aria-hidden />}
        title="Check your email"
        subtitle="If that address is registered, a link is on its way"
        footer={
          <Link to="/admin/login" className="hover:text-white/80">
            ← Back to sign in
          </Link>
        }
      >
        <FormBanner tone="success">
          We have sent a link to <strong>{email}</strong> if it belongs to a staff account. It
          expires in an hour and can only be used once.
        </FormBanner>

        <p className="text-[12px] leading-relaxed text-slate-500">
          Nothing arrived? Check the spam folder, then try again — or ask a super administrator to
          reset the account for you.
        </p>

        <Button variant="secondary" className="mt-4 w-full" onClick={() => setSent(false)}>
          Use a different address
        </Button>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      icon={<KeyRound className="h-4 w-4" aria-hidden />}
      title="Reset your password"
      subtitle="We will email you a link"
      footer={
        <Link to="/admin/login" className="hover:text-white/80">
          ← Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate>
        {error && <FormBanner tone="error">{error}</FormBanner>}

        <Field
          label="Email"
          error={fieldErrors.email}
          help="The address you use to sign in to the dashboard."
          required
        >
          <input
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@adef.rw"
          />
        </Field>

        <Button type="submit" loading={submitting} className="mt-5 w-full">
          {submitting ? 'Sending' : 'Send reset link'}
        </Button>

        <p className="mt-4 text-center">
          <Link
            to="/admin/login"
            className={`rounded text-[12px] text-slate-500 underline-offset-2 hover:text-[var(--orange)] hover:underline ${focusRing}`}
          >
            I remembered it — sign in
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}
