import type { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth.types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export async function loginApi(credentials: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data: ApiResponse<AuthResponse> = await res.json();

  if (!res.ok || !data.success) {
    const errorMsg = data.message || (res.status === 401 || res.status === 400 
      ? 'Email hoặc mật khẩu không chính xác.' 
      : 'Đăng nhập thất bại. Vui lòng thử lại.');
    throw new Error(errorMsg);
  }

  return data.data;
}

export async function registerApi(data: RegisterRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<AuthResponse> = await res.json();

  if (!res.ok || !result.success) {
    const errorMsg = result.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.';
    throw new Error(errorMsg);
  }

  return result.data;
}

export async function refreshTokenApi(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const result: ApiResponse<AuthResponse> = await res.json();

  if (!res.ok || !result.success) {
    throw new Error(result.message || 'Không thể cấp mới token');
  }

  return result.data;
}

export async function logoutApi(refreshToken?: string | null): Promise<void> {
  try {
    if (refreshToken) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (err) {
    console.error('Logout error:', err);
  }
}
