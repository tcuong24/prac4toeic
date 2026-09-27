package com.prac4toeic.common.aspect;

import com.prac4toeic.common.annotation.RateLimit;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

@Aspect
@Component
public class RateLimitAspect {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Around("@annotation(rateLimit)")
    public Object interceptRateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        // Lấy thông tin user hiện tại (hoặc IP)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";

        // Tạo key Redis dạng: rate_limit:ai_speaking:user_123
        String redisKey = String.format("rate_limit:%s:%s", rateLimit.key(), identifier);

        // Sử dụng lệnh INCR của Redis
        Long currentCount = stringRedisTemplate.opsForValue().increment(redisKey);

        if (currentCount != null && currentCount == 1) {
            // Nếu là request đầu tiên trong window -> đặt TTL
            stringRedisTemplate.expire(redisKey, Duration.ofSeconds(rateLimit.windowSeconds()));
        }

        // Kiểm tra vượt quá giới hạn
        if (currentCount != null && currentCount > rateLimit.maxRequests()) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    String.format("Bạn đã vượt quá giới hạn %d lần/ %d giây. Vui lòng thử lại sau!",
                            rateLimit.maxRequests(), rateLimit.windowSeconds())
            );
        }

        return joinPoint.proceed();
    }
}
