import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { showToast, Toast } from "@raycast/api";
import {
  initializeAuth,
  getCurrentUser,
  getStoredSession,
  signOut,
  validateSession,
  refreshAuthToken,
  needsReauth,
} from "../lib/auth";
import { supabase } from "../lib/supabase";
import { AuthError, AuthErrorHandler, AuthErrorType } from "../lib/auth-errors";
import { withAuthRetry } from "../lib/retry";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  authState: 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';
}

export interface AuthActions {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export type UseAuthReturn = AuthState & AuthActions;

/**
 * Custom hook for managing authentication state in Raycast
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
    authState: 'unauthenticated',
  });

  /**
   * Update authentication state with validation
   */
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates };
      
      // Validate state transition if authState is being updated
      if (updates.authState && updates.authState !== prev.authState) {
        const validation = AuthErrorHandler.validateStateTransition(
          prev.authState,
          updates.authState,
          { userId: prev.user?.id }
        );
        
        if (!validation.valid && validation.error) {
          console.error("Invalid auth state transition:", validation.error.toJSON());
          // Don't update to invalid state
          return prev;
        }
      }
      
      return newState;
    });
  }, []);

  /**
   * Initialize authentication on hook mount
   */
  const initAuth = useCallback(async () => {
    try {
      updateAuthState({ 
        isLoading: true, 
        error: null, 
        authState: 'authenticating' 
      });
      
      const result = await withAuthRetry(async () => {
        return await initializeAuth();
      });

      if (result.success) {
        const { user, session } = result.data!;
        updateAuthState({
          user,
          session,
          isAuthenticated: !!user && !!session,
          isLoading: false,
          authState: !!user && !!session ? 'authenticated' : 'unauthenticated',
          error: null,
        });
      } else {
        const authError = await AuthErrorHandler.handleError(result.error!, { operation: 'initAuth' });
        updateAuthState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          authState: 'error',
          error: authError,
        });
      }
    } catch (error) {
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'initAuth' }
      );
      
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        authState: 'error',
        error: authError,
      });
    }
  }, [updateAuthState]);

  /**
   * Handle login process
   */
  const login = useCallback(async () => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      // For now, this will redirect to the login command
      // The actual OAuth flow will be handled by the login command
      await showToast({
        style: Toast.Style.Failure,
        title: "Login Required",
        message: "Please use the Login command to authenticate",
      });
      
      updateAuthState({ isLoading: false });
    } catch (error) {
      console.error("Error during login:", error);
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'login' }
      );
      
      updateAuthState({
        isLoading: false,
        error: authError,
      });
      
      await showToast({
        style: Toast.Style.Failure,
        title: "Login Failed",
        message: error instanceof Error ? error.message : "An error occurred during login",
      });
    }
  }, [updateAuthState]);

  /**
   * Handle logout process
   */
  const logout = useCallback(async () => {
    try {
      updateAuthState({ 
        isLoading: true, 
        error: null, 
        authState: 'authenticating' 
      });
      
      await signOut();
      
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        authState: 'unauthenticated',
        error: null,
      });
      
      await showToast({
        style: Toast.Style.Success,
        title: "Logged Out",
        message: "You have been successfully logged out",
      });
    } catch (error) {
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'logout' }
      );
      
      // Even if logout fails, clear local state
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        authState: 'unauthenticated',
        error: authError,
      });
    }
  }, [updateAuthState]);

  /**
   * Refresh authentication state
   */
  const refreshAuth = useCallback(async () => {
    try {
      updateAuthState({ 
        isLoading: true, 
        error: null, 
        authState: 'authenticating' 
      });
      
      const result = await withAuthRetry(async () => {
        // Check if we need to refresh the token
        if (await needsReauth()) {
          const session = await refreshAuthToken();
          
          if (session) {
            return {
              user: session.user,
              session,
              isAuthenticated: true,
            };
          } else {
            throw new AuthError({
              type: AuthErrorType.REFRESH_FAILED,
              message: "Token refresh failed",
              userMessage: "Failed to refresh your session. Please log in again.",
              retryable: false,
              requiresReauth: true,
            });
          }
        } else {
          // Session is still valid, just validate it
          const { isValid, session } = await validateSession();
          
          return {
            user: isValid ? session?.user || null : null,
            session: isValid ? session : null,
            isAuthenticated: isValid,
          };
        }
      });

      if (result.success) {
        const { user, session, isAuthenticated } = result.data!;
        updateAuthState({
          user,
          session,
          isAuthenticated,
          isLoading: false,
          authState: isAuthenticated ? 'authenticated' : 'unauthenticated',
          error: null,
        });
      } else {
        const authError = await AuthErrorHandler.handleError(result.error!, { operation: 'refreshAuth' });
        updateAuthState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          authState: authError.requiresReauth ? 'unauthenticated' : 'error',
          error: authError,
        });
      }
    } catch (error) {
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'refreshAuth' }
      );
      
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        authState: authError.requiresReauth ? 'unauthenticated' : 'error',
        error: authError,
      });
    }
  }, [updateAuthState]);

  /**
   * Check current authentication status
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const session = await getStoredSession();
      
      updateAuthState({
        user,
        session,
        isAuthenticated: !!user && !!session,
        error: null,
      });
    } catch (error) {
      console.error("Error checking auth status:", error);
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'checkAuthStatus' }
      );
      
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        error: authError,
      });
    }
  }, [updateAuthState]);

  /**
   * Handle authentication state changes from Supabase
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        
        switch (event) {
          case "SIGNED_IN":
            if (session) {
              updateAuthState({
                user: session.user,
                session,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              
              await showToast({
                style: Toast.Style.Success,
                title: "Signed In",
                message: `Welcome back, ${session.user.user_metadata?.full_name || session.user.email}!`,
              });
            }
            break;
            
          case "SIGNED_OUT":
            updateAuthState({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
            break;
            
          case "TOKEN_REFRESHED":
            if (session) {
              updateAuthState({
                user: session.user,
                session,
                isAuthenticated: true,
                error: null,
              });
            }
            break;
            
          case "USER_UPDATED":
            if (session) {
              updateAuthState({
                user: session.user,
                session,
              });
            }
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [updateAuthState]);

  /**
   * Initialize authentication on mount
   */
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  /**
   * Periodic authentication check
   */
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const interval = setInterval(async () => {
      if (await needsReauth()) {
        await refreshAuth();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshAuth]);

  return {
    ...state,
    login,
    logout,
    refreshAuth,
    checkAuthStatus,
  };
}

/**
 * Hook for components that require authentication
 * Automatically redirects to login if not authenticated
 */
export function useRequireAuth(): UseAuthReturn {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Required",
        message: "Please log in to access this feature",
      });
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
}

/**
 * Simple hook to get authentication status
 */
export function useAuthStatus(): { isAuthenticated: boolean; isLoading: boolean } {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}
