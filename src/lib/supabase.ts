import { createClient, SupabaseClient, Session, User } from "@supabase/supabase-js";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

interface Preferences {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mcpBaseUrl: string;
}

// Get Supabase configuration from Raycast preferences
const preferences = getPreferenceValues<Preferences>();
const SUPABASE_URL = preferences.supabaseUrl;
const SUPABASE_ANON_KEY = preferences.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase preferences not configured. Authentication will not work.");
}

// Create Supabase client configured for Raycast environment
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: {
      // Custom storage adapter using Raycast LocalStorage
      getItem: async (key: string) => {
        const item = await LocalStorage.getItem<string>(key);
        return item || null;
      },
      setItem: async (key: string, value: string) => {
        await LocalStorage.setItem(key, value);
      },
      removeItem: async (key: string) => {
        await LocalStorage.removeItem(key);
      },
    },
  },
});

// Session management functions
export async function getStoredSession(): Promise<Session | null> {
  try {
    const sessionData = await LocalStorage.getItem<string>("supabase.auth.token");
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      await clearStoredSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("Error retrieving stored session:", error);
    return null;
  }
}

export async function storeSession(session: Session): Promise<void> {
  try {
    await LocalStorage.setItem("supabase.auth.token", JSON.stringify(session));
  } catch (error) {
    console.error("Error storing session:", error);
    throw error;
  }
}

export async function clearStoredSession(): Promise<void> {
  try {
    await LocalStorage.removeItem("supabase.auth.token");
    await LocalStorage.removeItem("supabase.auth.user");
  } catch (error) {
    console.error("Error clearing stored session:", error);
  }
}

// Authentication state functions
export async function isAuthenticated(): Promise<boolean> {
  const session = await getStoredSession();
  return session !== null;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await getStoredSession();
    if (!session) return null;
    
    // Set the session in the client
    await supabase.auth.setSession(session);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error getting current user:", error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Initialize session on client creation
export async function initializeAuth(): Promise<void> {
  try {
    const session = await getStoredSession();
    if (session) {
      await supabase.auth.setSession(session);
    }
  } catch (error) {
    console.error("Error initializing auth:", error);
  }
}

// Helper function to get authenticated Supabase client
export async function getAuthenticatedClient(): Promise<SupabaseClient | null> {
  const session = await getStoredSession();
  if (!session) return null;
  
  await supabase.auth.setSession(session);
  return supabase;
}

// Session event handlers
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    await storeSession(session);
  } else if (event === 'SIGNED_OUT') {
    await clearStoredSession();
  } else if (event === 'TOKEN_REFRESHED' && session) {
    await storeSession(session);
  }
});
