package com.example.server.call.model;

public enum CallStatus {
    INITIATED,  // Call vừa được tạo, đang chờ answer
    RINGING,    // Đang đổ chuông (optional, có thể bỏ qua)
    ANSWERED,   // Call đã được answer, đang active
    ENDED,      // Call đã kết thúc
    REJECTED,   // Call bị từ chối
    MISSED      // Call không được answer (timeout)
}

