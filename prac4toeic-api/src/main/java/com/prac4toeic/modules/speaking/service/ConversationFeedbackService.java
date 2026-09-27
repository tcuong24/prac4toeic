package com.prac4toeic.modules.speaking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prac4toeic.modules.speaking.dto.ClientProxyMessages.SessionFeedback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * Calls Gemini REST API to generate end-of-session feedback from the conversation transcript.
 * This is separate from the Live API — it uses the standard generateContent endpoint.
 */
@Service
public class ConversationFeedbackService {

    private static final Logger log = LoggerFactory.getLogger(ConversationFeedbackService.class);

    private final WebClient geminiClient;
    private final ObjectMapper objectMapper;

    @Value("${application.ai.gemini.api-key}")
    private String apiKey;

    @Value("${application.ai.gemini.model:gemini-1.5-flash}")
    private String model;

    public ConversationFeedbackService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.geminiClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    /**
     * Analyzes the conversation transcript and returns bilingual (EN/VI) feedback.
     *
     * @param topic      conversation topic chosen by the user
     * @param transcript list of {role, text} pairs from the session
     * @return SessionFeedback with scores and bilingual feedback
     */
    public SessionFeedback generateFeedback(String topic, List<Map<String, String>> transcript) {
        if (transcript == null || transcript.isEmpty()) {
            return emptyFeedback();
        }

        String prompt = buildFeedbackPrompt(topic, transcript);

        try {
            String responseJson = geminiClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/{model}:generateContent")
                            .queryParam("key", apiKey)
                            .build(model))
                    .header("Content-Type", "application/json")
                    .bodyValue(Map.of(
                            "contents", List.of(Map.of(
                                    "role", "user",
                                    "parts", List.of(Map.of("text", prompt))
                            )),
                            "generationConfig", Map.of(
                                    "temperature", 0.4,
                                    "responseMimeType", "application/json"
                            )
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseFeedbackResponse(responseJson);
        } catch (Exception e) {
            log.error("Failed to generate conversation feedback", e);
            return emptyFeedback();
        }
    }

    private String buildFeedbackPrompt(String topic, List<Map<String, String>> transcript) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
                You are an expert TOEIC Speaking coach. Analyze this English conversation and provide detailed, \
                encouraging feedback for a Vietnamese learner practicing English.
                
                Topic: %s
                
                Conversation transcript:
                """.formatted(topic));

        for (Map<String, String> turn : transcript) {
            String role = turn.getOrDefault("role", "unknown");
            String text = turn.getOrDefault("text", "");
            sb.append("%s: %s\n".formatted(role.toUpperCase(), text));
        }

        sb.append("""
                
                Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
                {
                  "pronunciationFeedback": "Specific feedback on pronunciation patterns observed (English, 2-3 sentences)",
                  "grammarFeedback": "Specific feedback on grammar mistakes and correct structures (English, 2-3 sentences)",
                  "vocabularyFeedback": "Feedback on vocabulary usage and suggestions for better word choices (English, 2-3 sentences)",
                  "overallScore": <integer 1-10>,
                  "encouragement": "A motivating closing message in English",
                  "pronunciationFeedbackVi": "Vietnamese translation of pronunciationFeedback",
                  "grammarFeedbackVi": "Vietnamese translation of grammarFeedback",
                  "vocabularyFeedbackVi": "Vietnamese translation of vocabularyFeedback",
                  "encouragementVi": "Vietnamese translation of encouragement"
                }
                """);

        return sb.toString();
    }

    private SessionFeedback parseFeedbackResponse(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            String text = root
                    .path("candidates").get(0)
                    .path("content")
                    .path("parts").get(0)
                    .path("text")
                    .asText();

            JsonNode feedback = objectMapper.readTree(text);
            return new SessionFeedback(
                    "SESSION_FEEDBACK",
                    feedback.path("pronunciationFeedback").asText("Great job!"),
                    feedback.path("grammarFeedback").asText("Keep practicing!"),
                    feedback.path("vocabularyFeedback").asText("Good vocabulary use!"),
                    feedback.path("overallScore").asInt(7),
                    feedback.path("encouragement").asText("Keep it up!"),
                    feedback.path("pronunciationFeedbackVi").asText("Tốt lắm!"),
                    feedback.path("grammarFeedbackVi").asText("Tiếp tục luyện tập!"),
                    feedback.path("vocabularyFeedbackVi").asText("Dùng từ vựng tốt!"),
                    feedback.path("encouragementVi").asText("Cố lên!")
            );
        } catch (Exception e) {
            log.error("Failed to parse feedback JSON", e);
            return emptyFeedback();
        }
    }

    private SessionFeedback emptyFeedback() {
        return new SessionFeedback(
                "SESSION_FEEDBACK",
                "Keep practicing your English pronunciation!",
                "Focus on sentence structure and verb tenses.",
                "Try to expand your vocabulary on this topic.",
                5,
                "Great effort! Every conversation makes you better.",
                "Tiếp tục luyện phát âm tiếng Anh nhé!",
                "Chú ý cấu trúc câu và thì động từ.",
                "Hãy mở rộng vốn từ vựng về chủ đề này.",
                "Cố gắng lắm! Mỗi cuộc hội thoại giúp bạn tiến bộ hơn."
        );
    }
}
