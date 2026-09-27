package com.prac4toeic.modules.vocabulary.repository;

import com.prac4toeic.modules.vocabulary.entity.Vocabulary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {

    Page<Vocabulary> findByTopicId(Long topicId, Pageable pageable);

    @Query("SELECT v FROM Vocabulary v WHERE LOWER(v.word) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(v.meaningVi) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Vocabulary> searchByQuery(@Param("query") String query);
}
