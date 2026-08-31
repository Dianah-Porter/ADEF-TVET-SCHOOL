import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, UserCircle } from 'lucide-react';
import { ApiError } from '../lib/api';
import { PageHeader } from './AdminLayout';
import { useAuth, useToast } from './admin-context';
import {
  Badge,
  Button,
  Field,
  Panel,
  PanelHeader,
  focusRing,
  initialsOf,
  inputClass,
} from './ui';

/**
 * The signed-in user's own account.
 *
 * Two separate forms rather than one: changing your name and changing your
 * password have different consequences — the second ends your other sessions —
 * and mixing them into a single Save button would hide that.
 */
export function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { notify } = useToast();

  useEffect(() => {
    document.title = 'Your profile · ADEF Admin';
  }, []);

  if (!user) return null;

  return (
    <>
      <PageHeader
        title="Your profile"
        description="Your details and the password you use to sign in."
      />

      <div className="space-y-4">
        <Panel>
          <div className="flex items-center gap-3.5 p-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-lg font-semibold text-white"
              aria-hidden
            >
              {initialsOf(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-[13px] text-slate-500">{user.email}</p>
              <div className="mt-1.5">
                <Badge tone={user.role === 'SUPER_ADMIN' ? 'info' : 'neutral'}>
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {user.role === 'SUPER_ADMIN' ? 'Super administrator' : 'Editor'}
                </Badge>
              </div>
            </div>
          </div>
        </Panel>

        <ProfileForm
          initial={{ name: user.name, email: user.email }}
          onSave={updateProfile}
          notify={notify}
        />

        <PasswordForm onSave={changePassword} notify={notify} />
      </div>
    </>
  );
}

type Notify = (message: string, tone?: 'success' | 'error' | 'info') => void;

function ProfileForm({
  initial,
  onSave,
  notify,
}: {
  initial: { name: string; email: string };
  onSave: (patch: { name?: string; email?: string }) => Promise<void>;
  notify: Notify;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = form.name !== initial.name || form.email !== initial.email;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      // Only what changed is sent: submitting an unchanged email would make
      // the API check it for uniqueness against every other account for no
      // reason.
      await onSave({
        ...(form.name !== initial.name ? { name: form.name } : {}),
        ...(form.email !== initial.email ? { email: form.email } : {}),
      });
      notify('Profile updated.', 'success');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fields ?? {});
        if (!caught.fields) notify(caught.message, 'error');
      } else {
        notify('Could not save your profile.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Your details"
        description="Your name appears beside anything you publish."
      />

      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.name} required>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputClass}
              autoComplete="name"
            />
          </Field>

          <Field
            label="Email"
            error={errors.email}
            help="This is also the address you sign in with."
            required
          >
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={inputClass}
              autoComplete="email"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
          {dirty && <span className="text-[12px] text-slate-500">Unsaved changes</span>}
          <Button type="submit" loading={saving} disabled={!dirty}>
            <UserCircle className="h-3.5 w-3.5" aria-hidden />
            Save details
          </Button>
        </div>
      </form>
    </Panel>
  );
}

const EMPTY_PASSWORDS = { currentPassword: '', password: '', confirmPassword: '' };

function PasswordForm({
  onSave,
  notify,
}: {
  onSave: (input: {
    currentPassword: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  notify: Notify;
}) {
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  const complete =
    form.currentPassword !== '' && form.password !== '' && form.confirmPassword !== '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      await onSave(form);
      setForm(EMPTY_PASSWORDS);
      notify('Password changed. Your other devices have been signed out.', 'success');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fields ?? {});
        if (!caught.fields) notify(caught.message, 'error');
      } else {
        notify('Could not change your password.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Password"
        description="Changing it signs out every other device, but keeps you signed in here."
      />

      <form onSubmit={submit} noValidate>
        <div className="space-y-4 p-4">
          <Field label="Current password" error={errors.currentPassword} required>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
              className={inputClass}
              autoComplete="current-password"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="New password"
              error={errors.password}
              help="At least 12 characters. A short phrase is easier to remember and harder to guess."
              required
            >
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className={`${inputClass} pr-9`}
                  autoComplete="new-password"
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

            <Field label="Confirm new password" error={errors.confirmPassword} required>
              <input
                type={show ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                className={inputClass}
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50/60 px-4 py-3">
          <Button type="submit" loading={saving} disabled={!complete}>
            <KeyRound className="h-3.5 w-3.5" aria-hidden />
            Change password
          </Button>
        </div>
      </form>
    </Panel>
  );
}
