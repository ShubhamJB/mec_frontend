import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { useToast } from '../../components/ToastProvider';
import { apiClient, setAccessToken, setStoredRefreshToken } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AuthTokens, User, UserRole } from '../../api/types';

const homeFor = (role: UserRole) =>
  role === 'ADMIN' ? '/admin' : role === 'GARAGE_OWNER' ? '/owner' : '/find';

const safeNext = (next: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : null;

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user: currentUser, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const nextUrl = safeNext(searchParams.get('next'));

  if (currentUser) {
    return <Navigate to={homeFor(currentUser.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setUnverifiedEmail(null);

    try {
      const tokenData = await apiClient<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAccessToken(tokenData.access_token);
      const user = await apiClient<User>('/users/me');

      await login(tokenData, user);

      const adminOnly = nextUrl?.startsWith('/admin');
      const ownerOnly = nextUrl?.startsWith('/owner');
      const nextAllowed =
        nextUrl &&
        (!adminOnly || user.role === 'ADMIN') &&
        (!ownerOnly || user.role === 'GARAGE_OWNER');
      navigate(nextAllowed ? nextUrl : homeFor(user.role));
    } catch (err: unknown) {
      setAccessToken(null);
      setStoredRefreshToken(null);
      if (err instanceof Error) {
        setErrorMsg(err.message);
        if (err.message.includes('EMAIL_NOT_VERIFIED') || (err as { code?: string }).code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(email);
        }
      } else {
        setErrorMsg('Invalid email or password');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    try {
      await apiClient('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      showToast('Verification link resent. Please check your inbox.', 'success');
    } catch {
      showToast('Unable to resend verification at this time. Please try again shortly.', 'error');
    }
  };

  return (
    <AuthShell mode="login">
      <h1 className="auth-title">
        Welcome <em>back</em>
      </h1>
      <p className="auth-sub">Sign in to find a mechanic or manage your workshop.</p>

      {errorMsg && (
        <div className="auth-alert" role="alert">
          {errorMsg}
          {unverifiedEmail && (
            <div>
              <button type="button" onClick={handleResendVerification}>
                Resend verification email
              </button>
            </div>
          )}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label" htmlFor="login-email">
            Email address
          </label>
          <div className="auth-field">
            <Mail size={18} strokeWidth={1.6} />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="auth-label" htmlFor="login-password">
            Password
          </label>
          <div className="auth-field">
            <Lock size={18} strokeWidth={1.6} />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New here? <Link to="/register">Create an account &rarr;</Link>
      </p>
    </AuthShell>
  );
};
