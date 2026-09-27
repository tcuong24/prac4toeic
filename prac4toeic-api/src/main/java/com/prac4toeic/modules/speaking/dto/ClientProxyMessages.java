package com.prac4toeic.modules.speaking.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Messages exchanged between the React frontend and our Spring Boot WS proxy.
 * These are the "control plane" messages — the audio itself is forwarded raw.
 */
public class ClientProxyMessages {

    /** Frontend → Backend: start a new conversation session */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record StartSession(
            @JsonProperty("type") String type,   // "START_SESSION"
            @JsonProperty("topic") String topic  // e.g. "job interview", "travel"
    ) {}

    /** Frontend → Backend: audio chunk (PCM, base64) from microphone */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AudioChunk(
            @JsonProperty("type") String type,   // "AUDIO_CHUNK"
            @JsonProperty("data") String data    // base64-encoded PCM 16kHz 16-bit LE
    ) {}

    /** Frontend → Backend: end session, request feedback */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record EndSession(
            @JsonProperty("type") String type    // "END_SESSION"
    ) {}

    /** Backend → Frontend: session is ready, Gemini setup confirmed */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SessionReady(
            @JsonProperty("type") String type    // "SESSION_READY"
    ) {}

    /** Backend → Frontend: audio chunk from Gemini to play */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AudioResponse(
            @JsonProperty("type") String type,   // "AUDIO_RESPONSE"
            @JsonProperty("data") String data    // base64 PCM 24kHz
    ) {}

    /** Backend → Frontend: Gemini transcript (AI speech text) */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TranscriptUpdate(
            @JsonProperty("type") String type,    // "TRANSCRIPT"
            @JsonProperty("role") String role,    // "assistant" | "user"
            @JsonProperty("text") String text
    ) {}

    /** Backend → Frontend: Gemini turn completed */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TurnComplete(
            @JsonProperty("type") String type     // "TURN_COMPLETE"
    ) {}

    /** Backend → Frontend: End-of-session AI feedback */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SessionFeedback(
            @JsonProperty("type") String type,                    // "SESSION_FEEDBACK"
            @JsonProperty("pronunciationFeedback") String pronunciationFeedback,
            @JsonProperty("grammarFeedback") String grammarFeedback,
            @JsonProperty("vocabularyFeedback") String vocabularyFeedback,
            @JsonProperty("overallScore") int overallScore,
            @JsonProperty("encouragement") String encouragement,
            // Vietnamese translations
            @JsonProperty("pronunciationFeedbackVi") String pronunciationFeedbackVi,
            @JsonProperty("grammarFeedbackVi") String grammarFeedbackVi,
            @JsonProperty("vocabularyFeedbackVi") String vocabularyFeedbackVi,
            @JsonProperty("encouragementVi") String encouragementVi
    ) {}

    /** Backend → Frontend: error occurred */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ErrorMessage(
            @JsonProperty("type") String type,    // "ERROR"
            @JsonProperty("message") String message
    ) {}
}
