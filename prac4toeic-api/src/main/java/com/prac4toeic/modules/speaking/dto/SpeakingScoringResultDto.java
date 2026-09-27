package com.prac4toeic.modules.speaking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpeakingScoringResultDto implements Serializable {
    private String submissionId;
    private Long userId;
    private Long questionId;
    private double pronunciationScore;
    private double accuracyScore;
    private String feedback;
    private String status; // "COMPLETED", "FAILED"
}
