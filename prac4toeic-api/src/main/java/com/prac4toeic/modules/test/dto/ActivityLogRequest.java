package com.prac4toeic.modules.test.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ActivityLogRequest(
        @JsonProperty("event_type") String eventType,
        @JsonProperty("question_id") Long questionId,
        Object metadata
) {
}
