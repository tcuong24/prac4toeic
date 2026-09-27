package com.prac4toeic.modules.speaking.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prac4toeic.modules.speaking.dto.ClientProxyMessages;
import com.prac4toeic.modules.speaking.service.ConversationFeedbackService;
import com.prac4toeic.modules.speaking.exception.GeminiUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * WebSocket handler that acts as a real-time conversational agent between:
 * Frontend (React) <──> This handler <──> Gemini REST API (gemini-flash-latest)
 *
 * Protocol:
 * 1. FE connects to /ws/speaking/conversation
 * 2. FE sends { "type": "START_SESSION", "topic": "..." }
 * 3. Handler initializes session, generates initial tutor greeting via Gemini
 * AI, sends SESSION_READY + AI_RESPONSE
 * 4. FE sends { "type": "USER_MESSAGE", "text": "..." } (from browser Speech
 * Recognition or text)
 * 5. Handler calls Gemini API with full conversation context, sends AI_RESPONSE
 * back to FE
 * 6. FE sends { "type": "END_SESSION" }
 * 7. Handler calls ConversationFeedbackService to evaluate TOEIC Speaking score
 * & generate bilingual report
 */
@Component
public class GeminiLiveProxyHandler extends AbstractWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GeminiLiveProxyHandler.class);
    private static final String GEMINI_MODEL = "gemini-flash-latest";
    private static final int MAX_RETRIES = 3;

    @Value("${application.ai.gemini.api-key}")
    private String apiKey;

    private final ObjectMapper objectMapper;
    private final ConversationFeedbackService feedbackService;
    private final WebClient geminiWebClient;

    // Per-session state keyed by frontend WebSocket session ID
    private final ConcurrentHashMap<String, LiveSession> sessions = new ConcurrentHashMap<>();

    // Circuit breaker / global rate limit tracker (timestamp until which Gemini calls should pause)
    private final AtomicLong globalRateLimitedUntil = new AtomicLong(0);

    public GeminiLiveProxyHandler(ObjectMapper objectMapper, ConversationFeedbackService feedbackService) {
        this.objectMapper = objectMapper;
        this.feedbackService = feedbackService;
        this.geminiWebClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Frontend WebSocket lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("Frontend connected: sessionId={}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode node = objectMapper.readTree(message.getPayload());
        String type = node.path("type").asText();

        switch (type) {
            case "START_SESSION" -> handleStartSession(session, node);
            case "USER_MESSAGE" -> handleUserMessage(session, node);
            case "AUDIO_CHUNK" -> handleAudioChunk(session, node);
            case "END_SESSION" -> handleEndSession(session);
            default -> log.warn("Unknown message type from frontend: {}", type);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("Frontend disconnected: sessionId={}, status={}", session.getId(), status);
        sessions.remove(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("Transport error for session {}", session.getId(), exception);
        sessions.remove(session.getId());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handlers
    // ─────────────────────────────────────────────────────────────────────────

    private void handleStartSession(WebSocketSession frontendSession, JsonNode node) {
        String topic = node.path("topic").asText("General TOEIC English Practice");
        log.info("Starting speaking session for topic='{}', frontendId={}", topic, frontendSession.getId());

        LiveSession ls = new LiveSession(frontendSession, topic);
        sessions.put(frontendSession.getId(), ls);

        // Notify frontend session is ready
        sendToFrontend(frontendSession, new ClientProxyMessages.SessionReady("SESSION_READY"));

        // Generate initial AI welcome message asynchronously
        generateAiResponse(ls, "Hello! I am ready to start practicing English with you.");
    }

    private void handleUserMessage(WebSocketSession session, JsonNode node) {
        LiveSession ls = sessions.get(session.getId());
        if (ls == null)
            return;

        String userText = node.path("text").asText().trim();
        if (userText.isEmpty())
            return;

        log.info("User message [{}]: {}", session.getId(), userText);
        ls.addTranscript("user", userText);

        // Notify frontend of user turn transcript echo if needed
        sendToFrontend(session, new ClientProxyMessages.TranscriptUpdate("TRANSCRIPT", "user", userText));

        // Generate AI response
        generateAiResponse(ls, null);
    }

    private void handleAudioChunk(WebSocketSession session, JsonNode node) {
        // Reserved for server-side STT if needed
        log.debug("Audio chunk received for session {}", session.getId());
    }

    private void handleEndSession(WebSocketSession session) {
        LiveSession ls = sessions.get(session.getId());
        if (ls == null)
            return;

        log.info("Ending session for frontendId={}", session.getId());
        ls.setEnded(true);

        generateAndSendFeedback(ls, session);
        sessions.remove(session.getId());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gemini REST Generation Logic with 429 / 503 Retry Logic
    // ─────────────────────────────────────────────────────────────────────────

    private Mono<JsonNode> callGeminiWithRetry(Map<String, Object> requestBody) {
        return Mono.defer(() -> {
            long now = System.currentTimeMillis();
            long waitTill = globalRateLimitedUntil.get();
            if (now < waitTill) {
                long secondsLeft = (waitTill - now) / 1000 + 1;
                log.warn("Gemini global rate limit active! Skipping call, {}s remaining", secondsLeft);
                return Mono.error(new GeminiUnavailableException(
                        "Gemini API rate limited (429). Please wait " + secondsLeft + "s", null));
            }

            return geminiWebClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/{model}:generateContent")
                            .queryParam("key", apiKey)
                            .build(GEMINI_MODEL))
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(JsonNode.class);
        }).retryWhen(Retry.from(retrySignals ->
            retrySignals.flatMap(signal -> {
                Throwable failure = signal.failure();
                long attempt = signal.totalRetries() + 1;

                if (attempt > MAX_RETRIES) {
                    return Mono.error(new GeminiUnavailableException(
                            "Gemini API không phản hồi sau " + MAX_RETRIES + " lần thử", failure));
                }

                if (failure instanceof WebClientResponseException.TooManyRequests tmr) {
                    Duration delay = parseRetryAfter(tmr).orElse(Duration.ofSeconds(2 * attempt));
                    long delayMs = delay.toMillis();
                    globalRateLimitedUntil.set(System.currentTimeMillis() + delayMs);
                    log.warn("Gemini 429 rate limited, chờ {}s trước khi thử lại (attempt {}/{})",
                            delay.getSeconds(), attempt, MAX_RETRIES);
                    return Mono.delay(delay);
                }

                if (failure instanceof WebClientResponseException.ServiceUnavailable) {
                    Duration delay = Duration.ofMillis(500L * attempt);
                    log.warn("Gemini 503 unavailable, thử lại sau {}ms (attempt {}/{})",
                            delay.toMillis(), attempt, MAX_RETRIES);
                    return Mono.delay(delay);
                }

                return Mono.error(failure);
            })
        ));
    }

    private Optional<Duration> parseRetryAfter(WebClientResponseException ex) {
        String header = ex.getHeaders().getFirst(HttpHeaders.RETRY_AFTER);
        if (header == null) return Optional.empty();
        try {
            return Optional.of(Duration.ofSeconds(Long.parseLong(header.trim())));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private void generateAiResponse(LiveSession ls, String initialPrompt) {
        try {
            List<Map<String, Object>> contents = new ArrayList<>();

            // Build chat history for Gemini API
            for (Map<String, String> turn : ls.getTranscript()) {
                String role = turn.get("role").equals("user") ? "user" : "model";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", turn.get("text")))));
            }

            if (contents.isEmpty() && initialPrompt != null) {
                contents.add(Map.of(
                        "role", "user",
                        "parts",
                        List.of(Map.of("text", "Please greet me warmly and ask an opening question about the topic: "
                                + ls.getTopic()))));
            }

            String systemPrompt = buildSystemPrompt(ls.getTopic());

            Map<String, Object> requestBody = Map.of(
                    "contents", contents,
                    "systemInstruction", Map.of(
                            "parts", List.of(Map.of("text", systemPrompt))),
                    "generationConfig", Map.of(
                            "temperature", 0.7,
                            "maxOutputTokens", 200));

            callGeminiWithRetry(requestBody)
                    .subscribe(
                            response -> processGeminiResponse(ls, response),
                            error -> {
                                WebSocketSession session = ls.getFrontendSession();
                                log.error("Gemini API thất bại hoàn toàn cho session {}: {}", session.getId(), error.getMessage());
                                sendErrorToFrontend(session, "Gemini API không khả dụng: " + error.getMessage());
                                try {
                                    if (session.isOpen()) {
                                        session.close(CloseStatus.SERVER_ERROR.withReason("gemini_unavailable"));
                                    }
                                } catch (IOException e) {
                                    log.error("Failed to close session on Gemini error", e);
                                }
                            });

        } catch (Exception e) {
            log.error("Failed to build Gemini request", e);
        }
    }

    private void processGeminiResponse(LiveSession ls, JsonNode response) {
        try {
            String aiText = response.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text")
                    .asText();

            if (aiText != null && !aiText.isBlank()) {
                ls.addTranscript("assistant", aiText);
                log.info("AI response [{}]: {}", ls.getFrontendSession().getId(), aiText);

                // Send AI transcript & response event to FE
                sendToFrontend(ls.getFrontendSession(),
                        new ClientProxyMessages.TranscriptUpdate("TRANSCRIPT", "assistant", aiText));
                sendToFrontend(ls.getFrontendSession(), new ClientProxyMessages.AudioResponse("AI_RESPONSE", aiText));
                sendToFrontend(ls.getFrontendSession(), new ClientProxyMessages.TurnComplete("TURN_COMPLETE"));
            }
        } catch (Exception e) {
            log.error("Failed to process Gemini response JSON", e);
        }
    }

    private String buildSystemPrompt(String topic) {
        return """
                You are an engaging, friendly English conversation partner helping a Vietnamese student practice \
                TOEIC English speaking. The topic for this session is: %s.

                Guidelines:
                - ALWAYS respond in English only, regardless of what language the student uses.
                - ALWAYS reply with exactly 2 to 3 full sentences — never just a single short sentence, even for simple exchanges like greetings.
                - Keep each turn under 40 words total.
                - Never use markdown formatting, emojis, or asterisks — plain conversational text only, since your reply is converted to speech.
                - Focus on TOEIC-relevant workplace, travel, daily life, or social contexts.
                - If the student makes a grammar mistake, naturally rephrase the correct form in your own reply — do not lecture or break the conversational flow.
                - Structure: (1) briefly react to or comment on what the student said, (2) add a related thought or small detail, (3) end with a relevant follow-up question.
                """
                .formatted(topic);
    }

    private void generateAndSendFeedback(LiveSession ls, WebSocketSession session) {
        try {
            var feedback = feedbackService.generateFeedback(ls.getTopic(), ls.getTranscript());
            String json = objectMapper.writeValueAsString(feedback);
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(json));
            }
        } catch (Exception e) {
            log.error("Failed to generate or send feedback", e);
        }
    }

    private void sendErrorToFrontend(WebSocketSession session, String message) {
        try {
            if (session.isOpen()) {
                var err = new ClientProxyMessages.ErrorMessage("ERROR", message);
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(err)));
            }
        } catch (IOException e) {
            log.error("Failed to send error to frontend", e);
        }
    }

    private void sendToFrontend(WebSocketSession session, Object payload) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
            }
        } catch (IOException e) {
            log.error("Failed to send message to frontend", e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Session state
    // ─────────────────────────────────────────────────────────────────────────

    private static class LiveSession {
        private final WebSocketSession frontendSession;
        private final String topic;
        private volatile boolean ended = false;
        private final List<Map<String, String>> transcript = new ArrayList<>();

        LiveSession(WebSocketSession frontendSession, String topic) {
            this.frontendSession = frontendSession;
            this.topic = topic;
        }

        synchronized void addTranscript(String role, String text) {
            Map<String, String> entry = new HashMap<>();
            entry.put("role", role);
            entry.put("text", text);
            transcript.add(entry);
        }

        WebSocketSession getFrontendSession() {
            return frontendSession;
        }

        String getTopic() {
            return topic;
        }

        boolean isEnded() {
            return ended;
        }

        void setEnded(boolean ended) {
            this.ended = ended;
        }

        synchronized List<Map<String, String>> getTranscript() {
            return new ArrayList<>(transcript);
        }
    }
}
