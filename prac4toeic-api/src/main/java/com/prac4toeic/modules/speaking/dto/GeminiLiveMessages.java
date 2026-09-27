package com.prac4toeic.modules.speaking.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * DTOs mirroring the Gemini Live API WebSocket message protocol.
 * Endpoint: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=API_KEY
 */
public class GeminiLiveMessages {

    // ── Client → Gemini ─────────────────────────────────────────────────────

    /** First message sent after WS connection to configure the session */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ClientSetupMessage(
            @JsonProperty("setup") Setup setup
    ) {
        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record Setup(
                @JsonProperty("model") String model,
                @JsonProperty("generationConfig") GenerationConfig generationConfig,
                @JsonProperty("systemInstruction") SystemInstruction systemInstruction
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record GenerationConfig(
                @JsonProperty("responseModalities") List<String> responseModalities,
                @JsonProperty("speechConfig") SpeechConfig speechConfig
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record SpeechConfig(
                @JsonProperty("voiceConfig") VoiceConfig voiceConfig
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record VoiceConfig(
                @JsonProperty("prebuiltVoiceConfig") PrebuiltVoiceConfig prebuiltVoiceConfig
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record PrebuiltVoiceConfig(
                @JsonProperty("voiceName") String voiceName
        ) {}


        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record SystemInstruction(
                @JsonProperty("parts") List<Map<String, String>> parts
        ) {}
    }

    /** Sends audio chunks from user mic to Gemini */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ClientAudioMessage(
            @JsonProperty("realtimeInput") RealtimeInput realtimeInput
    ) {
        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record RealtimeInput(
                @JsonProperty("mediaChunks") List<MediaChunk> mediaChunks
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record MediaChunk(
                @JsonProperty("mimeType") String mimeType,
                @JsonProperty("data") String data  // base64-encoded PCM
        ) {}
    }

    // ── Gemini → Client ─────────────────────────────────────────────────────

    /** Server response containing audio and/or text */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ServerMessage(
            @JsonProperty("setupComplete") Object setupComplete,
            @JsonProperty("serverContent") ServerContent serverContent
    ) {
        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record ServerContent(
                @JsonProperty("modelTurn") ModelTurn modelTurn,
                @JsonProperty("outputTranscription") OutputTranscription outputTranscription,
                @JsonProperty("turnComplete") Boolean turnComplete,
                @JsonProperty("interrupted") Boolean interrupted
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record ModelTurn(
                @JsonProperty("parts") List<Part> parts
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record Part(
                @JsonProperty("inlineData") InlineData inlineData,
                @JsonProperty("text") String text
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record InlineData(
                @JsonProperty("mimeType") String mimeType,
                @JsonProperty("data") String data  // base64 PCM audio
        ) {}

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public record OutputTranscription(
                @JsonProperty("text") String text
        ) {}
    }
}
