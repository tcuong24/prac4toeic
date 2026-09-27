package com.prac4toeic.modules.test.repository;

import com.prac4toeic.modules.test.entity.TestPassage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestPassageRepository extends JpaRepository<TestPassage, Long> {
    List<TestPassage> findByTestId(Long testId);
}