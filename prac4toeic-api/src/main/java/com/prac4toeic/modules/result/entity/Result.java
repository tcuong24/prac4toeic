package com.prac4toeic.modules.result.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Result {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false, unique = true)
    private Long attemptId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "test_id", nullable = false)
    private Long testId;

    @Column(name = "listening_score")
    private int listeningScore;

    @Column(name = "reading_score")
    private int readingScore;

    @Column(name = "total_score")
    private int totalScore;

    @Column(name = "total_correct")
    private int totalCorrect;

    @Column(name = "total_questions")
    private int totalQuestions;

    @Column(name = "completed_at")
    private Instant completedAt;
}
