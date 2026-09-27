package com.prac4toeic.modules.test.service;

import com.prac4toeic.common.exception.AppException;
import com.prac4toeic.common.exception.ErrorCode;
import com.prac4toeic.modules.test.dto.TestDataDto;
import com.prac4toeic.modules.test.dto.TestDto;
import com.prac4toeic.modules.test.dto.TestOptionDto;
import com.prac4toeic.modules.test.dto.TestQuestionDto;
import com.prac4toeic.modules.test.entity.Test;
import com.prac4toeic.modules.test.entity.TestPassage;
import com.prac4toeic.modules.test.entity.TestQuestion;
import com.prac4toeic.modules.test.repository.TestPassageRepository;
import com.prac4toeic.modules.test.repository.TestQuestionRepository;
import com.prac4toeic.modules.test.repository.TestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TestService {

    private final TestRepository testRepo;
    private final TestQuestionRepository questionRepo;
    private final TestPassageRepository passageRepo;

    public List<TestDto> getAllActiveTests() {
        return testRepo.findByActiveTrue().stream()
                .map(this::toTestDto)
                .collect(Collectors.toList());
    }

    public TestDataDto getTestById(Long testId) {
        Test test = testRepo.findById(testId)
                .orElseThrow(() -> new AppException(ErrorCode.TEST_NOT_FOUND));

        List<TestQuestion> questions = questionRepo.findByTestIdOrderByQuestionOrderAsc(testId);
        
        List<Long> passageIds = questions.stream()
                .filter(q -> q.getPassageId() != null)
                .map(TestQuestion::getPassageId)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, String> passageMap = passageRepo.findAllById(passageIds).stream()
                .collect(Collectors.toMap(TestPassage::getId, TestPassage::getContent));

        List<TestQuestionDto> questionDtos = questions.stream()
                .map(q -> toQuestionDto(q, passageMap.get(q.getPassageId())))
                .collect(Collectors.toList());

        return new TestDataDto(
                test.getId(),
                test.getTitle(),
                test.getDurationMinutes(),
                questionDtos
        );
    }

    private TestDto toTestDto(Test test) {
        return new TestDto(
                test.getId(),
                test.getTitle(),
                test.getDurationMinutes(),
                test.getTotalQuestions()
        );
    }

    private TestQuestionDto toQuestionDto(TestQuestion q, String passageContent) {
        List<TestOptionDto> options = new ArrayList<>();
        if (q.getOptionA() != null && !q.getOptionA().isBlank()) options.add(new TestOptionDto("A", q.getOptionA()));
        if (q.getOptionB() != null && !q.getOptionB().isBlank()) options.add(new TestOptionDto("B", q.getOptionB()));
        if (q.getOptionC() != null && !q.getOptionC().isBlank()) options.add(new TestOptionDto("C", q.getOptionC()));
        if (q.getOptionD() != null && !q.getOptionD().isBlank()) options.add(new TestOptionDto("D", q.getOptionD()));

        return new TestQuestionDto(
                q.getId(),
                q.getPart(),
                q.getQuestionOrder(),
                q.getAudioUrl(),
                q.getImageUrl(),
                passageContent,
                q.getContent(),
                options,
                q.getPassageId()
        );
    }
}
