package com.prac4toeic.modules.vocabulary.controller;

import com.prac4toeic.common.annotation.RateLimit;
import com.prac4toeic.common.dto.ApiResponse;
import com.prac4toeic.modules.vocabulary.document.VocabularyDocument;
import com.prac4toeic.modules.vocabulary.service.VocabularySearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vocabularies")
@RequiredArgsConstructor
public class VocabularySearchController {

    private final VocabularySearchService searchService;

    // API Tìm kiếm thông minh (Fuzzy Search & Auto-complete), giới hạn 60 request / 60s
    @GetMapping("/search")
    @RateLimit(key = "vocab_search", maxRequests = 60, windowSeconds = 60)
    public ResponseEntity<ApiResponse<List<VocabularyDocument>>> search(
            @RequestParam String keyword) {
        List<VocabularyDocument> results = searchService.searchFuzzy(keyword);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    // Index từ vựng mới vào Elasticsearch
    @PostMapping("/search/index")
    public ResponseEntity<ApiResponse<VocabularyDocument>> indexVocabulary(
            @RequestBody VocabularyDocument doc) {
        VocabularyDocument saved = searchService.indexVocabulary(doc);
        return ResponseEntity.ok(ApiResponse.success("Đã index từ vựng thành công", saved));
    }
}
