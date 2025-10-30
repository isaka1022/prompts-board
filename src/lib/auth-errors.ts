import { showToast, Toast } from "@raycast/api";

export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  OAUTH_CANCELLED = 'OAUTH_CANCELLED',
  OAUTH_FAILED = 'OAUTH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SESSION_INVALID = 'SESSION_INVALID',
  REFRESH_FAILED = 'REFRESH_FAILED',
  LOGOUT_FAILED = 'LOGOUT_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AuthErrorDetails {
  type: AuthErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  requiresReauth: boolean;
  originalError?: Error;
  context?: Record<string, any>;
}

export class AuthError extends Error {
  public readonly type: AuthErrorType;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly requiresReauth: boolean;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(details: AuthErrorDetails) {
    super(details.message);
    this.name = 'AuthError';
    this.type = details.type;
    this.userMessage = details.userMessage;
    this.retryable = details.retryable;
    this.requiresReauth = details.requiresReauth;
    this.originalError = details.originalError;
    this.context = details.context;
  }

  /**
   * Create AuthError from a generic error
   */
  static fromError(error: Error, context?: Record<string, any>): AuthError {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return new AuthError({
        type: AuthErrorType.NETWORK_ERROR,
        message: error.message,
        userMessage: "Network connection issue. Please check your internet connection and try again.",
        retryable: true,
        requiresReauth: false,
        originalError: error,
        context,
      });
    }

    // Token expiry
    if (message.includes('expired') || message.includes('jwt expired')) {
      return new AuthError({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: error.message,
        userMessage: "Your session has expired. Please log in again.",
        retryable: false,
        requiresReauth: true,
        originalError: error,
        context,
      });
    }

    // Invalid token
    if (message.includes('invalid token') || message.includes('malformed') || message.includes('jwt')) {
      return new AuthError({
        type: AuthErrorType.INVALID_TOKEN,
        message: error.message,
        userMessage: "Your session is invalid. Please log in again.",
        retryable: false,
        requiresReauth: true,
        originalError: error,
        context,
      });
    }

    // OAuth cancellation
    if (message.includes('cancelled') || message.includes('access_denied')) {
      return new AuthError({
        type: AuthErrorType.OAUTH_CANCELLED,
        message: error.message,
        userMessage: "Login was cancelled. Please try logging in again.",
        retryable: true,
        requiresReauth: false,
        originalError: error,
        context,
      });
    }

    // Permission denied
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('403')) {
      return new AuthError({
        type: AuthErrorType.PERMISSION_DENIED,
        message: error.message,
        userMessage: "You don't have permission to access this resource. Please contact your administrator.",
        retryable: false,
        requiresReauth: false,
        originalError: error,
        context,
      });
    }

    // OAuth failed
    if (message.includes('oauth') || message.includes('authentication failed')) {
      return new AuthError({
        type: AuthErrorType.OAUTH_FAILED,
        message: error.message,
        userMessage: "Authentication failed. Please try logging in again.",
        retryable: true,
        requiresReauth: false,
        originalError: error,
        context,
      });
    }

    // Session invalid
    if (message.includes('session') || message.includes('401')) {
      return new AuthError({
        type: AuthErrorType.SESSION_INVALID,
        message: error.message,
        userMessage: "Your session is no longer valid. Please log in again.",
        retryable: false,
        requiresReauth: true,
        originalError: error,
        context,
      });
    }

    // Unknown error
    return new AuthError({
      type: AuthErrorType.UNKNOWN_ERROR,
      message: error.message,
      userMessage: "An unexpected error occurred. Please try again or contact support.",
      retryable: true,
      requiresReauth: false,
      originalError: error,
      context,
    });
  }

  /**
   * Show user-friendly toast notification for this error
   */
  async showToast(): Promise<void> {
    const style = this.retryable ? Toast.Style.Animated : Toast.Style.Failure;
    const title = this.requiresReauth ? "Authentication Required" : "Error";

    await showToast({
      style,
      title,
      message: this.userMessage,
    });
  }

  /**
   * Get error icon based on type
   */
  getIcon(): string {
    switch (this.type) {
      case AuthErrorType.NETWORK_ERROR:
        return "🌐";
      case AuthErrorType.TOKEN_EXPIRED:
      case AuthErrorType.SESSION_INVALID:
        return "⏰";
      case AuthErrorType.INVALID_TOKEN:
        return "🔑";
      case AuthErrorType.OAUTH_CANCELLED:
        return "❌";
      case AuthErrorType.OAUTH_FAILED:
        return "🔐";
      case AuthErrorType.PERMISSION_DENIED:
        return "🚫";
      case AuthErrorType.REFRESH_FAILED:
        return "🔄";
      case AuthErrorType.LOGOUT_FAILED:
        return "🚪";
      case AuthErrorType.VALIDATION_ERROR:
        return "⚠️";
      default:
        return "❗";
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      retryable: this.retryable,
      requiresReauth: this.requiresReauth,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }
}

/**
 * Error handler utility functions
 */
export class AuthErrorHandler {
  /**
   * Handle authentication errors with appropriate user feedback
   */
  static async handleError(error: Error | AuthError, context?: Record<string, any>): Promise<AuthError> {
    const authError = error instanceof AuthError ? error : AuthError.fromError(error, context);
    
    // Log error for debugging
    console.error('Authentication error:', authError.toJSON());
    
    // Show user notification
    await authError.showToast();
    
    return authError;
  }

  /**
   * Validate authentication state transition
   */
  static validateStateTransition(
    fromState: 'unauthenticated' | 'authenticating' | 'authenticated' | 'error',
    toState: 'unauthenticated' | 'authenticating' | 'authenticated' | 'error',
    context?: Record<string, any>
  ): { valid: boolean; error?: AuthError } {
    const validTransitions: Record<string, string[]> = {
      unauthenticated: ['authenticating', 'error'],
      authenticating: ['authenticated', 'unauthenticated', 'error'],
      authenticated: ['unauthenticated', 'authenticating', 'error'],
      error: ['unauthenticated', 'authenticating'],
    };

    const allowedStates = validTransitions[fromState] || [];
    
    if (!allowedStates.includes(toState)) {
      const error = new AuthError({
        type: AuthErrorType.VALIDATION_ERROR,
        message: `Invalid state transition from ${fromState} to ${toState}`,
        userMessage: "An internal error occurred. Please try refreshing the application.",
        retryable: true,
        requiresReauth: false,
        context: { fromState, toState, ...context },
      });
      
      return { valid: false, error };
    }

    return { valid: true };
  }

  /**
   * Check if error requires immediate re-authentication
   */
  static requiresReauth(error: Error | AuthError): boolean {
    if (error instanceof AuthError) {
      return error.requiresReauth;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('expired') ||
      message.includes('invalid token') ||
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('session')
    );
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: Error | AuthError): boolean {
    if (error instanceof AuthError) {
      return error.retryable;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }

  /**
   * Get recovery suggestions for an error
   */
  static getRecoverySuggestions(error: Error | AuthError): string[] {
    const authError = error instanceof AuthError ? error : AuthError.fromError(error);
    
    const suggestions: string[] = [];

    switch (authError.type) {
      case AuthErrorType.NETWORK_ERROR:
        suggestions.push(
          "Check your internet connection",
          "Try again in a few moments",
          "Verify that the server is accessible"
        );
        break;
      
      case AuthErrorType.TOKEN_EXPIRED:
      case AuthErrorType.SESSION_INVALID:
        suggestions.push(
          "Log in again to refresh your session",
          "Clear your stored credentials and re-authenticate"
        );
        break;
      
      case AuthErrorType.OAUTH_CANCELLED:
        suggestions.push(
          "Try the login process again",
          "Make sure to complete the OAuth flow in your browser"
        );
        break;
      
      case AuthErrorType.PERMISSION_DENIED:
        suggestions.push(
          "Contact your administrator for access",
          "Verify you have the correct permissions",
          "Check if you're using the right account"
        );
        break;
      
      default:
        suggestions.push(
          "Try the operation again",
          "Restart the application if the problem persists",
          "Contact support if the issue continues"
        );
    }

    return suggestions;
  }
}
