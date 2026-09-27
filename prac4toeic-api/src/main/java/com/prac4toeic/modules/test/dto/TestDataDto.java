package com.prac4toeic.modules.test.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TestDataDto(
        Long id,
        String title,
        Integer durationMinutes,
        List<TestQuestionDto> questions
) {}
