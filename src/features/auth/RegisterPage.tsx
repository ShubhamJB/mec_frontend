import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { apiClient } from '../../api/client';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'owner' ? 'owner' : 'customer';

  const [role, setRole] = useState<'customer' | 'owner'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <PublicLayout>
        <div style={{ maxWidth: '480px', margin: '64px auto', padding: '32px 24px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>Registration Submitted</h2>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '24px' }}>
            We've sent a verification link to <strong>{email}</strong>. Please check your inbox and verify your email to activate your account.
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: 'var(--ink)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}
          >
            Go to Sign In
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div style={{ maxWidth: '440px', margin: '64px auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Create an Account</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '24px' }}>
          Join Find Your Mechanic as a vehicle driver or workshop owner
        </p>

        {/* Role toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setRole('customer')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: role === 'customer' ? 'var(--ink)' : 'var(--surface)',
              color: role === 'customer' ? '#fff' : 'var(--ink)',
              fontWeight: role === 'customer' ? 600 : 400,
              fontSize: 'var(--step-caption)',
            }}
          >
            Vehicle Owner (Driver)
          </button>
          <button
            type="button"
            onClick={() => setRole('owner')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: role === 'owner' ? 'var(--ink)' : 'var(--surface)',
              color: role === 'owner' ? '#fff' : 'var(--ink)',
              fontWeight: role === 'owner' ? 600 : 400,
              fontSize: 'var(--step-caption)',
            }}
          >
            Garage Owner
          </button>
        </div>

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
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--step-small)', fontWeight: 500, marginBottom: '4px' }}>
              Full name
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Maya Chen"
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
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. maya@example.com"
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
              Password (minimum 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
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
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}
          >
            {isSubmitting ? 'Creating account...' : `Register as ${role === 'owner' ? 'Garage Owner' : 'Driver'}`}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: 'var(--step-caption)', color: 'var(--muted)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
            Sign in
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
};
