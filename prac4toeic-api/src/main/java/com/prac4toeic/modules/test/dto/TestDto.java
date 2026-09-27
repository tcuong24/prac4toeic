package com.prac4toeic.modules.test.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TestDto(
        Long id,
        String title,
        Integer durationMinutes,
        Integer totalQuestions
) {}
