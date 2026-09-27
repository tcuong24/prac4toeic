package com.prac4toeic.modules.result.dto;

import java.time.Instant;

public record ResultSummaryDto(
        Long id,
        Long attemptId,
        Long testId,
        int listeningScore,
        int readingScore,
        int totalScore,
        int totalCorrect,
        int totalQuestions,
        Instant completedAt
) {}
