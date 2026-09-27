package com.prac4toeic.modules.result.controller;

import com.prac4toeic.common.annotation.RateLimit;
import com.prac4toeic.common.dto.ApiResponse;
import com.prac4toeic.common.exception.AppException;
import com.prac4toeic.common.exception.ErrorCode;
import com.prac4toeic.modules.result.dto.ResultSummaryDto;
import com.prac4toeic.modules.result.service.ResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/results")
@RequiredArgsConstructor
public class ResultController {

    private final ResultService resultService;

    // Giới hạn 30 request / 60 giây đối với API lấy danh sách kết quả học viên
    @GetMapping("/my-results")
    @RateLimit(key = "user_results", maxRequests = 30, windowSeconds = 60)
    public ResponseEntity<ApiResponse<List<ResultSummaryDto>>> getMyResults(
            @AuthenticationPrincipal Object user) {
        Long userId = getUserId(user);
        List<ResultSummaryDto> results = resultService.getUserResults(userId);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    // Giới hạn 30 request / 60 giây đối với API lấy chi tiết kết quả lượt thi
    @GetMapping("/attempts/{attemptId}")
    @RateLimit(key = "attempt_result", maxRequests = 30, windowSeconds = 60)
    public ResponseEntity<ApiResponse<ResultSummaryDto>> getAttemptResult(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal Object user) {
        Long userId = getUserId(user);
        ResultSummaryDto result = resultService.getResultByAttempt(attemptId, userId);
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
}
