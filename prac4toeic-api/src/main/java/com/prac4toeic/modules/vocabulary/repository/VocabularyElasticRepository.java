package com.prac4toeic.modules.vocabulary.repository;

import com.prac4toeic.modules.vocabulary.document.VocabularyDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VocabularyElasticRepository extends ElasticsearchRepository<VocabularyDocument, String> {
    List<VocabularyDocument> findByWordContainingOrMeaningViContaining(String word, String meaningVi);
    List<VocabularyDocument> findByTopic(String topic);
}
