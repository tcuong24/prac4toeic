package com.prac4toeic.modules.result.repository;

import com.prac4toeic.modules.result.entity.Result;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResultRepository extends JpaRepository<Result, Long> {
    List<Result> findByUserIdOrderByCompletedAtDesc(Long userId);
    Optional<Result> findByAttemptId(Long attemptId);
    Optional<Result> findByAttemptIdAndUserId(Long attemptId, Long userId);
}
