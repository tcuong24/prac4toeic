package com.prac4toeic.modules.test.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "test_questions")
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_id", nullable = false)
    private Long testId;

    @Column(nullable = false)
    private Integer part; // 1-7

    @Column(name = "question_order")
    private Integer questionOrder; // thứ tự hiển thị trong bài (1-200)

    @Column(name = "passage_id")
    private Long passageId; // nullable, dùng cho Part 6-7 (nhóm câu theo đoạn văn)

    @Column(name = "audio_url")
    private String audioUrl; // nullable, dùng cho Part 1-4

    @Column(name = "image_url")
    private String imageUrl; // nullable, dùng cho Part 1

    @Column(columnDefinition = "TEXT")
    private String content; // nội dung câu hỏi (nullable cho Part 1-2)

    @Column(name = "option_a")
    private String optionA;
    @Column(name = "option_b")
    private String optionB;
    @Column(name = "option_c")
    private String optionC;
    @Column(name = "option_d")
    private String optionD; // nullable — Part 2 chỉ có A/B/C

    @Column(name = "correct_answer", nullable = false)
    private String correctAnswer; // "A"/"B"/"C"/"D"

    @Column(columnDefinition = "TEXT")
    private String explanation;
}
