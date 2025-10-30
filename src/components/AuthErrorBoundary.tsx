import React, { Component, ReactNode } from "react";
import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";

interface Props {
  children: ReactNode;
  onAuthError?: (error: AuthError) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  authError: AuthError | null;
}

export interface AuthError {
  type: 'NETWORK' | 'AUTH_FAILED' | 'TOKEN_EXPIRED' | 'OAUTH_CANCELLED' | 'PERMISSION_DENIED' | 'UNKNOWN';
  message: string;
  originalError?: Error;
  retryable: boolean;
  userFriendlyMessage: string;
}

/**
 * Specialized error boundary for authentication-related errors
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      authError: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const authError = AuthErrorBoundary.categorizeError(error);
    return {
      hasError: true,
      authError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const authError = AuthErrorBoundary.categorizeError(error);
    
    this.setState({
      authError,
    });

    // Call custom error handler if provided
    if (this.props.onAuthError) {
      this.props.onAuthError(authError);
    }

    // Show toast notification for auth errors
    showToast({
      style: Toast.Style.Failure,
      title: "Authentication Error",
      message: authError.userFriendlyMessage,
    });

    // Log error for debugging
    console.error("AuthErrorBoundary caught an authentication error:", error, errorInfo);
  }

  /**
   * Categorize errors into authentication-specific types
   */
  static categorizeError(error: Error): AuthError {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'NETWORK',
        message: error.message,
        originalError: error,
        retryable: true,
        userFriendlyMessage: "Network connection issue. Please check your internet connection and try again.",
      };
    }

    // Token expiry errors
    if (message.includes('expired') || message.includes('invalid token') || message.includes('jwt')) {
      return {
        type: 'TOKEN_EXPIRED',
        message: error.message,
        originalError: error,
        retryable: true,
        userFriendlyMessage: "Your session has expired. Please log in again.",
      };
    }

    // OAuth cancellation
    if (message.includes('cancelled') || message.includes('denied') || message.includes('access_denied')) {
      return {
        type: 'OAUTH_CANCELLED',
        message: error.message,
        originalError: error,
        retryable: true,
        userFriendlyMessage: "Login was cancelled. Please try logging in again.",
      };
    }

    // Permission denied
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('403')) {
      return {
        type: 'PERMISSION_DENIED',
        message: error.message,
        originalError: error,
        retryable: false,
        userFriendlyMessage: "You don't have permission to access this resource. Please contact your administrator.",
      };
    }

    // Authentication failed
    if (message.includes('auth') || message.includes('login') || message.includes('401')) {
      return {
        type: 'AUTH_FAILED',
        message: error.message,
        originalError: error,
        retryable: true,
        userFriendlyMessage: "Authentication failed. Please try logging in again.",
      };
    }

    // Unknown error
    return {
      type: 'UNKNOWN',
      message: error.message,
      originalError: error,
      retryable: true,
      userFriendlyMessage: "An unexpected error occurred. Please try again or contact support.",
    };
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      authError: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private handleLogin = () => {
    // Navigate to login command
    // This will be handled by the parent component or routing logic
    this.handleRetry();
  };

  render() {
    if (this.state.hasError && this.state.authError) {
      const { authError } = this.state;

      const getErrorIcon = (type: AuthError['type']) => {
        switch (type) {
          case 'NETWORK':
            return "🌐";
          case 'TOKEN_EXPIRED':
            return "⏰";
          case 'OAUTH_CANCELLED':
            return "❌";
          case 'PERMISSION_DENIED':
            return "🚫";
          case 'AUTH_FAILED':
            return "🔐";
          default:
            return "⚠️";
        }
      };

      const errorMessage = `# ${getErrorIcon(authError.type)} Authentication Error

${authError.userFriendlyMessage}

**Error Type:** ${authError.type}
**Technical Details:** ${authError.message}

${authError.retryable ? '## What you can do:\n\n- Try the action again\n- Check your internet connection\n- Log in again if your session expired' : '## What you can do:\n\n- Contact your administrator for access\n- Verify you have the correct permissions'}
`;

      return (
        <Detail
          markdown={errorMessage}
          actions={
            <ActionPanel>
              {authError.retryable && (
                <Action
                  title="Try Again"
                  onAction={this.handleRetry}
                  icon="🔄"
                />
              )}
              {(authError.type === 'TOKEN_EXPIRED' || authError.type === 'AUTH_FAILED') && (
                <Action
                  title="Log In Again"
                  onAction={this.handleLogin}
                  icon="🔐"
                />
              )}
              <Action.CopyToClipboard
                title="Copy Error Details"
                content={`Type: ${authError.type}\nMessage: ${authError.message}\nRetryable: ${authError.retryable}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component that wraps components with auth error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  onAuthError?: (error: AuthError) => void,
  onRetry?: () => void
) {
  const WithAuthErrorBoundaryComponent = (props: P) => (
    <AuthErrorBoundary onAuthError={onAuthError} onRetry={onRetry}>
      <WrappedComponent {...props} />
    </AuthErrorBoundary>
  );

  WithAuthErrorBoundaryComponent.displayName = `withAuthErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithAuthErrorBoundaryComponent;
}
