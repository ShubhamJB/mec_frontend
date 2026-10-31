import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { apiClient } from '../../api/client';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState<string | null>(token ? 'Verifying your token...' : 'No verification token provided.');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const verifyToken = useCallback(async (tok: string) => {
    try {
      await apiClient('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: tok }),
      });
      setStatus('success');
      setMessage('Your email address has been verified successfully. You may now sign in.');
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Invalid or expired verification token.');
    }
  }, []);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token, verifyToken]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    setResendNotice(null);

    try {
      await apiClient('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail }),
      });
      setResendNotice('If an unverified account matches that address, a new verification link has been sent.');
    } catch {
      setResendNotice('If an unverified account matches that address, a new verification link has been sent.');
    } finally {
      setResending(false);
    }
  };

  return (
    <PublicLayout>
      <div style={{ maxWidth: '440px', margin: '64px auto', padding: '32px 24px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '12px' }}>Email Verification</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '24px' }}>
          {message}
        </p>

        {status === 'success' && (
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '10px 18px',
              backgroundColor: 'var(--ink)',
              color: 'var(--on-dark)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}
          >
            Sign In Now
          </Link>
        )}

        {status === 'error' && (
          <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '20px', marginTop: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Request a new verification link</h2>
            <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="email"
                required
                placeholder="Enter your registered email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-raised)',
                }}
              />
              <button
                type="submit"
                disabled={resending}
                style={{
                  padding: '8px 14px',
                  backgroundColor: 'var(--ink)',
                  color: 'var(--on-dark)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500,
                }}
              >
                {resending ? 'Sending...' : 'Resend Link'}
              </button>
            </form>
            {resendNotice && (
              <p style={{ fontSize: 'var(--step-small)', color: 'var(--accent)', marginTop: '12px' }}>
                {resendNotice}
              </p>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
