package com.prac4toeic.modules.test.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "test_passages")
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TestPassage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_id", nullable = false)
    private Long testId;

    private Integer part;

    @Column(name = "passage_type")
    private String passageType; // SINGLE, DOUBLE, TRIPLE

    @Column(columnDefinition = "TEXT")
    private String content;
}