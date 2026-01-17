import { apiClient } from './client';
import type { User, UserWithProfile, UserProfile } from '@/lib/types/user.types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  full_name: string;
  class_level: string;
  board: string;
}

export interface AuthResponse {
  user: User;
  profile: UserProfile;
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthResponse>('/api/auth/login', credentials),

  signup: (data: SignupData) =>
    apiClient.post<AuthResponse>('/api/auth/signup', data),

  logout: () => apiClient.post('/api/auth/logout'),

  me: () => apiClient.get<UserWithProfile>('/api/auth/me'),
};
