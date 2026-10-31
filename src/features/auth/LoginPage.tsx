import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { apiClient, setAccessToken, setStoredRefreshToken } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AuthTokens, User } from '../../api/types';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const nextUrl = searchParams.get('next');

  // If already logged in, redirect to respective home
  if (currentUser) {
    if (currentUser.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (currentUser.role === 'GARAGE_OWNER') {
      return <Navigate to="/owner" replace />;
    }
    return <Navigate to="/find" replace />;
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

      // Hydrate profile to verify user role
      setAccessToken(tokenData.access_token);
      const user = await apiClient<User>('/users/me');

      if (user.role === 'ADMIN') {
        // Disallow admin sign-in through public customer/owner login page
        setAccessToken(null);
        setStoredRefreshToken(null);
        setErrorMsg('Access restricted to customer and workshop accounts.');
        return;
      }

      await login(tokenData, user);

      if (nextUrl) {
        navigate(nextUrl);
      } else if (user.role === 'GARAGE_OWNER') {
        navigate('/owner');
      } else {
        navigate('/find');
      }
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
      alert('Verification link resent. Please check your inbox.');
    } catch {
      alert('Unable to resend verification at this time. Please try again shortly.');
    }
  };

  return (
    <PublicLayout>
      <div style={{ maxWidth: '420px', margin: '64px auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Sign In</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '24px' }}>
          Access your mechanic account or workshop dashboard
        </p>

        {errorMsg && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-ink)',
              fontSize: 'var(--step-small)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
            {unverifiedEmail && (
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 500 }}
                >
                  Resend verification email
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--step-small)', fontWeight: 500, marginBottom: '4px' }}>
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--step-small)', fontWeight: 500, marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '8px',
              padding: '10px',
              backgroundColor: 'var(--ink)',
              color: 'var(--on-dark)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: 'var(--step-caption)', color: 'var(--muted)', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
            Register here
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
};
