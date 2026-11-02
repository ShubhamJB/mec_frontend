import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          maxWidth: '560px',
          margin: '96px auto',
          padding: '32px',
          backgroundColor: 'var(--app-sheet)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h2 style={{ marginBottom: '8px' }}>Something went wrong</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
          This page failed to display. Reloading usually fixes it; if it keeps happening, tell the
          team what you were doing.
        </p>
        <pre
          style={{
            fontSize: 'var(--step-small)',
            color: 'var(--status-danger-ink)',
            whiteSpace: 'pre-wrap',
            marginBottom: '20px',
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--accent)',
            color: 'var(--on-dark)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          Reload page
        </button>
      </div>
    );
  }
}
