import { Session, User } from "@supabase/supabase-js";
import { LocalStorage } from "@raycast/api";
import { supabase } from "./supabase";
import { AuthError, AuthErrorType, AuthErrorHandler } from "./auth-errors";
import { withAuthRetry, authCircuitBreaker } from "./retry";

// Session storage keys
const SESSION_KEY = "supabase.auth.token";
const USER_KEY = "supabase.auth.user";

/**
 * Retrieve stored session from Raycast preferences
 */
export async function getStoredSession(): Promise<Session | null> {
  try {
    const sessionData = await LocalStorage.getItem<string>(SESSION_KEY);
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      await clearSession();
      throw new AuthError({
        type: AuthErrorType.TOKEN_EXPIRED,
        message: "Session has expired",
        userMessage: "Your session has expired. Please log in again.",
        retryable: false,
        requiresReauth: true,
      });
    }
    
    return session;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    
    const authError = AuthError.fromError(
      error instanceof Error ? error : new Error(String(error)),
      { operation: 'getStoredSession' }
    );
    
    console.error("Error retrieving stored session:", authError.toJSON());
    throw authError;
  }
}

/**
 * Store session data securely in Raycast preferences
 */
export async function storeSession(session: Session): Promise<void> {
  try {
    await LocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    // Also store user data for quick access
    if (session.user) {
      await LocalStorage.setItem(USER_KEY, JSON.stringify(session.user));
    }
  } catch (error) {
    const authError = AuthError.fromError(
      error instanceof Error ? error : new Error(String(error)),
      { operation: 'storeSession', sessionId: session.user?.id }
    );
    
    console.error("Error storing session:", authError.toJSON());
    throw authError;
  }
}

/**
 * Clear all stored session data
 */
export async function clearSession(): Promise<void> {
  try {
    await LocalStorage.removeItem(SESSION_KEY);
    await LocalStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("Error clearing session:", error);
  }
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getStoredSession();
  return session !== null && !isSessionExpired(session);
}

/**
 * Validate session and check authentication status
 */
export async function validateSession(): Promise<{ isValid: boolean; session: Session | null }> {
  try {
    const result = await withAuthRetry(async () => {
      const session = await getStoredSession();
      
      if (!session) {
        return { isValid: false, session: null };
      }
      
      // Check if session is expired
      if (isSessionExpired(session)) {
        await clearSession();
        throw new AuthError({
          type: AuthErrorType.TOKEN_EXPIRED,
          message: "Session has expired",
          userMessage: "Your session has expired. Please log in again.",
          retryable: false,
          requiresReauth: true,
        });
      }
      
      // Verify session with Supabase using circuit breaker
      return await authCircuitBreaker.execute(async () => {
        await supabase.auth.setSession(session);
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw new AuthError({
            type: AuthErrorType.SESSION_INVALID,
            message: error.message,
            userMessage: "Your session is no longer valid. Please log in again.",
            retryable: false,
            requiresReauth: true,
            originalError: error,
          });
        }
        
        if (!user) {
          throw new AuthError({
            type: AuthErrorType.INVALID_TOKEN,
            message: "No user found for session",
            userMessage: "Your session is invalid. Please log in again.",
            retryable: false,
            requiresReauth: true,
          });
        }
        
        return { isValid: true, session };
      });
    });

    if (result.success) {
      return result.data!;
    } else {
      await AuthErrorHandler.handleError(result.error!, { operation: 'validateSession' });
      await clearSession();
      return { isValid: false, session: null };
    }
  } catch (error) {
    const authError = await AuthErrorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)),
      { operation: 'validateSession' }
    );
    
    if (authError.requiresReauth) {
      await clearSession();
    }
    
    return { isValid: false, session: null };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { isValid, session } = await validateSession();
    
    if (!isValid || !session) {
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Get stored user data (cached version for quick access)
 */
export async function getStoredUser(): Promise<User | null> {
  try {
    const userData = await LocalStorage.getItem<string>(USER_KEY);
    if (!userData) return null;
    
    return JSON.parse(userData);
  } catch (error) {
    console.error("Error retrieving stored user:", error);
    return null;
  }
}

/**
 * Initialize authentication state on app startup
 */
export async function initializeAuth(): Promise<{ user: User | null; session: Session | null }> {
  try {
    const { isValid, session } = await validateSession();
    
    if (isValid && session) {
      return { user: session.user, session };
    }
    
    return { user: null, session: null };
  } catch (error) {
    console.error("Error initializing auth:", error);
    return { user: null, session: null };
  }
}

/**
 * Refresh authentication token if needed
 */
export async function refreshAuthToken(): Promise<Session | null> {
  try {
    const result = await withAuthRetry(async () => {
      return await authCircuitBreaker.execute(async () => {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        
        if (error) {
          throw new AuthError({
            type: AuthErrorType.REFRESH_FAILED,
            message: error.message,
            userMessage: "Failed to refresh your session. Please log in again.",
            retryable: false,
            requiresReauth: true,
            originalError: error,
          });
        }
        
        if (!session) {
          throw new AuthError({
            type: AuthErrorType.REFRESH_FAILED,
            message: "No session returned from refresh",
            userMessage: "Failed to refresh your session. Please log in again.",
            retryable: false,
            requiresReauth: true,
          });
        }
        
        await storeSession(session);
        return session;
      });
    });

    if (result.success) {
      return result.data!;
    } else {
      await AuthErrorHandler.handleError(result.error!, { operation: 'refreshAuthToken' });
      await clearSession();
      return null;
    }
  } catch (error) {
    const authError = await AuthErrorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)),
      { operation: 'refreshAuthToken' }
    );
    
    await clearSession();
    return null;
  }
}

/**
 * Sign out user and clear all session data
 */
export async function signOut(): Promise<void> {
  try {
    const result = await withAuthRetry(async () => {
      return await authCircuitBreaker.execute(async () => {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          throw new AuthError({
            type: AuthErrorType.LOGOUT_FAILED,
            message: error.message,
            userMessage: "Logout failed, but your local session has been cleared.",
            retryable: true,
            requiresReauth: false,
            originalError: error,
          });
        }
      });
    }, { maxAttempts: 2, showToasts: false });

    if (!result.success) {
      // Log the error but don't throw - we still want to clear local session
      await AuthErrorHandler.handleError(result.error!, { operation: 'signOut' });
    }
  } catch (error) {
    // Log the error but don't throw - we still want to clear local session
    await AuthErrorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)),
      { operation: 'signOut' }
    );
  } finally {
    // Always clear session even if signOut fails
    await clearSession();
  }
}

/**
 * Check if session is expired
 */
function isSessionExpired(session: Session): boolean {
  if (!session.expires_at) return false;
  
  // Add 5 minute buffer before expiry
  const bufferTime = 5 * 60; // 5 minutes in seconds
  const currentTime = Date.now() / 1000;
  
  return currentTime >= (session.expires_at - bufferTime);
}

/**
 * Get authentication headers for API requests
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getStoredSession();
  
  if (!session?.access_token) {
    return {};
  }
  
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Check if user needs to re-authenticate
 */
export async function needsReauth(): Promise<boolean> {
  const session = await getStoredSession();
  
  if (!session) return true;
  
  // Check if session will expire soon (within 10 minutes)
  if (session.expires_at) {
    const tenMinutesFromNow = (Date.now() / 1000) + (10 * 60);
    if (session.expires_at <= tenMinutesFromNow) {
      return true;
    }
  }
  
  return false;
}
