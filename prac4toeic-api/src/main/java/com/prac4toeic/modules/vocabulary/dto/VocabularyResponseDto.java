package com.prac4toeic.modules.vocabulary.dto;

public record VocabularyResponseDto(
        Long id,
        Long topicId,
        String topicName,
        String word,
        String phonetic,
        String partOfSpeech,
        String meaningVi,
        String exampleEn,
        String exampleVi,
        String audioUrl
) {
}
