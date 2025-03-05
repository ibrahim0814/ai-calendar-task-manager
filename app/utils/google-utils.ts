import { User, AuthState } from "../../lib/types";

export type { User };
export type { AuthState };

/**
 * Fetches the current user session information from the Next.js API
 * Handles token refresh errors and returns authentication state
 */
export async function getCurrentUser(): Promise<AuthState> {
  try {
    // Use cache: 'no-store' to always get fresh session data
    const response = await fetch('/api/auth/session', { 
      cache: 'no-store',
      credentials: 'same-origin' 
    });
    
    if (!response.ok) {
      console.error('Session API error:', response.status, response.statusText);
      
      // For 401/403 errors, we'll redirect to auth page
      if (response.status === 401 || response.status === 403) {
        console.log('Unauthorized session, redirecting to auth page');
        // Don't redirect immediately to avoid redirect loops
        setTimeout(() => {
          window.location.href = '/auth?error=session_expired';
        }, 100);
      }
      
      return {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: `API error: ${response.status}`
      };
    }
    
    const session = await response.json();
    
    // No session means not logged in
    if (!session || !session.user) {
      console.log('No valid session found');
      return {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: 'no_session'
      };
    }
    
    // Check for session errors (like refresh token errors)
    if (session.error) {
      console.error('Session has error:', session.error);
      
      // Only redirect for token errors, not for other types of errors
      if (session.error === 'RefreshAccessTokenError' || 
          session.error === 'NoRefreshTokenError') {
        console.log('Token refresh error, redirecting to login');
        
        // Small delay to avoid immediate redirect
        setTimeout(() => {
          window.location.href = '/auth?error=token_error';
        }, 100);
      }
      
      return {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: session.error
      };
    }
    
    // Session looks good, return authenticated state
    return {
      isAuthenticated: true,
      user: {
        id: session.user.id || session.user.email || '',
        email: session.user.email || '',
        name: session.user.name,
        image: session.user.image
      },
      accessToken: session.accessToken || null,
      refreshToken: session.refreshToken || null
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      error: error instanceof Error ? error.message : 'unknown_error'
    };
  }
}
