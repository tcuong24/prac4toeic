package com.prac4toeic.common.aspect;

import com.prac4toeic.common.annotation.RateLimit;

import jakarta.servlet.http.HttpServletRequest;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;

@Aspect
@Component
public class RateLimitAspect {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;
    // Lua Script đảm bảo INCR và EXPIRE chạy Atomic 100% trên Redis Server
    private static final String RATE_LIMIT_LUA_SCRIPT = "local current = redis.call('INCR', KEYS[1]) " +
            "if tonumber(current) == 1 then " +
            "    redis.call('EXPIRE', KEYS[1], ARGV[1]) " +
            "end " +
            "return current";
    private final DefaultRedisScript<Long> redisScript;

    public RateLimitAspect() {
        this.redisScript = new DefaultRedisScript<>();
        this.redisScript.setScriptText(RATE_LIMIT_LUA_SCRIPT);
        this.redisScript.setResultType(Long.class);
    }

    @Around("@annotation(rateLimit)")
    public Object interceptRateLimit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        String identifier = getClientIdentifier();
        // Tạo Redis Key: rate_limit:key_name:identifier
        String redisKey = String.format("rate_limit:%s:%s", rateLimit.key(), identifier);
        // Thực thi Lua Script Atomic
        Long currentCount = stringRedisTemplate.execute(
                redisScript,
                Collections.singletonList(redisKey),
                String.valueOf(rateLimit.windowSeconds()));
        if (currentCount != null && currentCount > rateLimit.maxRequests()) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    String.format("Bạn đã vượt quá giới hạn %d lần/ %d giây. Vui lòng thử lại sau!",
                            rateLimit.maxRequests(), rateLimit.windowSeconds()));
        }
        return joinPoint.proceed();
    }

    private String getClientIdentifier() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return auth.getName();
        }
        // Lấy IP Client từ HttpServletRequest
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim(); // Lấy IP đầu tiên nếu đi qua nhiều Proxy
            }
            return request.getRemoteAddr();
        }
        return "unknown_ip";
    }
}
