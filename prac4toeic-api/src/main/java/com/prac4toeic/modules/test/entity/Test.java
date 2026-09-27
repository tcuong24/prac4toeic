package com.prac4toeic.modules.test.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Entity
@Table(name = "tests")
@Setter
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Test {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false)
    String title;

    @Column(name = "test_type")
    @Enumerated(EnumType.STRING)
    TestType testType; // FULL_TEST, MINI_TEST, PLACEMENT_TEST

    @Column(name = "duration_minutes", nullable = false)
    Integer durationMinutes;

    @Column(name = "total_questions")
    Integer totalQuestions;

    boolean active = true;

    @Column(name = "created_at")
    Instant createdAt;
}
