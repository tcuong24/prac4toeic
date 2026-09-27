package com.prac4toeic.modules.speaking.exception;

public class GeminiUnavailableException extends RuntimeException {
    public GeminiUnavailableException(String message) {
        super(message);
    }

    public GeminiUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
