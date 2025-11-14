# Chat App - Full Stack Real-time Chat Application

A real-time chat application with microservices architecture, supporting messaging, voice/video calls, group management, and friend requests.

## 🏗️ System Architecture

```
┌─────────────┐
│   Frontend  │ React + TypeScript + Vite
│  (Port 3000)│
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────┐
│         Kong API Gateway (Port 8000)         │
│  - JWT Authentication                        │
│  - Request Routing                          │
│  - CORS Handling                            │
└──────┬───────────────────────────────────────┘
       │
       ├──────────────┬──────────────────────┐
       │              │                      │
┌──────▼──────┐ ┌─────▼──────┐    ┌──────────▼──────┐
│  REST API   │ │ WebSocket │    │   Frontend       │
│ (Port 8080) │ │ (Port 8081)│    │   Static Files   │
└──────┬──────┘ └─────┬──────┘    └──────────────────┘
       │              │
       ├──────────────┼──────────────┐
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼─────┐
│  MongoDB    │ │   Redis    │ │  Kafka   │
│ (Port 27018)│ │ (Port 6379)│ │(Port 9092)│
└─────────────┘ └────────────┘ └──────────┘
```

## 🛠️ Tech Stack & Rationale

### Frontend

#### **React 19 + TypeScript**
- **Why**: Popular UI framework, component-based, easy to maintain
- **Benefits**: 
  - Type safety with TypeScript reduces bugs
  - Virtual DOM optimizes performance
  - Rich ecosystem with extensive library support

#### **Vite**
- **Why**: Faster build tool than Webpack
- **Benefits**:
  - Extremely fast Hot Module Replacement (HMR)
  - Build time 10-20x faster than Webpack
  - Native ES modules, no bundling needed in dev

#### **Zustand**
- **Why**: Simple, lightweight state management
- **Benefits**:
  - No boilerplate like Redux
  - Excellent TypeScript support
  - Good performance with minimal re-renders

#### **Tailwind CSS**
- **Why**: Utility-first CSS framework
- **Benefits**:
  - Fast development, no need to write separate CSS
  - Small bundle size thanks to tree-shaking
  - Easy responsive design

#### **STOMP.js + SockJS**
- **Why**: Protocol for WebSocket messaging
- **Benefits**:
  - Fallback support when WebSocket is unavailable
  - Message framing and subscription model
  - Compatible with Spring WebSocket

### Backend

#### **Spring Boot 3.5.6**
- **Why**: Popular Java framework, enterprise-ready
- **Benefits**:
  - Auto-configuration reduces boilerplate
  - Built-in Spring Security
  - Actuator for monitoring
  - Powerful dependency injection

#### **Spring WebSocket**
- **Why**: Supports real-time communication
- **Benefits**:
  - STOMP protocol support
  - Message broadcasting
  - Session management
  - Good integration with Spring Security

#### **MongoDB**
- **Why**: NoSQL database suitable for chat applications
- **Benefits**:
  - Flexible schema, easy to change
  - High read/write speed for real-time data
  - Easy horizontal scaling
  - Document model fits nested data (messages, conversations)

#### **Redis**
- **Why**: In-memory data store
- **Use Cases in This Project**:
  - **Presence Tracking**: Store user online/offline status and session counts
    - When user connects via WebSocket → increment session count in Redis
    - When user disconnects → decrement session count
    - Friends can check if user is online instantly (< 1ms lookup)
    - Store last seen timestamp for offline users
  - **Friend List Caching**: Cache user's friend list to avoid repeated API calls
    - Cache expires after 6 hours
    - Reduces load on REST API when checking friend relationships
  - **Message Deduplication**: Prevent duplicate message processing in Kafka consumers
    - Store processed message IDs with TTL
    - If message already processed → skip (idempotency)
  - **Typing Indicators**: Track who is currently typing in each conversation
    - Store typing users per conversation with auto-expire (10 seconds)
    - Real-time updates without database queries
  - **Online Users Set**: Maintain set of currently online users
    - Fast membership checks for presence features
- **Benefits**:
  - Extremely low latency (< 1ms) for real-time features
  - Reduces MongoDB load by caching frequently accessed data
  - Enables real-time features without polling database
  - Supports pub/sub for multi-instance deployments

#### **Apache Kafka**
- **Why**: Distributed message broker
- **Use Cases in This Project**:
  - **Message Events**: Decouple REST API from WebSocket service
    - When user sends message → REST API saves to MongoDB
    - REST API publishes `MESSAGE_SENT` event to Kafka topic `message.events`
    - WebSocket service consumes event and broadcasts to connected clients
    - If WebSocket service is down, events are queued and processed when back online
  - **User Events**: Broadcast user-related events across services
    - Events: `USER_ONLINE`, `USER_OFFLINE`, `FRIEND_REQUEST`, `FRIEND_REQUEST_ACCEPTED`
    - Call events: `CALL_INITIATED`, `CALL_ANSWERED`, `CALL_REJECTED`, `CALL_ENDED`
    - Published to `user.events` topic
    - WebSocket service consumes and notifies relevant users in real-time
  - **Event-Driven Architecture**: Services communicate via events, not direct HTTP calls
    - REST API doesn't need to know about WebSocket service
    - WebSocket service doesn't need to query REST API for updates
    - Both services can scale independently
  - **Message Ordering**: Ensure messages are delivered in correct order per conversation
    - Kafka partitions by conversation ID → messages in same conversation stay ordered
  - **Idempotency**: Prevent duplicate processing using message IDs
    - Each event has unique message ID
    - Consumers check Redis before processing (deduplication)
- **Benefits**:
  - **Decoupling**: REST API and WebSocket service are independent
  - **Reliability**: Messages persisted, not lost if consumer is down
  - **Scalability**: Handle high message volume (millions/second)
  - **Ordering**: Maintain message order per conversation
  - **Replay**: Can replay events for debugging or recovery
  - **Async Processing**: Non-blocking event publishing

#### **Kong API Gateway**
- **Why**: API gateway for microservices
- **Benefits**:
  - **Single entry point**: All requests go through one point
  - **JWT verification**: Centralized authentication, no need to implement in each service
  - **Request routing**: Routes requests to correct service
  - **Rate limiting**: Protects backend from DDoS
  - **CORS handling**: Centralized CORS configuration
  - **Monitoring**: Track API usage and performance

#### **Kong JWT2Header Plugin** (Custom Plugin)
- **Why**: Decode JWT claims and inject them into request headers
- **How it works**:
  - Kong verifies JWT token using built-in JWT plugin
  - Custom `kong-jwt2header` plugin extracts JWT claims (uid, sub, etc.)
  - Claims are injected as HTTP headers: `X-Kong-Jwt-Claim-Uid`, `X-Kong-Jwt-Claim-Sub`
  - Backend services read these headers instead of parsing JWT again
- **Benefits**:
  - **Performance**: Backend doesn't need to decode JWT (already done by Kong)
  - **Simplicity**: Backend services just read headers, no JWT parsing logic needed
  - **Consistency**: All services get user info in the same format
  - **Security**: JWT verification happens once at gateway level
- **Installation**: 
  - Custom Kong Docker image includes the plugin (see `kong/Dockerfile`)
  - Plugin is cloned from: https://github.com/yesinteractive/kong-jwt2header
  - Installed at: `/usr/local/share/lua/5.1/kong/plugins/kong-jwt2header`

#### **JWT (JSON Web Token)**
- **Why**: Stateless authentication
- **Benefits**:
  - No need to store sessions on server
  - Scalable: no shared session store needed
  - Can verify at gateway level (Kong)
  - Mobile-friendly

#### **MapStruct**
- **Why**: Code generation for DTO mapping
- **Benefits**:
  - Type-safe mapping, compile-time errors
  - Better performance than reflection-based mappers
  - Reduces boilerplate code

#### **Cloudinary**
- **Why**: Cloud storage for images
- **Benefits**:
  - Automatic CDN, images load fast
  - Image transformations (resize, crop) on-the-fly
  - No need to host storage server yourself

### Infrastructure

#### **Docker & Docker Compose**
- **Why**: Containerization and orchestration
- **Benefits**:
  - **Consistency**: Dev/prod environments are identical
  - **Isolation**: Each service runs independently
  - **Easy deployment**: Deploy entire stack with 1 command
  - **Scalability**: Easy to scale individual services

#### **Zookeeper**
- **Why**: Coordination service for Kafka
- **Benefits**:
  - Service discovery for Kafka brokers
  - Configuration management
  - Leader election

### Real-time Communication

#### **WebRTC**
- **Why**: Peer-to-peer voice/video calls
- **Benefits**:
  - **Low latency**: Direct P2P connection, not through server
  - **Bandwidth efficient**: Media stream doesn't go through server
  - **Browser native**: No plugins needed
  - **STUN/TURN**: NAT traversal support

## 📦 Main Components

### Services

1. **Frontend Service** (React)
   - UI/UX for chat, calls, friends
   - WebSocket client for real-time updates
   - WebRTC client for voice/video calls

2. **REST API Service** (Spring Boot)
   - Authentication & Authorization
   - User management
   - Conversation management
   - Message CRUD
   - Friend requests
   - Call management
   - File upload (Cloudinary)

3. **WebSocket Service** (Spring Boot)
   - Real-time message delivery
   - Presence tracking (online/offline)
   - Typing indicators
   - Call signaling (WebRTC offer/answer/ICE)
   - Event broadcasting via Kafka

4. **Kong API Gateway**
   - Request routing
   - JWT verification
   - CORS handling
   - Rate limiting

### Data Stores

- **MongoDB**: Persistent data storage
  - Users, messages, conversations, friends, friend requests
  - Call history and records
  - All data persisted permanently
  
- **Redis**: In-memory cache and real-time data
  - User presence (online/offline status, session counts)
  - Friend list caching (6h TTL)
  - Typing indicators (10s auto-expire)
  - Message deduplication keys
  - Online users set
  
- **Kafka**: Event streaming platform
  - `message.events` topic: Message-related events (sent, updated, deleted, seen)
  - `user.events` topic: User-related events (online, offline, friend requests, calls)
  - Decouples REST API and WebSocket services
  - Ensures message ordering per conversation

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Cloudinary account (for avatar upload)

### 1. Setup Environment

```bash
# Copy environment file from example
cp .env.example .env

# Edit .env and update the following variables:

# JWT Configuration (REQUIRED - change the default secret!)
JWT_SECRET=your-secure-jwt-secret-key-here
JWT_EXP_SECONDS=3600
JWT_REFRESH_EXP_SECONDS=2592000

# Cloudinary Configuration (required for avatar upload)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Build Mode (optional, default: production)
BUILD_MODE=production
```

**Important**: Generate a secure JWT secret. You can use:
```bash
# Generate a random secret (Linux/Mac)
openssl rand -base64 64

# Or use any secure random string generator
# Windows PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))
```

### 2. Generate Kong Configuration

```bash
# Linux/Mac
chmod +x generate-kong-config.sh
./generate-kong-config.sh

# Windows
generate-kong-config.bat
```

This will generate `kong.yml` from `kong.yml.template` with your JWT_SECRET from `.env`.

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Load Kong Configuration

```bash
# Wait for Kong to start (about 30 seconds)
sleep 30

# Load Kong declarative configuration
curl -X POST http://localhost:8001/config -F "config=@kong.yml"

# Verify Kong routes are loaded
curl http://localhost:8001/routes
```

### 5. Access Services

- **Frontend**: http://localhost:3000
- **Kong Gateway**: http://localhost:8000
- **Kong Manager**: http://localhost:8002
- **Kong Admin API**: http://localhost:8001
- **REST API** (direct): http://localhost:8080
- **WebSocket** (direct): ws://localhost:8081/ws
- **API Docs**: http://localhost:8080/swagger-ui.html
- **Health Check**: http://localhost:8080/actuator/health

## 🔧 Development

### Run Services Locally

```bash
# REST API
cd server
mvn spring-boot:run

# WebSocket Service  
cd websocket
mvn spring-boot:run

# Frontend
cd client
npm run dev
```

### Test APIs

```bash
# Health checks
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health

# Test Kong Gateway
curl http://localhost:8000/api/users/me

# Test WebSocket connection
wscat -c ws://localhost:8000/ws
```

## 📁 Project Structure

```
Chat/
├── docker-compose.yml          # Service orchestration
├── kong.yml                     # Kong declarative configuration
├── kong/                        # Kong custom image with JWT2Header plugin
│   └── Dockerfile
├── .env.example                 # Environment template
├── server/                      # REST API Service (Spring Boot)
│   ├── src/main/java/com/example/server/
│   │   ├── user/                # User & Auth
│   │   ├── chat/                # Conversations
│   │   ├── message/             # Messages
│   │   ├── friend/              # Friends & Friend Requests
│   │   ├── call/                # Voice/Video Calls
│   │   ├── common/              # Security, Config, Utils
│   │   └── infrastructure/      # Kafka, Redis, Storage
│   ├── Dockerfile
│   └── pom.xml
├── websocket/                   # WebSocket Service (Spring Boot)
│   ├── src/main/java/com/example/websocket/
│   │   ├── ws/                  # WebSocket handlers
│   │   ├── kafka/               # Kafka consumers
│   │   ├── presence/            # Presence tracking
│   │   └── security/            # JWT authentication
│   ├── Dockerfile
│   └── pom.xml
└── client/                      # React Frontend
    ├── src/
    │   ├── components/          # React components
    │   ├── pages/               # Page components
    │   ├── services/            # API services
    │   ├── hooks/               # Custom hooks
    │   ├── stores/              # Zustand stores
    │   └── types/               # TypeScript types
    ├── Dockerfile
    └── package.json
```

## 🔐 Security

### Authentication Flow

1. **Client sends request** with JWT token in `Authorization: Bearer <token>` header
2. **Kong Gateway** receives request and:
   - Verifies JWT signature using built-in JWT plugin
   - Validates token expiration and claims
   - **Kong JWT2Header plugin** extracts claims (uid, sub) from verified JWT
   - Injects claims as HTTP headers:
     - `X-Kong-Jwt-Claim-Uid`: User ID from JWT claim
     - `X-Kong-Jwt-Claim-Sub`: Username from JWT claim
3. **Backend services** (REST API, WebSocket) receive request with user info in headers
4. **Backend extracts user info** from headers (no JWT parsing needed)

### Security Features

- **JWT Authentication**: Stateless, scalable
- **Kong Gateway**: Centralized JWT verification at gateway level
- **Kong JWT2Header Plugin**: Automatically extracts and injects user claims into headers
- **Spring Security**: Backend authorization using headers from Kong
- **CORS**: Configured at Kong level
- **Password Hashing**: BCrypt

## 📊 Data Flow

### Message Flow
```
User sends message
  → REST API (save to MongoDB)
  → Publish to Kafka
  → WebSocket Service consumes
  → Broadcast via WebSocket
  → Redis pub/sub (if multiple instances)
  → Frontend receives
```

### Call Flow
```
User initiates call
  → REST API (create call record)
  → WebSocket (signaling)
  → WebRTC (P2P connection)
  → Media streams (audio/video)
```

## 🛑 Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Clean up everything (including images)
docker-compose down -v --rmi all
```

## 🔧 Kong Configuration

### Plugin Setup

The Kong JWT2Header plugin is configured in `kong.yml`:

```yaml
# Protected routes use both JWT and JWT2Header plugins
plugins:
  - name: jwt                    # Built-in Kong plugin - verifies JWT
    config:
      secret_is_base64: false
      key_claim_name: iss
      claims_to_verify: []
  - name: kong-jwt2header        # Custom plugin - extracts claims to headers
    config:
      strip_claims: "false"
      token_required: "true"
```

### How It Works

1. **JWT Plugin** (built-in):
   - Verifies JWT signature against secret configured in Kong consumers
   - Validates token expiration
   - Rejects invalid tokens (401 Unauthorized)

2. **JWT2Header Plugin** (custom):
   - Runs after JWT verification succeeds
   - Extracts claims from verified JWT payload
   - Injects claims as HTTP headers:
     - `X-Kong-Jwt-Claim-Uid` → from JWT claim `uid`
     - `X-Kong-Jwt-Claim-Sub` → from JWT claim `sub`
   - Headers are passed to backend services

### Backend Usage

Backend services read user info from headers:

```java
// Spring Boot example
String userId = request.getHeader("X-Kong-Jwt-Claim-Uid");
String username = request.getHeader("X-Kong-Jwt-Claim-Sub");
```

This eliminates the need for backend services to:
- Parse JWT tokens
- Verify JWT signatures
- Handle JWT expiration

All authentication logic is centralized at Kong Gateway level.

## 📚 Additional Documentation

- [Database Design](./DB.md) - MongoDB schema and relationships
- [Voice/Video Calls Flow](./VOICE_VIDEO_CALLS_FLOW.md) - WebRTC implementation details

## 🐛 Troubleshooting

### Kong not loading config
```bash
docker-compose restart kong
sleep 30
curl -X POST http://localhost:8001/config -F "config=@kong.yml"
```

### Services not accessible
```bash
# Check all services status
docker-compose ps

# Check Kong routes
curl http://localhost:8001/routes

# Check service health
curl http://localhost:8080/actuator/health
```

### JWT token issues
```bash
# Verify JWT secret in Kong
curl http://localhost:8001/jwt-secrets

# Test with valid token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/users/me
```

## 📝 License

See [LICENSE](./LICENSE) file for details.
