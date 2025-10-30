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

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
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
  });

  /**
   * Update authentication state
   */
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Initialize authentication on hook mount
   */
  const initAuth = useCallback(async () => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      const { user, session } = await initializeAuth();
      
      updateAuthState({
        user,
        session,
        isAuthenticated: !!user && !!session,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error initializing auth:", error);
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to initialize authentication",
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
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
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
      updateAuthState({ isLoading: true, error: null });
      
      await signOut();
      
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      await showToast({
        style: Toast.Style.Success,
        title: "Logged Out",
        message: "You have been successfully logged out",
      });
    } catch (error) {
      console.error("Error during logout:", error);
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Logout failed",
      });
      
      await showToast({
        style: Toast.Style.Failure,
        title: "Logout Failed",
        message: error instanceof Error ? error.message : "An error occurred during logout",
      });
    }
  }, [updateAuthState]);

  /**
   * Refresh authentication state
   */
  const refreshAuth = useCallback(async () => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      // Check if we need to refresh the token
      if (await needsReauth()) {
        const session = await refreshAuthToken();
        
        if (session) {
          updateAuthState({
            user: session.user,
            session,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // Refresh failed, user needs to re-authenticate
          updateAuthState({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        // Session is still valid, just validate it
        const { isValid, session } = await validateSession();
        
        updateAuthState({
          user: isValid ? session?.user || null : null,
          session: isValid ? session : null,
          isAuthenticated: isValid,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Error refreshing auth:", error);
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to refresh authentication",
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
      updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Failed to check authentication status",
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
