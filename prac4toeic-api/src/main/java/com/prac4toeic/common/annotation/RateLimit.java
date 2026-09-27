package com.prac4toeic.common.annotation;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RateLimit {
    String key() default "api";    // Tên phân loại API (ví dụ: ai_speaking, ai_writing)
    int maxRequests() default 5;   // Số request tối đa
    int windowSeconds() default 60; // Khoảng thời gian (giây)
}
