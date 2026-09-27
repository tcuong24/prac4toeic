package com.prac4toeic.modules.test.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "test_attempts")
@FieldDefaults(level = AccessLevel.PRIVATE)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class TestAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "test_id", nullable = false)
    Long testId;

    @Column (name = "guest_id",length = 64)
    String guestId;

    @Column(name = "user_id", nullable = true)
    Long userId;

    @Enumerated(EnumType.STRING)
    AttemptStatus status;

    @Column(name = "current_question_index")
    Integer currentQuestionIndex;

    @Column(name = "started_at")
    Instant startedAt;

    @Column(name = "last_activity_at")
    Instant lastActivityAt;

    @Column(name = "submitted_at")
    Instant submittedAt;

    @Column(name = "duration_minutes")
    Integer durationMinutes;

    @Column(name = "deadline_at")
    private Instant deadlineAt;

    @PrePersist
    @PreUpdate
    public void computeDeadline() {
        if (startedAt != null && durationMinutes != null) {
            this.deadlineAt = startedAt.plus(durationMinutes, ChronoUnit.MINUTES);
        }
    }
}
