package com.prac4toeic.config;

import com.prac4toeic.modules.speaking.websocket.GeminiLiveProxyHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final GeminiLiveProxyHandler geminiLiveProxyHandler;

    public WebSocketConfig(GeminiLiveProxyHandler geminiLiveProxyHandler) {
        this.geminiLiveProxyHandler = geminiLiveProxyHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(geminiLiveProxyHandler, "/ws/speaking/conversation")
                .setAllowedOrigins("http://localhost:5173", "http://localhost:3000");
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        // 10MB max binary message buffer for PCM audio chunks
        container.setMaxBinaryMessageBufferSize(10 * 1024 * 1024);
        container.setMaxTextMessageBufferSize(512 * 1024);
        // Keep session open for up to 30 minutes
        container.setMaxSessionIdleTimeout(30 * 60 * 1000L);
        return container;
    }
}
