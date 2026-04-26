import { Component, ErrorInfo, ReactNode } from 'react';
import { Colors } from '../constants/theme';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: Colors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          padding: 32,
        }}>
          <div style={{ color: Colors.red, fontSize: 18, fontWeight: 700 }}>Something went wrong</div>
          <pre style={{
            background: Colors.surface,
            color: Colors.textSecondary,
            borderRadius: 10,
            padding: 16,
            fontSize: 12,
            maxWidth: 600,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: `1px solid ${Colors.border}`,
              background: Colors.surface,
              color: Colors.text,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
