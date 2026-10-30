import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { apiClient, setAccessToken, setStoredRefreshToken } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AuthTokens, User } from '../../api/types';

export const AdminLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser, login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isNonAdminAttempt, setIsNonAdminAttempt] = useState(false);

  const nextUrl = searchParams.get('next');

  // If already authenticated as ADMIN, redirect to console
  if (currentUser && currentUser.role === 'ADMIN') {
    const destination = nextUrl && nextUrl.startsWith('/admin') ? nextUrl : '/admin';
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setIsNonAdminAttempt(false);

    try {
      const tokenData = await apiClient<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Verify the authenticated role
      setAccessToken(tokenData.access_token);
      const user = await apiClient<User>('/users/me');

      if (user.role !== 'ADMIN') {
        // Revoke token state for non-admin attempts on admin portal
        setAccessToken(null);
        setStoredRefreshToken(null);
        setIsNonAdminAttempt(true);
        setErrorMsg(
          'Access denied. This login portal is strictly reserved for platform administrators. Customer and workshop accounts must sign in via the standard login page.'
        );
        return;
      }

      await login(tokenData, user);

      const target = nextUrl && nextUrl.startsWith('/admin') ? nextUrl : '/admin';
      navigate(target);
    } catch (err: unknown) {
      setAccessToken(null);
      setStoredRefreshToken(null);
      if (err instanceof Error) {
        if (err.message.includes('ACCOUNT_SUSPENDED')) {
          setErrorMsg('This administrator account has been suspended.');
        } else if (err.message.includes('EMAIL_NOT_VERIFIED')) {
          setErrorMsg('Administrator email verification pending.');
        } else {
          setErrorMsg(err.message || 'Invalid administrator credentials.');
        }
      } else {
        setErrorMsg('Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px 16px',
        backgroundColor: 'var(--app-chrome)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--app-sheet)',
          borderRadius: 'var(--radius-sheet)',
          border: '1px solid var(--app-sheet-edge)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
          padding: '40px 32px',
        }}
      >
        {/* Header & Badges */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--rule)',
              color: 'var(--ink)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                display: 'inline-block',
              }}
            />
            Staff & Moderation
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              marginBottom: '6px',
            }}
          >
            Administrator Console
          </h1>
          <p
            style={{
              fontSize: 'var(--step-small)',
              color: 'var(--muted)',
              lineHeight: 1.45,
            }}
          >
            Restricted access portal for moderation, garage verification, and platform oversight.
          </p>
        </div>

        {/* Existing Session Prompt if logged in with wrong role */}
        {currentUser && currentUser.role !== 'ADMIN' && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--status-unavail-bg)',
              color: 'var(--status-unavail-ink)',
              fontSize: 'var(--step-small)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              lineHeight: 1.4,
            }}
          >
            Currently logged in as <strong>{currentUser.email}</strong> ({currentUser.role}).
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => logout()}
                style={{
                  textDecoration: 'underline',
                  fontWeight: 600,
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Sign out to switch to an administrator account
              </button>
            </div>
          </div>
        )}

        {/* Security / Audit Notice */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            color: 'var(--ink-secondary)',
            marginBottom: '20px',
            lineHeight: 1.4,
          }}
        >
          <strong>Security Notice:</strong> All administrative access attempts and actions are monitored and permanently audited.
        </div>

        {/* Error Callout */}
        {errorMsg && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-ink)',
              fontSize: 'var(--step-small)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              lineHeight: 1.4,
            }}
          >
            <div>{errorMsg}</div>
            {isNonAdminAttempt && (
              <div style={{ marginTop: '10px' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-block',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    color: 'var(--status-danger-ink)',
                  }}
                >
                  Go to Standard User Login &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="admin-email"
              style={{
                display: 'block',
                fontSize: 'var(--step-small)',
                fontWeight: 500,
                color: 'var(--ink)',
                marginBottom: '5px',
              }}
            >
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@findyourmechanic.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-raised)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              style={{
                display: 'block',
                fontSize: 'var(--step-small)',
                fontWeight: 500,
                color: 'var(--ink)',
                marginBottom: '5px',
              }}
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-raised)',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '8px',
              padding: '11px',
              backgroundColor: 'var(--ink)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
              fontSize: 'var(--step-caption)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Console'}
          </button>
        </form>

        {/* Navigation Affordances */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid var(--rule)',
            fontSize: 'var(--step-small)',
            color: 'var(--muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'center',
          }}
        >
          <div>
            Customer or workshop owner?{' '}
            <Link to="/login" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
              Standard user sign in
            </Link>
          </div>
          <div>
            <Link to="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
              &larr; Return to public discovery
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          fontSize: '11px',
          color: 'var(--muted)',
          textAlign: 'center',
        }}
      >
        Find Your Mechanic &bull; Administrative Gateway &bull; Session secured via rotated JWTs
      </div>
    </div>
  );
};

