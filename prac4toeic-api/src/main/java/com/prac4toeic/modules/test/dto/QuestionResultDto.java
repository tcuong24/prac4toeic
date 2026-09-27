package com.prac4toeic.modules.test.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record QuestionResultDto(Long questionId, String selectedAnswer,
                                String correctAnswer, boolean correct, String explanation) {
}
