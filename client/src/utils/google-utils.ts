
import axios from 'axios';

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
    const response = await axios.get('/api/user');
    return response.data;
  } catch (error) {
    console.error('Failed to get user info:', error);
    return { authenticated: false };
  }
}

export async function loginWithGoogle() {
  window.location.href = '/api/auth/google';
}

export async function logout() {
  await axios.post('/api/auth/logout');
  window.location.href = '/auth';
}
