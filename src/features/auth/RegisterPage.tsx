import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { apiClient } from '../../api/client';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'owner' ? 'owner' : 'customer';

  const [role, setRole] = useState<'customer' | 'owner'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const endpoint = role === 'owner' ? '/auth/register/owner' : '/auth/register/customer';

    try {
      await apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
        }),
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthShell mode="register">
        <div className="auth-success">
          <h1 className="auth-title">
            Check your <em>inbox</em>
          </h1>
          <p className="auth-sub">
            We've sent a verification link to <strong>{email}</strong>. Verify your email to activate your account.
          </p>
          <Link to="/login" className="auth-submit">
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="register">
      <h1 className="auth-title">
        Create your <em>account</em>
      </h1>
      <p className="auth-sub">Join as a driver looking for help, or as a workshop owner.</p>

      <div className="auth-roles" role="group" aria-label="Account type">
        <button
          type="button"
          className={`auth-role${role === 'customer' ? ' is-active' : ''}`}
          onClick={() => setRole('customer')}
        >
          Driver
        </button>
        <button
          type="button"
          className={`auth-role${role === 'owner' ? ' is-active' : ''}`}
          onClick={() => setRole('owner')}
        >
          Garage owner
        </button>
      </div>

      {errorMsg && (
        <div className="auth-alert" role="alert">
          {errorMsg}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label" htmlFor="register-name">
            Full name
          </label>
          <div className="auth-field">
            <UserRound size={18} strokeWidth={1.6} />
            <input
              id="register-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Maya Chen"
            />
          </div>
        </div>

        <div>
          <label className="auth-label" htmlFor="register-email">
            Email address
          </label>
          <div className="auth-field">
            <Mail size={18} strokeWidth={1.6} />
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. maya@yourmail.com"
            />
          </div>
        </div>

        <div>
          <label className="auth-label" htmlFor="register-password">
            Password (minimum 8 characters)
          </label>
          <div className="auth-field">
            <Lock size={18} strokeWidth={1.6} />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
            />
            <button
              type="button"
              className="auth-reveal"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.6} /> : <Eye size={18} strokeWidth={1.6} />}
            </button>
          </div>
        </div>

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : `Register as ${role === 'owner' ? 'garage owner' : 'driver'}`}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in &rarr;</Link>
      </p>
    </AuthShell>
  );
};
