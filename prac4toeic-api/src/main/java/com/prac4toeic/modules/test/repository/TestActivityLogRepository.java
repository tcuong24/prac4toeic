package com.prac4toeic.modules.test.repository;

import com.prac4toeic.modules.test.entity.TestActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TestActivityLogRepository extends JpaRepository<TestActivityLog, Long> {
}
