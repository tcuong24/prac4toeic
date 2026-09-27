package com.prac4toeic.modules.speaking.service;

import com.prac4toeic.config.KafkaTopicConfig;
import com.prac4toeic.modules.speaking.dto.SpeakingSubmissionEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpeakingKafkaProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendSpeakingSubmission(SpeakingSubmissionEvent event) {
        log.info("📤 Sending Speaking Submission Event to Kafka: submissionId={}", event.getSubmissionId());
        kafkaTemplate.send(KafkaTopicConfig.SPEAKING_SUBMISSION_TOPIC, event.getSubmissionId(), event);
    }
}
