package com.prac4toeic.modules.test.repository;

import com.prac4toeic.modules.test.entity.AttemptStatus;
import com.prac4toeic.modules.test.entity.TestAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TestAttemptRepository extends JpaRepository<TestAttempt, Long> {
    Optional<TestAttempt> findByUserIdAndTestIdAndStatus(Long userId, Long testId, AttemptStatus status);
    Optional<TestAttempt> findFirstByUserIdAndStatusOrderByStartedAtDesc(Long userId, AttemptStatus status);
    List<TestAttempt> findByStatusAndLastActivityAtBefore(AttemptStatus status, Instant threshold);
    List<TestAttempt> findByStatusAndDeadlineAtBefore(AttemptStatus status, Instant now);
}
