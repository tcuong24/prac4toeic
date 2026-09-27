package com.prac4toeic.modules.vocabulary.dto;

import jakarta.validation.constraints.NotNull;

public record ReviewRequestDto(
        @NotNull(message = "Đánh giá không được để trống")
        ReviewGrade grade
) {
    public enum ReviewGrade {
        AGAIN,
        HARD,
        GOOD,
        EASY
    }
}
