package com.prac4toeic.modules.test.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.Instant;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AttemptDto(Long id, Long testId, String status,
                         Integer currentQuestionIndex, Instant startedAt,
                         Integer durationMinutes, Long remainingSeconds) {
}
