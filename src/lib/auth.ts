import { Session, User } from "@supabase/supabase-js";
import { LocalStorage } from "@raycast/api";
import { supabase } from "./supabase";

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
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("Error retrieving stored session:", error);
    return null;
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
    console.error("Error storing session:", error);
    throw error;
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
    const session = await getStoredSession();
    
    if (!session) {
      return { isValid: false, session: null };
    }
    
    // Check if session is expired
    if (isSessionExpired(session)) {
      await clearSession();
      return { isValid: false, session: null };
    }
    
    // Verify session with Supabase
    await supabase.auth.setSession(session);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      await clearSession();
      return { isValid: false, session: null };
    }
    
    return { isValid: true, session };
  } catch (error) {
    console.error("Error validating session:", error);
    await clearSession();
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
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error || !session) {
      await clearSession();
      return null;
    }
    
    await storeSession(session);
    return session;
  } catch (error) {
    console.error("Error refreshing auth token:", error);
    await clearSession();
    return null;
  }
}

/**
 * Sign out user and clear all session data
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    await clearSession();
  } catch (error) {
    console.error("Error signing out:", error);
    // Clear session even if signOut fails
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
