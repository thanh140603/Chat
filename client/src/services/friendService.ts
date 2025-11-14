// Friend Service - API calls for friend management
import { ApiClient } from '../config/api';

export interface Friend {
  id: string;
  friendId: string;
  friendUsername: string;
  friendDisplayName: string;
  friendAvatarUrl?: string;
  friendBio?: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromAvatarUrl?: string;
  toUserId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface FriendRequestsResponse {
  received: FriendRequest[];
  sent: FriendRequest[];
}

export interface SendFriendRequestRequest {
  // backend expects field name `to` (see FriendRequestDTO)
  to: string;
  message?: string;
}

class FriendService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  // GET /api/friends - Get all friends
  async getFriends(): Promise<Friend[]> {
    const response = await this.apiClient.request('/api/friends');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get friends');
    }

    const data = await response.json();
    return data;
  }

  // POST /api/friends/requests - Send friend request
  async sendFriendRequest(request: SendFriendRequestRequest): Promise<FriendRequest> {
    const response = await this.apiClient.request('/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send friend request');
    }

    const data = await response.json();
    return data;
  }

  // GET /api/friends/requests - Get friend requests
  async getFriendRequests(): Promise<FriendRequestsResponse> {
    const response = await this.apiClient.request('/api/friends/requests');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get friend requests');
    }

    const data = await response.json();
    return data;
  }

  // POST /api/friends/requests/{requestId}/accept - Accept friend request
  async acceptFriendRequest(requestId: string): Promise<void> {
    const response = await this.apiClient.request(`/api/friends/requests/${requestId}/accept`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to accept friend request');
    }
  }

  // POST /api/friends/requests/{requestId}/decline - Decline friend request
  async declineFriendRequest(requestId: string): Promise<void> {
    const response = await this.apiClient.request(`/api/friends/requests/${requestId}/decline`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to decline friend request');
    }
  }

  // DELETE /api/friends/{friendId} - Remove friend
  async removeFriend(friendId: string): Promise<void> {
    const response = await this.apiClient.request(`/api/friends/${friendId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove friend');
    }
  }
}

export const friendService = new FriendService();

