package com.prac4toeic.modules.vocabulary.service.impl;

import com.prac4toeic.common.exception.AppException;
import com.prac4toeic.common.exception.ErrorCode;
import com.prac4toeic.modules.vocabulary.dto.VocabularyResponseDto;
import com.prac4toeic.modules.vocabulary.entity.Vocabulary;
import com.prac4toeic.modules.vocabulary.mapper.VocabularyMapper;
import com.prac4toeic.modules.vocabulary.repository.VocabularyRepository;
import com.prac4toeic.modules.vocabulary.service.VocabularyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VocabularyServiceImpl implements VocabularyService {

    private final VocabularyRepository vocabularyRepository;
    private final VocabularyMapper vocabularyMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<VocabularyResponseDto> getVocabularies(Long topicId, Pageable pageable) {
        Page<Vocabulary> page = (topicId != null)
                ? vocabularyRepository.findByTopicId(topicId, pageable)
                : vocabularyRepository.findAll(pageable);

        return page.map(vocabularyMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VocabularyResponseDto> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return vocabularyRepository.searchByQuery(query.trim())
                .stream()
                .map(vocabularyMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public VocabularyResponseDto getById(Long id) {
        Vocabulary vocabulary = vocabularyRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        return vocabularyMapper.toDto(vocabulary);
    }
}
