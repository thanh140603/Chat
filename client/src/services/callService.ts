// Call Service - API calls for voice/video calls
import { ApiClient } from '../config/api';

export type CallType = 'VOICE' | 'VIDEO';
export type CallStatus = 'INITIATED' | 'RINGING' | 'ANSWERED' | 'ENDED' | 'REJECTED' | 'MISSED';

export interface Call {
  id: string;
  conversationId: string;
  callerId: string;
  callerName?: string;
  callerAvatarUrl?: string;
  receiverId: string;
  receiverName?: string;
  receiverAvatarUrl?: string;
  type: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  endedBy?: string;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InitiateCallRequest {
  conversationId: string;
  receiverId: string;
  type: CallType;
}

export class CallService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  // POST /api/calls/initiate - Initiate a call
  async initiateCall(request: InitiateCallRequest): Promise<Call> {
    const response = await this.apiClient.request('/api/calls/initiate', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initiate call');
    }

    return response.json();
  }

  // POST /api/calls/{callId}/answer - Answer a call
  async answerCall(callId: string): Promise<Call> {
    const response = await this.apiClient.request(`/api/calls/${callId}/answer`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to answer call');
    }

    return response.json();
  }

  // POST /api/calls/{callId}/reject - Reject a call
  async rejectCall(callId: string): Promise<Call> {
    const response = await this.apiClient.request(`/api/calls/${callId}/reject`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject call');
    }

    return response.json();
  }

  // POST /api/calls/{callId}/end - End a call
  async endCall(callId: string): Promise<Call> {
    const response = await this.apiClient.request(`/api/calls/${callId}/end`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to end call');
    }

    return response.json();
  }

  // GET /api/calls/history - Get call history
  async getCallHistory(page: number = 0, size: number = 20, conversationId?: string): Promise<Call[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (conversationId) {
      params.append('conversationId', conversationId);
    }

    const response = await this.apiClient.request(`/api/calls/history?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get call history');
    }

    const data = await response.json();
    // Handle pagination response
    return Array.isArray(data) ? data : data.content || [];
  }

  // GET /api/calls/active - Get active calls
  async getActiveCalls(): Promise<Call[]> {
    const response = await this.apiClient.request('/api/calls/active', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get active calls');
    }

    return response.json();
  }

  // GET /api/calls/{callId} - Get call by ID
  async getCallById(callId: string): Promise<Call> {
    const response = await this.apiClient.request(`/api/calls/${callId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get call');
    }

    return response.json();
  }
}

export default new CallService();

