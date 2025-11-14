// Authentication service với Kong Gateway
// File: client/src/services/authService.ts

import { ApiClient } from '../config/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

class AuthService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.apiClient.request('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    this.apiClient.setToken(data.accessToken);
    return data;
  }

  async register(userData: { 
    username: string; 
    password: string; 
    displayName: string; 
    email?: string;
    phone?: string;
    bio?: string;
  }): Promise<LoginResponse> {
    const response = await this.apiClient.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    this.apiClient.setToken(data.accessToken);
    return { accessToken: data.accessToken };
  }

  async logout(): Promise<void> {
    try {
      await this.apiClient.request('/api/auth/signout', {
        method: 'POST',
      });
    } finally {
      this.apiClient.clearToken();
    }
  }

  async checkAuth(): Promise<User | null> {
    const response = await this.apiClient.request('/api/auth/check');
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}

export const authService = new AuthService();
