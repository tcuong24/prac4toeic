package com.prac4toeic.modules.test.entity;

public interface CorrectAnswerProjection {
    Long getQuestionId();
    String getCorrectAnswer();
    String getExplanation();
}
