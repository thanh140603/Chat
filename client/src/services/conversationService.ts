// Conversation Service - API calls for conversations
import { ApiClient } from '../config/api';

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: Participant[];
  lastMessage?: {
    content: string;
    timestamp: string;
    senderName: string;
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  isMuted?: boolean;
  avatarUrl?: string | null;
  pinnedMessageId?: string | null;
  pinnedAt?: string | null;
  pinnedByUserId?: string | null;
}

export interface Participant {
  id: string;
  name?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  joinedAt: string;
  lastSeenAt?: string; // ISO timestamp of when participant last saw the conversation
  lastReadMessageId?: string; // ID of the last message that this participant has read
}

// Matches server ConversationRequest: { type: "DIRECT"|"GROUP", groupName?, memberIds: string[] }
export interface ConversationRequest {
  type: 'DIRECT' | 'GROUP';
  groupName?: string;
  memberIds: string[];
}

export interface AddMembersRequest {
  memberIds: string[];
}

export interface UpdateParticipantRoleRequest {
  role: 'admin' | 'member';
}

export class ConversationService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  // GET /api/conversations - Get user's conversations
  async getUserConversations(): Promise<Conversation[]> {
    const response = await this.apiClient.request('/api/conversations', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get conversations');
    }

    const conversations = await response.json();
    return conversations;
  }

  // GET /api/conversations/{id} - Get specific conversation
  async getConversation(id: string): Promise<Conversation> {
    
    const response = await this.apiClient.request(`/api/conversations/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get conversation');
    }

    const conversation = await response.json();
    return conversation;
  }

  // POST /api/conversations - Create new conversation
  async createConversation(request: ConversationRequest): Promise<Conversation> {
    
    const payload = {
      type: request.type,
      groupName: request.groupName,
      memberIds: request.memberIds,
    } as any;
    
    const response = await this.apiClient.request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create conversation');
    }

    const conversation = await response.json();
    return conversation;
  }

  // POST /api/conversations/{id}/members - Add members to conversation
  async addMembers(conversationId: string, request: AddMembersRequest): Promise<Conversation> {
    
    const response = await this.apiClient.request(`/api/conversations/${conversationId}/members`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add members');
    }

    const conversation = await response.json();
    return conversation;
  }

  // PUT /api/conversations/{id} - Update conversation (e.g., group name)
  async updateConversation(conversationId: string, request: { groupName?: string; groupAvatarUrl?: string | null }): Promise<Conversation> {
    const response = await this.apiClient.request(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update conversation');
    }

    const conversation = await response.json();
    return conversation;
  }

  // PUT /api/conversations/{id}/members/{userId}/role - Update participant role
  async updateParticipantRole(
    conversationId: string, 
    userId: string, 
    request: UpdateParticipantRoleRequest
  ): Promise<Conversation> {
    
    const response = await this.apiClient.request(`/api/conversations/${conversationId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update role');
    }

    const conversation = await response.json();
    return conversation;
  }

  // DELETE /api/conversations/{id}/members/{userId} - Remove member
  async removeMember(conversationId: string, userId: string): Promise<void> {
    
    const response = await this.apiClient.request(`/api/conversations/${conversationId}/members/${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove member');
    }

    return;
  }

  async updateGroupAvatar(conversationId: string, file: File): Promise<Conversation> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.apiClient.request(`/api/conversations/${conversationId}/avatar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update group avatar');
    }

    return response.json();
  }

  // POST /api/conversations/{id}/seen - Mark conversation as seen
  async markAsSeen(conversationId: string): Promise<void> {
    
    const response = await this.apiClient.request(`/api/conversations/${conversationId}/seen`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark as seen');
    }

    return;
  }

  // PUT /api/conversations/{id}/favorite - Toggle favorite status
  async toggleFavorite(conversationId: string): Promise<Conversation> {
    const response = await this.apiClient.request(`/api/conversations/${conversationId}/favorite`, {
      method: 'PUT',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to toggle favorite');
    }

    return response.json();
  }

  // PUT /api/conversations/{id}/pin/{messageId} - Pin message
  async pinMessage(conversationId: string, messageId: string): Promise<Conversation> {
    const response = await this.apiClient.request(`/api/conversations/${conversationId}/pin/${messageId}`, {
      method: 'PUT',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to pin message');
    }

    return response.json();
  }

  // DELETE /api/conversations/{id}/pin - Unpin message
  async unpinMessage(conversationId: string): Promise<Conversation> {
    const response = await this.apiClient.request(`/api/conversations/${conversationId}/pin`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to unpin message');
    }

    return response.json();
  }

  // PUT /api/conversations/{id}/mute - Toggle mute status
  async toggleMute(conversationId: string): Promise<Conversation> {
    const response = await this.apiClient.request(`/api/conversations/${conversationId}/mute`, {
      method: 'PUT',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to toggle mute');
    }

    return response.json();
  }

  // POST /api/conversations/direct/{userId} - Ensure direct conversation exists
  async ensureDirectConversation(userId: string): Promise<Conversation> {
    const response = await this.apiClient.request(`/api/conversations/direct/${userId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to ensure direct conversation');
    }

    return response.json();
  }
}

export default new ConversationService();
