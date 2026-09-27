package com.prac4toeic.modules.result.service;

import com.prac4toeic.common.exception.AppException;
import com.prac4toeic.common.exception.ErrorCode;
import com.prac4toeic.modules.result.dto.ResultSummaryDto;
import com.prac4toeic.modules.result.entity.Result;
import com.prac4toeic.modules.result.repository.ResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResultService {

    private final ResultRepository resultRepository;

    @Transactional
    public Result saveResult(Long attemptId, Long userId, Long testId, int listeningScore, int readingScore, int totalCorrect, int totalQuestions) {
        int totalScore = listeningScore + readingScore;

        Result result = resultRepository.findByAttemptId(attemptId)
                .orElseGet(() -> Result.builder()
                        .attemptId(attemptId)
                        .userId(userId)
                        .testId(testId)
                        .build());

        result.setListeningScore(listeningScore);
        result.setReadingScore(readingScore);
        result.setTotalScore(totalScore);
        result.setTotalCorrect(totalCorrect);
        result.setTotalQuestions(totalQuestions);
        result.setCompletedAt(Instant.now());

        return resultRepository.save(result);
    }

    public List<ResultSummaryDto> getUserResults(Long userId) {
        if (userId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return resultRepository.findByUserIdOrderByCompletedAtDesc(userId).stream()
                .map(r -> new ResultSummaryDto(
                        r.getId(),
                        r.getAttemptId(),
                        r.getTestId(),
                        r.getListeningScore(),
                        r.getReadingScore(),
                        r.getTotalScore(),
                        r.getTotalCorrect(),
                        r.getTotalQuestions(),
                        r.getCompletedAt()
                ))
                .toList();
    }

    public ResultSummaryDto getResultByAttempt(Long attemptId, Long userId) {
        Result result = resultRepository.findByAttemptIdAndUserId(attemptId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy kết quả bài thi"));

        return new ResultSummaryDto(
                result.getId(),
                result.getAttemptId(),
                result.getTestId(),
                result.getListeningScore(),
                result.getReadingScore(),
                result.getTotalScore(),
                result.getTotalCorrect(),
                result.getTotalQuestions(),
                result.getCompletedAt()
        );
    }
}
