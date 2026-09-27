import { create } from 'zustand';
import type { AuthResponse, AuthState, UserProfile } from '../types/auth.types';
import { logoutApi } from '../api/authApi';

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getStoredUser(): UserProfile | null {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user_profile');
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch {
      // Fallback to token parsing
    }
  }
  if (!token) return null;
  const decoded = parseJwt(token);
  if (!decoded) return null;
  return {
    email: (decoded.sub as string) || '',
    userId: (decoded.userId as number) || undefined,
    role: (decoded.role as string) || 'ROLE_USER',
  };
}

export const useAuthStore = create<AuthState>((set, get) => {
  const initialToken = localStorage.getItem('token');
  const initialRefreshToken = localStorage.getItem('refreshToken');
  const initialUser = getStoredUser();

  return {
    token: initialToken,
    refreshToken: initialRefreshToken,
    user: initialUser,
    isAuthenticated: Boolean(initialToken),
    isLoading: false,

    setAuth: (response: AuthResponse, userExtra?: Partial<UserProfile>) => {
      localStorage.setItem('token', response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      const decoded = parseJwt(response.accessToken);
      const user: UserProfile = {
        email: userExtra?.email || (decoded?.sub as string) || '',
        fullName: userExtra?.fullName || (decoded?.fullName as string) || '',
        userId: userExtra?.userId || (decoded?.userId as number) || undefined,
        role: userExtra?.role || (decoded?.role as string) || 'ROLE_USER',
      };

      localStorage.setItem('user_profile', JSON.stringify(user));

      set({
        token: response.accessToken,
        refreshToken: response.refreshToken,
        user,
        isAuthenticated: true,
      });
    },

    logout: async () => {
      const currentRefresh = get().refreshToken;
      try {
        await logoutApi(currentRefresh);
      } catch (e) {
        console.warn('Logout API error:', e);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user_profile');
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      }
    },
  };
});
