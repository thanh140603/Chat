// Message Service - API calls for messages
import { ApiClient } from '../config/api';

export interface Message {
  id: string;
  senderId: string;
  conversationId: string;
  content?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageRequest {
  conversationId?: string;
  content?: string;
  imgUrl?: string; // Backend uses imgUrl
  imageUrl?: string; // Keep for backward compatibility
  messageId?: string;
}

export interface MessageResponse {
  id: string;
  senderId: string;
  conversationId: string;
  content?: string;
  imageUrl?: string;
  createdAt: string;
  originalCreatedAt?: string;
  updatedAt?: string;
  forwardedFromMessageId?: string;
  forwardedFromConversationId?: string;
  forwardedFromSenderId?: string;
  forwardedFromSenderName?: string;
  forwardedAt?: string;
}

export interface MessageSearchParams {
  query: string;
  senderId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

export interface ForwardMessagesRequest {
  messageIds: string[];
  targetConversationId: string;
  comment?: string;
}

export interface UploadFileResponse {
  secureUrl: string;
  downloadUrl: string;
  originalFilename?: string;
  sanitizedFilename?: string;
  publicId?: string;
  size?: number;
  contentType?: string;
}

export class MessageService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  // POST /api/messages/direct - Send direct message
  async sendDirectMessage(request: MessageRequest): Promise<MessageResponse> {
    
    const response = await this.apiClient.request('/api/messages/direct', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send direct message');
    }

    const message = await response.json();
    return message;
  }

  // POST /api/messages/group - Send group message
  async sendGroupMessage(request: MessageRequest): Promise<MessageResponse> {
    
    const response = await this.apiClient.request('/api/messages/group', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send group message');
    }

    const message = await response.json();
    return message;
  }

  // GET /api/messages/{conversationId} - Get messages for conversation
  async getMessages(
    conversationId: string, 
    page: number = 0, 
    size: number = 20
  ): Promise<Message[]> {
    
    const response = await this.apiClient.request(`/api/messages/${conversationId}?page=${page}&size=${size}&sort=createdAt,desc`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get messages');
    }

    const messages = await response.json();
    return messages;
  }

  // Helper method to determine if conversation is group or direct
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    // Map imageUrl to imgUrl for backend compatibility
    const mappedRequest: MessageRequest = {
      ...request,
      imgUrl: request.imgUrl || request.imageUrl,
      imageUrl: undefined, // Remove imageUrl to avoid confusion
    };
    
    if (mappedRequest.conversationId) {
      // Has conversationId, send as group message
      return this.sendGroupMessage(mappedRequest);
    } else {
      // No conversationId, send as direct message
      return this.sendDirectMessage(mappedRequest);
    }
  }

  // PUT /api/messages/{messageId} - Update message
  async updateMessage(messageId: string, content: string): Promise<MessageResponse> {
    const response = await this.apiClient.request(`/api/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update message');
    }

    const message = await response.json();
    return message;
  }

  // DELETE /api/messages/{messageId} - Delete message
  async deleteMessage(messageId: string): Promise<void> {
    const response = await this.apiClient.request(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete message');
    }
  }

  // GET /api/messages/{conversationId}/search - Search messages in conversation
  async searchMessages(
    conversationId: string,
    params: MessageSearchParams
  ): Promise<MessageResponse[]> {
    const { query, senderId, fromDate, toDate, page = 0, size = 20 } = params;
    const searchParams = new URLSearchParams({
      query,
      page: page.toString(),
      size: size.toString(),
    });

    if (senderId) searchParams.append('senderId', senderId);
    if (fromDate) searchParams.append('fromDate', fromDate);
    if (toDate) searchParams.append('toDate', toDate);

    const response = await this.apiClient.request(
      `/api/messages/${conversationId}/search?${searchParams.toString()}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search messages');
    }

    return response.json();
  }

  // POST /api/messages/forward - Forward messages to another conversation
  async forwardMessages(request: ForwardMessagesRequest): Promise<MessageResponse[]> {
    const response = await this.apiClient.request('/api/messages/forward', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to forward message');
    }

    return response.json();
  }

  // POST /api/messages/upload - Upload file/image
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              secureUrl: response.secureUrl || response.url || response.downloadUrl,
              downloadUrl: response.downloadUrl || response.secureUrl || response.url,
              originalFilename: response.originalFilename,
              sanitizedFilename: response.sanitizedFilename,
              publicId: response.publicId,
              size: response.size,
              contentType: response.contentType,
            });
          } catch (e) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Failed to upload file'));
          } catch (e) {
            reject(new Error('Failed to upload file'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // Get token from localStorage
      const token = localStorage.getItem('accessToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      xhr.open('POST', `${apiUrl}/api/messages/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }
}

export default new MessageService();
