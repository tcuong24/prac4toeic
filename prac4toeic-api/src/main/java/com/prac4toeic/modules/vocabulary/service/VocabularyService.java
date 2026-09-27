package com.prac4toeic.modules.vocabulary.service;

import com.prac4toeic.modules.vocabulary.dto.VocabularyResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface VocabularyService {
    Page<VocabularyResponseDto> getVocabularies(Long topicId, Pageable pageable);
    List<VocabularyResponseDto> search(String query);
    VocabularyResponseDto getById(Long id);
}
