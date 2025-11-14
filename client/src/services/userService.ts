// User service for profile management
// File: client/src/services/userService.ts

import { ApiClient } from '../config/api';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  username?: string;
  email?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface UploadAvatarResponse {
  avatarUrl: string;
}

class UserService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  async getCurrentUser(): Promise<UserProfile> {
    const response = await this.apiClient.request('/api/users/me');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get user profile');
    }

    const data = await response.json();
    return data;
  }

  async updateProfile(profileData: UpdateProfileRequest): Promise<UserProfile> {
    const response = await this.apiClient.request('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile');
    }

    const data = await response.json();
    return data;
  }

  async uploadAvatar(file: File): Promise<UploadAvatarResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.apiClient.request('/api/users/uploadAvatar', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary for FormData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload avatar');
    }

    const data = await response.json();
    return data;
  }

  async searchUser(username: string): Promise<UserProfile> {
    const response = await this.apiClient.request(`/api/users/search?username=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'User not found');
    }

    const data = await response.json();
    return data;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const response = await this.apiClient.request('/api/users');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get users');
    }

    const data = await response.json();
    return data;
  }
}

export const userService = new UserService();
