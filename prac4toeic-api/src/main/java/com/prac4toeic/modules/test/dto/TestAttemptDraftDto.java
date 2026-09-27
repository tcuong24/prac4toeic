package com.prac4toeic.modules.test.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestAttemptDraftDto implements Serializable {
    private Long attemptId;
    private Long testId;
    private Long userId;
    private Integer currentQuestionIndex;
    private Map<Integer, String> answers; // Key: questionId, Value: selectedAnswer (e.g. 15 -> "B")
    private Integer timeRemainingSeconds; // Thời gian còn lại (giây)
    private String lastUpdatedAt;
}
