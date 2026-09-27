package com.prac4toeic.modules.vocabulary.repository;

import com.prac4toeic.modules.vocabulary.entity.Topic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TopicRepository extends JpaRepository<Topic, Long> {
}
