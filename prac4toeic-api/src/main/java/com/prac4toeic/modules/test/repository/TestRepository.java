package com.prac4toeic.modules.test.repository;

import com.prac4toeic.modules.test.entity.Test;
import com.prac4toeic.modules.test.entity.TestType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestRepository extends JpaRepository<Test,Long> {
    List<Test>findByActiveTrue();
    List<Test>findByTestType(TestType testType);
}
