package com.prac4toeic.modules.test.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prac4toeic.common.exception.AppException;
import com.prac4toeic.common.exception.ErrorCode;
import com.prac4toeic.modules.test.dto.ActivityLogRequest;
import com.prac4toeic.modules.test.dto.QuestionResultDto;
import com.prac4toeic.modules.test.dto.TestResultDto;
import com.prac4toeic.modules.test.dto.UpdateAnswerRequest;
import com.prac4toeic.modules.test.entity.*;
import com.prac4toeic.modules.test.repository.TestActivityLogRepository;
import com.prac4toeic.modules.test.repository.TestAttemptAnswerRepository;
import com.prac4toeic.modules.test.repository.TestAttemptRepository;
import com.prac4toeic.modules.test.repository.TestQuestionRepository;
import com.prac4toeic.modules.test.repository.TestRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TestAttemptService {

    private final TestAttemptRepository attemptRepo;
    private final TestAttemptAnswerRepository answerRepo;
    private final TestActivityLogRepository activityLogRepo;
    private final TestRepository testRepo;
    private final TestQuestionRepository questionRepo;
    private final ObjectMapper objectMapper;
    private final com.prac4toeic.modules.result.service.ResultService resultService;

    @Transactional
    public TestAttempt createAttempt(Long testId, Long userId) {
        if (userId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        attemptRepo.findByUserIdAndTestIdAndStatus(userId, testId, AttemptStatus.IN_PROGRESS)
                .ifPresent(existing -> {
                    throw new AppException(ErrorCode.CONFLICT_TEST);
                });

        Test test = testRepo.findById(testId).orElseThrow(() -> new AppException(ErrorCode.TEST_NOT_FOUND));

        TestAttempt attempt = new TestAttempt();
        attempt.setTestId(testId);
        attempt.setUserId(userId);
        attempt.setStatus(AttemptStatus.IN_PROGRESS);
        attempt.setCurrentQuestionIndex(0);
        attempt.setStartedAt(Instant.now());
        attempt.setLastActivityAt(Instant.now());
        attempt.setDurationMinutes(test.getDurationMinutes());

        return attemptRepo.save(attempt);
    }

    public Optional<TestAttempt> findCurrentInProgress(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return attemptRepo.findFirstByUserIdAndStatusOrderByStartedAtDesc(userId, AttemptStatus.IN_PROGRESS);
    }

    @Transactional
    public TestAttemptAnswer updateAnswer(Long attemptId, Long userId, UpdateAnswerRequest req) {
        TestAttempt attempt = getOwnedInProgressAttempt(attemptId, userId);

        TestAttemptAnswer answer = answerRepo.findByAttemptIdAndQuestionId(attemptId, req.questionId())
                .orElseGet(() -> {
                    TestAttemptAnswer a = new TestAttemptAnswer();
                    a.setAttemptId(attemptId);
                    a.setQuestionId(req.questionId());
                    return a;
                });

        // Rule: tăng answer_change_count nếu đổi đáp án đã chọn trước đó
        if (answer.getSelectedAnswer() != null && !answer.getSelectedAnswer().equals(req.answerId())) {
            answer.setAnswerChangeCount(answer.getAnswerChangeCount() + 1);
        }
        answer.setSelectedAnswer(req.answerId());
        answer.setUpdatedAt(Instant.now());

        attempt.setLastActivityAt(Instant.now());
        attemptRepo.save(attempt);
        return answerRepo.save(answer);
    }

    public void logActivity(Long attemptId, Long userId, ActivityLogRequest req) {
        getOwnedInProgressAttempt(attemptId, userId); // validate ownership

        TestActivityLog log = new TestActivityLog();
        log.setAttemptId(attemptId);
        log.setEventType(req.eventType());
        log.setQuestionId(req.questionId());
        log.setMetadata(toJson(req.metadata()));
        log.setCreatedAt(Instant.now());
        activityLogRepo.save(log);
    }

    @Transactional
    public TestResultDto submit(Long attemptId, Long userId) {
        TestAttempt attempt = getOwnedInProgressAttempt(attemptId, userId);
        attempt.setStatus(AttemptStatus.COMPLETED);
        attempt.setSubmittedAt(Instant.now());
        attemptRepo.save(attempt);

        TestResultDto result = calculateResult(attempt);
        resultService.saveResult(
                attempt.getId(),
                attempt.getUserId(),
                attempt.getTestId(),
                result.toeicScoreListening(),
                result.toeicScoreReading(),
                result.totalCorrect(),
                result.totalQuestions()
        );

        return result;
    }

    // Cron job — quét attempt bỏ dở
    @Scheduled(fixedRate = 15 * 60 * 1000) // mỗi 15 phút
    @Transactional
    public void abandonStaleAttempts() {
        Instant threshold = Instant.now().minus(30, ChronoUnit.MINUTES);
        List<TestAttempt> stale = attemptRepo.findByStatusAndLastActivityAtBefore(AttemptStatus.IN_PROGRESS, threshold);
        stale.forEach(a -> a.setStatus(AttemptStatus.ABANDONED));
        attemptRepo.saveAll(stale);
    }

    public TestResultDto getResult(Long attemptId, Long userId) {
        TestAttempt attempt = getOwnedAttempt(attemptId, userId);
        return calculateResult(attempt);
    }

    private TestAttempt getOwnedAttempt(Long attemptId, Long userId) {
        TestAttempt attempt = attemptRepo.findById(attemptId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Attempt không tồn tại"));

        if (userId == null || attempt.getUserId() == null || !attempt.getUserId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không có quyền truy cập attempt này");
        }

        return attempt;
    }

    private TestAttempt getOwnedInProgressAttempt(Long attemptId, Long userId) {
        TestAttempt attempt = getOwnedAttempt(attemptId, userId);
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS)
            throw new AppException(ErrorCode.CONFLICT_TEST, "Bài test đã kết thúc");
        return attempt;
    }

    private String toJson(Object metadata) {
        if (metadata == null)
            return null;
        if (metadata instanceof String s)
            return s;
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception e) {
            return metadata.toString();
        }
    }

    private TestResultDto calculateResult(TestAttempt attempt) {
        List<TestAttemptAnswer> userAnswers = answerRepo.findByAttemptId(attempt.getId());
        Map<Long, TestAttemptAnswer> answerMap = userAnswers.stream()
                .collect(Collectors.toMap(TestAttemptAnswer::getQuestionId, a -> a));

        List<CorrectAnswerProjection> correctAnswers = questionRepo.findCorrectAnswersByTestId(attempt.getTestId());

        List<QuestionResultDto> details = new ArrayList<>();
        int correctCount = 0;

        for (CorrectAnswerProjection q : correctAnswers) {
            TestAttemptAnswer userAnswer = answerMap.get(q.getQuestionId());
            String selected = userAnswer != null ? userAnswer.getSelectedAnswer() : null;
            boolean isCorrect = q.getCorrectAnswer().equals(selected);
            if (isCorrect)
                correctCount++;

            details.add(new QuestionResultDto(q.getQuestionId(), selected,
                    q.getCorrectAnswer(), isCorrect, q.getExplanation()));
        }

        int[] toeicScores = convertToToeicScore(correctCount, correctAnswers.size());

        return new TestResultDto(attempt.getId(), correctCount, correctAnswers.size(),
                toeicScores[0], toeicScores[1], details);
    }

    private int[] convertToToeicScore(int correct, int total) {
        double ratio = (double) correct / total;
        int listeningScore = (int) Math.round(ratio * 495 / 5) * 5;
        int readingScore = (int) Math.round(ratio * 495 / 5) * 5;
        return new int[] { listeningScore, readingScore };
    }

    @Scheduled(fixedRate = 5 * 60 * 1000)
    @Transactional
    public void handleExpiredAttempt() {
        Instant now = Instant.now();
        List<TestAttempt> expired = attemptRepo.findByStatusAndDeadlineAtBefore(AttemptStatus.IN_PROGRESS, now);
        for (TestAttempt a : expired) {
            a.setStatus(AttemptStatus.COMPLETED);
            a.setSubmittedAt(now);
            attemptRepo.save(a);
        }
    }
}