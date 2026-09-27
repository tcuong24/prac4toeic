package com.prac4toeic.modules.speaking.service;

import com.prac4toeic.config.KafkaTopicConfig;
import com.prac4toeic.modules.speaking.dto.SpeakingScoringResultDto;
import com.prac4toeic.modules.speaking.dto.SpeakingSubmissionEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpeakingKafkaConsumer {

    private final SpeakingScoringService scoringService;
    private final SimpMessagingTemplate messagingTemplate;

    // Bộ nhớ Cache kiểm tra Idempotency (Chống xử lý trùng message khi Kafka retry)
    private final Set<String> processedSubmissions = ConcurrentHashMap.newKeySet();

    @KafkaListener(topics = KafkaTopicConfig.SPEAKING_SUBMISSION_TOPIC, groupId = "toeic-scoring-group")
    public void consumeSpeakingSubmission(SpeakingSubmissionEvent event, Acknowledgment ack) {
        log.info("📥 [Kafka Consumer] Received Speaking Submission: submissionId={}, userId={}",
                event.getSubmissionId(), event.getUserId());

        // 1. Kiểm tra Idempotency — nếu submission đã xử lý xong thì bỏ qua & ack ngay
        if (processedSubmissions.contains(event.getSubmissionId())) {
            log.info("⏭️ Submission {} đã được chấm điểm trước đó. Skipping & Acknowledging offset.", event.getSubmissionId());
            ack.acknowledge();
            return;
        }

        try {
            // 2. Chấm điểm AI thực tế qua SpeakingScoringService (OpenPronounce + Gemini)
            SpeakingScoringResultDto result = scoringService.score(event);

            // 3. Ghi nhận đã xử lý xong vào bộ nhớ (Idempotency mark)
            processedSubmissions.add(event.getSubmissionId());

            // 4. Gửi kết quả Real-time tới Frontend qua WebSocket
            if (event.getUserId() != null) {
                messagingTemplate.convertAndSendToUser(
                        event.getUserId().toString(),
                        "/queue/speaking-result",
                        result
                );
            }
            messagingTemplate.convertAndSend("/topic/speaking-result/" + event.getSubmissionId(), result);

            log.info("✅ [Kafka Success] SubmissionId={} scored & notified. Pronunciation Score: {}",
                    event.getSubmissionId(), result.getPronunciationScore());

            // 5. Commit Offset thủ công khi và chỉ khi thành công 100%
            ack.acknowledge();

        } catch (Exception e) {
            log.error("❌ [Kafka Error] Lỗi khi xử lý submissionId={}. Rethrowing for DLT Retry ErrorHandler.", event.getSubmissionId(), e);
            // Ném exception để DefaultErrorHandler bắt -> Retry 3 lần -> Đẩy sang Dead Letter Topic (.DLT)
            throw e;
        }
    }
}
