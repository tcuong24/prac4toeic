package com.prac4toeic.modules.vocabulary.controller;

import com.prac4toeic.common.dto.ApiResponse;
import com.prac4toeic.modules.vocabulary.dto.VocabularyResponseDto;
import com.prac4toeic.modules.vocabulary.service.VocabularyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/vocabulary")
@RequiredArgsConstructor
@Tag(name = "Vocabulary", description = "Các API tra cứu, học và ôn tập từ vựng TOEIC")
public class VocabularyController {

    private final VocabularyService vocabularyService;

    @GetMapping
    @Operation(summary = "Lấy danh sách từ vựng theo chủ đề (có phân trang)")
    public ResponseEntity<ApiResponse<Page<VocabularyResponseDto>>> getVocabularies(
            @RequestParam(required = false) Long topicId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<VocabularyResponseDto> result = vocabularyService.getVocabularies(
                topicId,
                PageRequest.of(page, size, Sort.by("id").ascending())
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm từ vựng theo từ khóa")
    public ResponseEntity<ApiResponse<List<VocabularyResponseDto>>> search(
            @RequestParam String q
    ) {
        List<VocabularyResponseDto> result = vocabularyService.search(q);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết một từ vựng")
    public ResponseEntity<ApiResponse<VocabularyResponseDto>> getById(@PathVariable Long id) {
        VocabularyResponseDto result = vocabularyService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
