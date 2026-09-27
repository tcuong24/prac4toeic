package com.prac4toeic.modules.vocabulary.service;

import com.prac4toeic.modules.vocabulary.document.VocabularyDocument;
import com.prac4toeic.modules.vocabulary.repository.VocabularyElasticRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VocabularySearchService {

    private final VocabularyElasticRepository elasticRepository;
    private final ElasticsearchOperations elasticsearchOperations;

    // 1. Fuzzy Search: Cho phép tìm gần đúng khi gõ sai chính tả (ví dụ gõ "accommodasion" -> "accommodation")
    public List<VocabularyDocument> searchFuzzy(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return List.of();
        }

        try {
            NativeQuery query = NativeQuery.builder()
                    .withQuery(q -> q.multiMatch(m -> m
                            .fields("word^3", "meaningVi^2", "exampleSentence")
                            .query(keyword)
                            .fuzziness("AUTO") // Tự động gợi ý khi gõ sai 1-2 ký tự
                    ))
                    .withPageable(PageRequest.of(0, 20))
                    .build();

            SearchHits<VocabularyDocument> hits = elasticsearchOperations.search(query, VocabularyDocument.class);
            return hits.stream().map(SearchHit::getContent).toList();
        } catch (Exception e) {
            log.warn("⚠️ Fallback DB search due to ES connection/query issue: {}", e.getMessage());
            return elasticRepository.findByWordContainingOrMeaningViContaining(keyword, keyword);
        }
    }

    // 2. Index dữ liệu từ vựng mới vào Elasticsearch
    public VocabularyDocument indexVocabulary(VocabularyDocument doc) {
        return elasticRepository.save(doc);
    }
}
