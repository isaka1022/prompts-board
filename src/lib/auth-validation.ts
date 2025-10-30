import { User, Session } from "@supabase/supabase-js";
import { AuthError, AuthErrorType } from "./auth-errors";

export type AuthState = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

export interface AuthValidationContext {
  user?: User | null;
  session?: Session | null;
  previousState?: AuthState;
  operation?: string;
  timestamp?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: AuthError;
  warnings?: string[];
}

/**
 * Authentication state validation utilities
 */
export class AuthValidator {
  private static readonly VALID_TRANSITIONS: Record<AuthState, AuthState[]> = {
    unauthenticated: ['authenticating', 'error'],
    authenticating: ['authenticated', 'unauthenticated', 'error'],
    authenticated: ['unauthenticated', 'authenticating', 'error'],
    error: ['unauthenticated', 'authenticating'],
  };

  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate authentication state transition
   */
  static validateStateTransition(
    fromState: AuthState,
    toState: AuthState,
    context: AuthValidationContext = {}
  ): ValidationResult {
    const allowedStates = this.VALID_TRANSITIONS[fromState] || [];
    
    if (!allowedStates.includes(toState)) {
      return {
        valid: false,
        error: new AuthError({
          type: AuthErrorType.VALIDATION_ERROR,
          message: `Invalid state transition from ${fromState} to ${toState}`,
          userMessage: "An internal authentication error occurred. Please try refreshing the application.",
          retryable: true,
          requiresReauth: false,
          context: { fromState, toState, ...context },
        }),
      };
    }

    // Additional validation for specific transitions
    const warnings: string[] = [];

    // Validate authenticated state has required data
    if (toState === 'authenticated') {
      if (!context.user || !context.session) {
        return {
          valid: false,
          error: new AuthError({
            type: AuthErrorType.VALIDATION_ERROR,
            message: "Cannot transition to authenticated state without user and session",
            userMessage: "Authentication data is incomplete. Please log in again.",
            retryable: false,
            requiresReauth: true,
            context,
          }),
        };
      }

      // Check session expiry
      if (this.isSessionExpired(context.session)) {
        return {
          valid: false,
          error: new AuthError({
            type: AuthErrorType.TOKEN_EXPIRED,
            message: "Cannot transition to authenticated state with expired session",
            userMessage: "Your session has expired. Please log in again.",
            retryable: false,
            requiresReauth: true,
            context,
          }),
        };
      }

      // Warn if session will expire soon
      if (this.isSessionNearExpiry(context.session)) {
        warnings.push("Session will expire soon and should be refreshed");
      }
    }

    // Validate unauthenticated state clears data
    if (toState === 'unauthenticated') {
      if (context.user || context.session) {
        warnings.push("Transitioning to unauthenticated state but user/session data is still present");
      }
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate session data integrity
   */
  static validateSession(session: Session | null): ValidationResult {
    if (!session) {
      return {
        valid: false,
        error: new AuthError({
          type: AuthErrorType.SESSION_INVALID,
          message: "Session is null or undefined",
          userMessage: "No valid session found. Please log in.",
          retryable: false,
          requiresReauth: true,
        }),
      };
    }

    const warnings: string[] = [];

    // Check required fields
    if (!session.access_token) {
      return {
        valid: false,
        error: new AuthError({
          type: AuthErrorType.INVALID_TOKEN,
          message: "Session missing access token",
          userMessage: "Session data is incomplete. Please log in again.",
          retryable: false,
          requiresReauth: true,
        }),
      };
    }

    if (!session.user) {
      return {
        valid: false,
        error: new AuthError({
          type: AuthErrorType.SESSION_INVALID,
          message: "Session missing user data",
          userMessage: "Session data is incomplete. Please log in again.",
          retryable: false,
          requiresReauth: true,
        }),
      };
    }

    // Check expiry
    if (this.isSessionExpired(session)) {
      return {
        valid: false,
        error: new AuthError({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: "Session has expired",
          userMessage: "Your session has expired. Please log in again.",
          retryable: false,
          requiresReauth: true,
        }),
      };
    }

    // Check if refresh is needed soon
    if (this.isSessionNearExpiry(session)) {
      warnings.push("Session will expire soon and should be refreshed");
    }

    // Validate token format (basic JWT structure check)
    if (!this.isValidJWTFormat(session.access_token)) {
      return {
        valid: false,
        error: new AuthError({
          type: AuthErrorType.INVALID_TOKEN,
          message: "Access token has invalid format",
          userMessage: "Session data is corrupted. Please log in again.",
          retryable: false,
          requiresReauth: true,
        }),
      };
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate user data integrity
   */
  static validateUser(user: User | null): ValidationResult {
    if (!user) {
      return {
        valid: false,
        error: new AuthError({
          type: AuthErrorType.SESSION_INVALID,
          message: "User is null or undefined",
          userMessage: "No user data found. Please log in.",
          retryable: false,
          requiresReauth: true,
        }),
      };
    }

    const warnings: string[] = [];

    // Check required fields
    if (!user.id) {
      return {
        valid: false,
        error: new AuthError({
          type: AuthErrorType.SESSION_INVALID,
          message: "User missing ID",
          userMessage: "User data is incomplete. Please log in again.",
          retryable: false,
          requiresReauth: true,
        }),
      };
    }

    if (!user.email && !user.phone) {
      warnings.push("User has no email or phone number");
    }

    // Check if user is confirmed (for email auth)
    if (user.email && !user.email_confirmed_at) {
      warnings.push("User email is not confirmed");
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(session: Session): boolean {
    if (!session.expires_at) {
      return false;
    }

    const currentTime = Date.now() / 1000;
    return currentTime >= session.expires_at;
  }

  /**
   * Check if session is near expiry (within refresh threshold)
   */
  static isSessionNearExpiry(session: Session): boolean {
    if (!session.expires_at) {
      return false;
    }

    const currentTime = Date.now() / 1000;
    const thresholdTime = this.TOKEN_REFRESH_THRESHOLD / 1000;
    
    return (session.expires_at - currentTime) <= thresholdTime;
  }

  /**
   * Basic JWT format validation
   */
  static isValidJWTFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64url encoded (basic check)
    return parts.every(part => {
      try {
        // Basic check - should be non-empty and contain valid base64url characters
        return part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part);
      } catch {
        return false;
      }
    });
  }

  /**
   * Validate authentication operation context
   */
  static validateOperation(
    operation: string,
    context: AuthValidationContext
  ): ValidationResult {
    const warnings: string[] = [];

    // Check for suspicious rapid operations
    if (context.timestamp && context.previousState) {
      const timeSinceLastOperation = Date.now() - context.timestamp;
      if (timeSinceLastOperation < 100) { // Less than 100ms
        warnings.push(`Rapid authentication operations detected (${timeSinceLastOperation}ms)`);
      }
    }

    // Validate operation-specific requirements
    switch (operation) {
      case 'login':
        if (context.previousState === 'authenticated') {
          warnings.push("Login operation while already authenticated");
        }
        break;

      case 'logout':
        if (context.previousState === 'unauthenticated') {
          warnings.push("Logout operation while not authenticated");
        }
        break;

      case 'refresh':
        if (context.previousState !== 'authenticated') {
          return {
            valid: false,
            error: new AuthError({
              type: AuthErrorType.VALIDATION_ERROR,
              message: "Cannot refresh token when not authenticated",
              userMessage: "Please log in to refresh your session.",
              retryable: false,
              requiresReauth: true,
              context,
            }),
          };
        }
        break;
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Comprehensive authentication state validation
   */
  static validateAuthState(
    state: AuthState,
    user: User | null,
    session: Session | null,
    context: AuthValidationContext = {}
  ): ValidationResult {
    const errors: AuthError[] = [];
    const warnings: string[] = [];

    // Validate consistency between state and data
    if (state === 'authenticated') {
      const userValidation = this.validateUser(user);
      if (!userValidation.valid && userValidation.error) {
        errors.push(userValidation.error);
      }
      if (userValidation.warnings) {
        warnings.push(...userValidation.warnings);
      }

      const sessionValidation = this.validateSession(session);
      if (!sessionValidation.valid && sessionValidation.error) {
        errors.push(sessionValidation.error);
      }
      if (sessionValidation.warnings) {
        warnings.push(...sessionValidation.warnings);
      }
    } else if (state === 'unauthenticated') {
      if (user || session) {
        warnings.push("Unauthenticated state but user/session data present");
      }
    }

    // Return first error if any
    if (errors.length > 0) {
      return {
        valid: false,
        error: errors[0],
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
