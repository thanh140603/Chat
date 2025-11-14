// Client configuration để connect qua Kong Gateway
// File: client/src/config/api.ts

const API_CONFIG = {
  // Kong Gateway endpoints
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
  
  // API endpoints
  AUTH: {
    LOGIN: '/api/auth/signin',
    REGISTER: '/api/auth/signup', 
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/signout',
    CHECK: '/api/auth/check'
  },
  
  // WebSocket endpoints
  WS: {
    MAIN: '/ws',
    MESSAGE: '/ws-message'
  }
};

// HTTP client với JWT token
export class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private static instance: ApiClient | null = null;

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('accessToken');
  }

  // Get or create singleton instance
  static getInstance(baseURL: string = API_CONFIG.BASE_URL): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(baseURL);
    }
    return ApiClient.instance;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('accessToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('accessToken');
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type for JSON requests, not for FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, try refresh
      await this.refreshToken();
      // Retry request with new token
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
        return fetch(url, { ...options, headers });
      }
    }

    return response;
  }

  private async refreshToken() {
    try {
      const response = await fetch(`${this.baseURL}${API_CONFIG.AUTH.REFRESH}`, {
        method: 'POST',
        credentials: 'include', // For refresh token cookie
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.accessToken);
      } else {
        this.clearToken();
        // Don't redirect, let the app handle auth state
      }
    } catch (error) {
      this.clearToken();
    }
  }
}

// WebSocket client với JWT authentication
export class WebSocketClient {
  private wsUrl: string;
  private stompClient: any = null;
  private token: string | null = null;

  constructor(wsUrl: string = API_CONFIG.WS_URL) {
    this.wsUrl = wsUrl;
    this.token = localStorage.getItem('accessToken');
  }

  connect(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Import SockJS and STOMP dynamically
      import('sockjs-client').then(({ default: SockJS }) => {
        import('@stomp/stompjs').then(({ Client }) => {
          const socket = new SockJS(`${this.wsUrl}/ws`);
          this.stompClient = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
              'Authorization': `Bearer ${this.token}`
            },
            debug: () => {},
            onConnect: (frame) => {
              resolve(frame);
            },
            onStompError: (frame) => {
              reject(frame);
            }
          });

          this.stompClient.activate();
        });
      });
    });
  }

  subscribe(destination: string, callback: (message: any) => void) {
    if (this.stompClient && this.stompClient.connected) {
      return this.stompClient.subscribe(destination, callback);
    }
    throw new Error('WebSocket not connected');
  }

  send(destination: string, body: any) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination,
        body: JSON.stringify(body)
      });
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }
}

export default API_CONFIG;
