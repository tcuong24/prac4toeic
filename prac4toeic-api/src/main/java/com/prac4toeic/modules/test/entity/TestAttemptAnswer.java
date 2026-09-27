package com.prac4toeic.modules.test.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;


@Entity
@Table(name = "test_attempt_answers",
        uniqueConstraints = @UniqueConstraint(columnNames = {"attempt_id", "question_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TestAttemptAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
     Long id;

    @Column(name = "attempt_id", nullable = false)
     Long attemptId;

    @Column(name = "question_id", nullable = false)
     Long questionId;

    @Column(name = "selected_answer")
     String selectedAnswer;

    @Builder.Default
    @Column(name = "is_flagged")
     boolean flagged = false;

    @Builder.Default
    @Column(name = "time_spent_seconds")
     Integer timeSpentSeconds = 0;

    @Builder.Default
    @Column(name = "answer_change_count")
     Integer answerChangeCount = 0;

    @Column(name = "updated_at")
    Instant updatedAt;
}