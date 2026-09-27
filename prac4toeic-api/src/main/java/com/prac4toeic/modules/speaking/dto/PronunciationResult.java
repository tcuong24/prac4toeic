package com.prac4toeic.modules.speaking.dto;

import java.util.List;

public record PronunciationResult(double accuracyScore,
                                  double phonemeErrorRate,
                                  double wordErrorRate,
                                  double overallScore,
                                  List<WordScore> wordLevelDetail) {
    public record WordScore(
            String word,
            double score,
            boolean flaggedMispronounced
    ) {
    }
}
