package com.prac4toeic.modules.speaking.service;
import com.prac4toeic.modules.speaking.dto.PronunciationResult;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class LocalPronunciationClient {

    private final WebClient webClient;

    public LocalPronunciationClient() {
        this.webClient = WebClient.builder()
                .baseUrl("http://speech-service:8001")  // tên service trong docker network
                .build();
    }

    public PronunciationResult assess(byte[] audioBytes, String referenceText) {
        var multipartData = new MultipartBodyBuilder();
        multipartData.part("audio", new ByteArrayResource(audioBytes))
                .filename("audio.wav");
        multipartData.part("reference_text", referenceText);

        return webClient.post()
                .uri("/assess")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(multipartData.build()))
                .retrieve()
                .bodyToMono(PronunciationResult.class)
                .block(); // hoặc xử lý reactive/async như đã thiết kế trước
    }
}