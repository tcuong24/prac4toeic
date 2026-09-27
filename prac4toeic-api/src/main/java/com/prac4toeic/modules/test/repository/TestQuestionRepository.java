package com.prac4toeic.modules.test.repository;

import com.prac4toeic.modules.test.entity.CorrectAnswerProjection;
import com.prac4toeic.modules.test.entity.Test;
import com.prac4toeic.modules.test.entity.TestQuestion;
import com.prac4toeic.modules.test.entity.TestType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TestQuestionRepository extends JpaRepository<TestQuestion,Long> {
    List<TestQuestion> findByTestIdOrderByQuestionOrderAsc(Long testId);
    List<TestQuestion> findByPassageId(Long passageId);

    // dùng khi chấm điểm — chỉ lấy id + đáp án đúng, không cần load hết field
    @Query("SELECT q.id as questionId, q.correctAnswer as correctAnswer, q.explanation as explanation " +
            "FROM TestQuestion q WHERE q.testId = :testId")
    List<CorrectAnswerProjection> findCorrectAnswersByTestId(@Param("testId") Long testId);
}
