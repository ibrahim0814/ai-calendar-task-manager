import { User, AuthState } from "../../lib/types";

export type { User };
export type { AuthState };

export async function getCurrentUser(): Promise<AuthState> {
  try {
    const response = await fetch('/api/auth/session');
    const session = await response.json();
    
    if (session && session.user) {
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
