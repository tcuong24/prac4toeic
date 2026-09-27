package com.prac4toeic.modules.test.controller;

import com.prac4toeic.common.dto.ApiResponse;
import com.prac4toeic.modules.test.dto.TestDataDto;
import com.prac4toeic.modules.test.dto.TestDto;
import com.prac4toeic.modules.test.service.TestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
public class TestController {

    private final TestService testService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TestDto>>> getAllTests() {
        List<TestDto> tests = testService.getAllActiveTests();
        return ResponseEntity.ok(ApiResponse.success(tests));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TestDataDto>> getTestById(@PathVariable Long id) {
        TestDataDto test = testService.getTestById(id);
        return ResponseEntity.ok(ApiResponse.success(test));
    }
}
