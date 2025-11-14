# 🧩 Database Design — Chat Application

**Database Engine:** MongoDB  
**Design Principle:** Tách `participants` ra bảng riêng để tránh quan hệ many-to-many giữa `User` và `Conversation`.  
**Normalization:** Equivalent to 3NF (giảm trùng lặp dữ liệu, dễ mở rộng).  

---

## 1️⃣ User (Người dùng)

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Định danh người dùng |
| `username` | string | **Unique, Required** | Tên đăng nhập |
| `hashedPassword` | string | **Required** | Mật khẩu mã hoá |
| `displayName` | string | **Required** | Tên hiển thị |
| `email` | string | **Unique** | Email người dùng |
| `avatarUrl` | string |  | URL ảnh đại diện |
| `avatarId` | string |  | ID ảnh (nếu dùng storage) |
| `bio` | string |  | Giới thiệu ngắn |
| `phone` | string |  | Số điện thoại |
| `createdAt` | datetime | default: now | Ngày tạo |
| `updatedAt` | datetime | auto-updated | Ngày cập nhật |

📘 **Indexes**
- username  
- email  

---

## 2️⃣ FriendRequest (Yêu cầu kết bạn)

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Định danh yêu cầu |
| `from` | User (ref) | **Required** | Người gửi yêu cầu |
| `to` | User (ref) | **Required** | Người nhận yêu cầu |
| `message` | string |  | Tin nhắn kèm theo |
| `createdAt` | datetime | default: now | Thời điểm gửi |
| `updatedAt` | datetime | auto-updated | Thời điểm cập nhật |

📘 **Indexes**
- (from, to)

---

## 3️⃣ Friend (Bạn bè)

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Định danh quan hệ bạn bè |
| `userA` | User (ref) | **Required** | Người dùng A |
| `userB` | User (ref) | **Required** | Người dùng B |
| `createdAt` | datetime | default: now | Thời điểm trở thành bạn |
| `updatedAt` | datetime | auto-updated | Thời điểm cập nhật |

📘 **Indexes**
- (userA, userB) – unique  
- (userB, userA)

---

## 4️⃣ Conversation (Cuộc trò chuyện)

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Định danh cuộc trò chuyện |
| `type` | enum(`direct`, `group`) | **Required** | Loại trò chuyện |
| `group.name` | string |  | Tên nhóm (nếu group) |
| `group.createdBy` | User (ref) |  | Người tạo nhóm |
| `group.avatarUrl` | string |  | Ảnh nhóm |
| `lastMessage.content` | string |  | Nội dung tin cuối cùng |
| `lastMessage.createdAt` | datetime |  | Thời điểm tin cuối cùng |
| `lastMessage.sender` | User (ref) |  | Người gửi tin cuối cùng |
| `createdAt` | datetime | default: now | Ngày tạo |
| `updatedAt` | datetime | auto-updated | Ngày cập nhật |

📘 **Indexes**
- `lastMessage.createdAt`
- `type`

---

## 5️⃣ Participant (Thành viên cuộc trò chuyện)

> ✅ **Bảng trung gian (link table)** giữa `User` và `Conversation`.

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Định danh bản ghi |
| `conversationId` | Conversation (ref) | **Required** | Cuộc trò chuyện |
| `userId` | User (ref) | **Required** | Người tham gia |
| `joinedAt` | datetime | default: now | Ngày tham gia |
| `role` | enum(`admin`, `member`) | default: `member` | Vai trò trong nhóm |
| `isActive` | boolean | default: true | Còn trong nhóm không |
| `lastSeenAt` | datetime | nullable | Lần xem tin cuối |
| `unreadCount` | number | default: 0 | Số tin chưa đọc |
| `createdAt` | datetime | default: now | Ngày tạo bản ghi |
| `updatedAt` | datetime | auto-updated | Ngày cập nhật |

📘 **Indexes**
- (conversationId, userId) — unique  
- (userId, isActive)  
- (conversationId, isActive)

> 💡 Mục đích:
> - Tránh quan hệ many-to-many trực tiếp giữa `User` và `Conversation`
> - Dễ scale khi conversation có hàng nghìn user (giống Discord)

---

## 6️⃣ Message (Tin nhắn)

| Field | Type | Constraints | Description |
|--------|------|-------------|--------------|
| `id` | string | **Primary Key** | Định danh tin nhắn |
| `senderId` | User (ref) | **Required** | Người gửi |
| `conversationId` | Conversation (ref) | **Required** | Cuộc trò chuyện |
| `content` | string |  | Nội dung tin nhắn |
| `imageUrl` | string |  | Ảnh đính kèm |
| `createdAt` | datetime | default: now | Ngày gửi |
| `updatedAt` | datetime | auto-updated | Ngày cập nhật |

📘 **Indexes**
- (conversationId, createdAt)
- (senderId)

---

## 🔗 Entity Relationship Overview

| From | Relationship | To | Type |
|-------|---------------|----|------|
| `User` | 1—n | `FriendRequest.from / to` | Request gửi/nhận |
| `User` | n—n | `Friend` | Quan hệ bạn bè |
| `User` | 1—n | `Participant.userId` | Tham gia nhiều cuộc trò chuyện |
| `Conversation` | 1—n | `Participant.conversationId` | Có nhiều thành viên |
| `Conversation` | 1—n | `Message` | Chứa nhiều tin nhắn |
| `User` | 1—n | `Message.senderId` | Gửi nhiều tin nhắn |

---

## 🧠 Design Highlights

- ✅ `Participant` giúp **mở rộng quy mô dễ dàng** (Discord-style scalability)  
- ⚡ Tối ưu cho truy vấn **conversation list** và **unread counter**  
- 🔒 `FriendRequest` + `Friend` giúp **logic kết bạn rõ ràng**  
- 📈 Có thể **shard theo `conversationId`** để scale out hệ thống  

---
