# 🧩 Database Design — Chat Application

**Database Engine:** MongoDB  
**Design Principle:** Separate `participants` into a separate collection to avoid many-to-many relationship between `User` and `Conversation`.  
**Normalization:** Equivalent to 3NF (reduces data duplication, easy to extend).  

---

## 1️⃣ User

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | User identifier |
| `username` | string | **Unique, Required** | Username |
| `hashedPassword` | string | **Required** | Hashed password |
| `displayName` | string | **Required** | Display name |
| `email` | string | **Unique** | User email |
| `avatarUrl` | string |  | Avatar image URL |
| `avatarId` | string |  | Avatar image ID (if using storage) |
| `bio` | string |  | Short bio |
| `phone` | string |  | Phone number |
| `createdAt` | datetime | default: now | Creation date |
| `updatedAt` | datetime | auto-updated | Last update date |

📘 **Indexes**
- `username` (unique)  
- `email` (unique)  

---

## 2️⃣ FriendRequest

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Request identifier |
| `from` | string (User ref) | **Required** | Sender user ID |
| `to` | string (User ref) | **Required** | Receiver user ID |
| `message` | string |  | Optional message |
| `createdAt` | datetime | default: now | Creation date |
| `updatedAt` | datetime | auto-updated | Last update date |

📘 **Indexes**
- `(from, to)` - unique compound index

---

## 3️⃣ Friend

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Friendship identifier |
| `userA` | string (User ref) | **Required** | User A ID |
| `userB` | string (User ref) | **Required** | User B ID |
| `createdAt` | datetime | default: now | Friendship creation date |
| `updatedAt` | datetime | auto-updated | Last update date |

📘 **Indexes**
- `(userA, userB)` - unique compound index  
- `(userB, userA)` - compound index for reverse lookup

---

## 4️⃣ Conversation

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Conversation identifier |
| `type` | enum(`DIRECT`, `GROUP`) | **Required** | Conversation type |
| `groupName` | string |  | Group name (for GROUP type) |
| `groupCreatedByUserId` | string (User ref) |  | Group creator user ID |
| `groupAvatarUrl` | string |  | Group avatar URL |
| `lastMessageContent` | string |  | Last message content (snapshot) |
| `lastMessageCreatedAt` | datetime |  | Last message timestamp |
| `lastMessageSenderId` | string (User ref) |  | Last message sender ID |
| `pinnedMessageId` | string (Message ref) |  | Pinned message ID |
| `pinnedAt` | datetime |  | When message was pinned |
| `pinnedByUserId` | string (User ref) |  | User who pinned the message |
| `createdAt` | datetime | default: now | Creation date |
| `updatedAt` | datetime | auto-updated | Last update date |

📘 **Indexes**
- `type`
- `lastMessageCreatedAt`

---

## 5️⃣ ConversationParticipant

> ✅ **Link table** between `User` and `Conversation`.

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Participant record identifier |
| `conversationId` | string (Conversation ref) | **Required** | Conversation ID |
| `userId` | string (User ref) | **Required** | Participant user ID |
| `joinedAt` | datetime | default: now | Join date |
| `role` | enum(`ADMIN`, `MEMBER`) | default: `MEMBER` | Role in group |
| `isActive` | boolean | default: true | Active status |
| `lastSeenAt` | datetime | nullable | Last seen timestamp |
| `lastReadMessageId` | string (Message ref) | nullable | Last read message ID |
| `unreadCount` | number | default: 0 | Unread message count |
| `isFavorite` | boolean | default: false | Favorite status |
| `isMuted` | boolean | default: false | Mute status (no notifications) |
| `createdAt` | datetime | default: now | Creation date |
| `updatedAt` | datetime | auto-updated | Last update date |

📘 **Indexes**
- `(conversationId, userId)` - unique compound index  
- `(userId, isActive)` - compound index  
- `(conversationId, isActive)` - compound index

> 💡 Purpose:
> - Avoid direct many-to-many relationship between `User` and `Conversation`
> - Easy to scale when conversation has thousands of users (Discord-style)

---

## 6️⃣ Message

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Message identifier |
| `senderId` | string (User ref) | **Required** | Sender user ID |
| `conversationId` | string (Conversation ref) | **Required** | Conversation ID |
| `content` | string |  | Message content |
| `imageUrl` | string |  | Attached image URL |
| `messageId` | string | **Unique, Sparse** | Idempotency key (client or server-generated) |
| `createdAt` | datetime | default: now | Creation date |
| `originalCreatedAt` | datetime |  | Original creation time (never changes) |
| `updatedAt` | datetime | nullable | Update date (only set when edited) |
| `forwardedFromMessageId` | string (Message ref) | nullable | Original message ID if forwarded |
| `forwardedFromConversationId` | string (Conversation ref) | nullable | Original conversation ID |
| `forwardedFromSenderId` | string (User ref) | nullable | Original sender ID |
| `forwardedFromSenderName` | string | nullable | Original sender name (for display) |
| `forwardedAt` | datetime | nullable | Forward timestamp |

📘 **Indexes**
- `(conversationId, createdAt)` - compound index for conversation messages
- `senderId`
- `messageId` - unique sparse index (for idempotency)

---

## 7️⃣ Call

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Call identifier |
| `conversationId` | string (Conversation ref) | **Required** | DIRECT conversation ID |
| `callerId` | string (User ref) | **Required** | Caller user ID |
| `receiverId` | string (User ref) | **Required** | Receiver user ID |
| `type` | enum(`VOICE`, `VIDEO`) | **Required** | Call type |
| `status` | enum(`INITIATED`, `ANSWERED`, `REJECTED`, `ENDED`, `MISSED`) | **Required** | Call status |
| `startedAt` | datetime | default: now | Call initiation time |
| `answeredAt` | datetime | nullable | Call answer time |
| `endedAt` | datetime | nullable | Call end time |
| `endedBy` | string (User ref) | nullable | User who ended the call |
| `duration` | integer | nullable | Call duration in seconds |

📘 **Indexes**
- `conversationId`
- `callerId`
- `receiverId`

---

## 🔗 Entity Relationship Overview

| From | Relationship | To | Type |
|-------|---------------|----|------|
| `User` | 1—n | `FriendRequest.from / to` | Send/receive friend requests |
| `User` | n—n | `Friend` | Friendship relationship |
| `User` | 1—n | `ConversationParticipant.userId` | Participate in multiple conversations |
| `Conversation` | 1—n | `ConversationParticipant.conversationId` | Has multiple participants |
| `Conversation` | 1—n | `Message` | Contains multiple messages |
| `User` | 1—n | `Message.senderId` | Send multiple messages |
| `Conversation` | 1—n | `Call` | Has multiple call records (DIRECT only) |
| `User` | 1—n | `Call.callerId / receiverId` | Initiate/receive calls |

---

## 🧠 Design Highlights

- ✅ `ConversationParticipant` enables **easy scaling** (Discord-style scalability)  
- ⚡ Optimized for **conversation list** and **unread counter** queries  
- 🔒 `FriendRequest` + `Friend` provides **clear friend logic**  
- 📈 Can **shard by `conversationId`** to scale out the system  
- 💬 Message **idempotency** via `messageId` field  
- 📌 **Pinned messages** support for important messages  
- 🔔 **Mute and favorite** features for user preferences  
- 📞 **Call history** tracking for voice/video calls  

---
