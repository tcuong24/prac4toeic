package com.prac4toeic.modules.test.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TestQuestionDto(
        Long id,
        Integer part,
        Integer questionNumber,
        String audioUrl,
        String imageUrl,
        String passage,
        String text,
        List<TestOptionDto> options,
        Long groupId
) {}
