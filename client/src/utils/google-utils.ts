export interface User {
  id: number;
  email: string;
}

export interface AuthState {
  authenticated: boolean;
  user?: User;
}

export async function getCurrentUser(): Promise<AuthState> {
  try {
    const response = await fetch('/api/user');
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to get user info:', error);
    return { authenticated: false };
  }
}

export async function loginWithGoogle() {
  window.location.href = '/api/auth/google';
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/auth';
}