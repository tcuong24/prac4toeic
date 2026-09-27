package com.prac4toeic.modules.test.controller;

import com.prac4toeic.common.dto.ApiResponse;
import com.prac4toeic.common.exception.AppException;
import com.prac4toeic.common.exception.ErrorCode;
import com.prac4toeic.modules.test.dto.ActivityLogRequest;
import com.prac4toeic.modules.test.dto.AttemptDto;
import com.prac4toeic.modules.test.dto.TestResultDto;
import com.prac4toeic.modules.test.dto.UpdateAnswerRequest;
import com.prac4toeic.modules.test.entity.TestAttempt;
import com.prac4toeic.modules.test.service.TestAttemptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
public class TestAttemptController {

    private final TestAttemptService service;

    @PostMapping("/{testId}/attempts")
    public ResponseEntity<ApiResponse<AttemptDto>> create(
            @PathVariable Long testId,
            @AuthenticationPrincipal Object user) {
        TestAttempt attempt = service.createAttempt(testId, getUserId(user));
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo bài test thành công", toDto(attempt)));
    }

    @GetMapping("/attempts/current")
    public ResponseEntity<ApiResponse<AttemptDto>> current(
            @AuthenticationPrincipal Object user) {
        return service.findCurrentInProgress(getUserId(user))
                .map(a -> ResponseEntity.ok(ApiResponse.success(toDto(a))))
                .orElse(ResponseEntity.ok(ApiResponse.success("Không có bài test đang làm dở", null)));
    }

    @PatchMapping("/attempts/{attemptId}/answers")
    public ResponseEntity<ApiResponse<Void>> updateAnswer(
            @PathVariable Long attemptId,
            @RequestBody UpdateAnswerRequest req,
            @AuthenticationPrincipal Object user) {
        service.updateAnswer(attemptId, getUserId(user), req);
        return ResponseEntity.ok(ApiResponse.success("Đã lưu đáp án", null));
    }

    @PostMapping("/attempts/{attemptId}/activity-log")
    public ResponseEntity<ApiResponse<Void>> logActivity(
            @PathVariable Long attemptId,
            @RequestBody ActivityLogRequest req,
            @AuthenticationPrincipal Object user) {
        service.logActivity(attemptId, getUserId(user), req);
        return ResponseEntity.accepted().body(ApiResponse.success("Đã ghi nhận", null));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<ApiResponse<TestResultDto>> submit(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal Object user) {
        TestResultDto result = service.submit(attemptId, getUserId(user));
        return ResponseEntity.ok(ApiResponse.success("Nộp bài thành công", result));
    }

    @GetMapping("/attempts/{attemptId}/result")
    public ResponseEntity<ApiResponse<TestResultDto>> getResult(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal Object user) {
        TestResultDto result = service.getResult(attemptId, getUserId(user));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private Long getUserId(Object principal) {
        if (principal instanceof Jwt jwt) {
            Object claim = jwt.getClaim("userId");
            if (claim instanceof Number num) {
                return num.longValue();
            } else if (claim != null) {
                try {
                    return Long.parseLong(claim.toString());
                } catch (NumberFormatException ignored) {}
            }
        }
        throw new AppException(ErrorCode.UNAUTHENTICATED);
    }

    private AttemptDto toDto(TestAttempt attempt) {
        if (attempt == null) return null;
        Long remainingSeconds = null;
        if (attempt.getStartedAt() != null && attempt.getDurationMinutes() != null) {
            long elapsedSeconds = Instant.now().getEpochSecond() - attempt.getStartedAt().getEpochSecond();
            long totalSeconds = attempt.getDurationMinutes() * 60L;
            remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
        }
        return new AttemptDto(
                attempt.getId(),
                attempt.getTestId(),
                attempt.getStatus() != null ? attempt.getStatus().name() : null,
                attempt.getCurrentQuestionIndex(),
                attempt.getStartedAt(),
                attempt.getDurationMinutes(),
                remainingSeconds
        );
    }
}