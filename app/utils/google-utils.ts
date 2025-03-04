import { User, AuthState } from "../../lib/types";

export type { User };
export type { AuthState };

export async function getCurrentUser(): Promise<AuthState> {
  try {
    const response = await fetch('/api/auth/session');
    
    if (!response.ok) {
      console.error('Session response not OK:', response.status);
      return {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null
      };
    }
    
    const session = await response.json();
    
    if (session && session.user) {
      // Check for session errors
      if (session.error) {
        console.error('Session has error:', session.error);
        // Force a redirect to the auth page to refresh the session
        window.location.href = '/auth';
        return {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          error: session.error
        };
      }
      
      return {
        isAuthenticated: true,
        user: {
          id: session.user.email || '',  // Use email as ID
          email: session.user.email || '',
          name: session.user.name,
          image: session.user.image
        },
        accessToken: session.accessToken || null,
        refreshToken: session.refreshToken || null
      };
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  
  return {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
  };
}
