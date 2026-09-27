package com.prac4toeic.modules.test.service;

import com.prac4toeic.modules.test.dto.TestAttemptDraftDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class TestAttemptRedisService {

    private static final String PREFIX = "test:attempt:";

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    // 1. Tạo hoặc Cập nhật bản lưu nháp trên Redis
    public void saveDraft(TestAttemptDraftDto draft, long durationMinutes) {
        String key = PREFIX + draft.getAttemptId();

        // Lưu toàn bộ DTO nháp vào Redis
        redisTemplate.opsForValue().set(key, draft);

        // Đặt TTL cho key = Thời gian làm bài + 15 phút gia hạn
        redisTemplate.expire(key, Duration.ofMinutes(durationMinutes + 15));
    }

    // 2. Lấy bản lưu nháp từ Redis (Dùng khi học viên F5 hoặc rớt mạng vào lại)
    public TestAttemptDraftDto getDraft(Long attemptId) {
        String key = PREFIX + attemptId;
        Object data = redisTemplate.opsForValue().get(key);
        if (data instanceof TestAttemptDraftDto) {
            return (TestAttemptDraftDto) data;
        }
        return null;
    }

    // 3. Xóa bản lưu nháp trên Redis khi đã nộp bài thành công
    public void deleteDraft(Long attemptId) {
        String key = PREFIX + attemptId;
        redisTemplate.delete(key);
    }
}
