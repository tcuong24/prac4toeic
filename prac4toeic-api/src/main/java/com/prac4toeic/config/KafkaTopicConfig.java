package com.prac4toeic.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    public static final String SPEAKING_SUBMISSION_TOPIC = "speaking-submission-topic";
    public static final String SCORING_COMPLETED_TOPIC = "scoring-completed-topic";

    @Bean
    public NewTopic speakingSubmissionTopic() {
        return TopicBuilder.name(SPEAKING_SUBMISSION_TOPIC)
                .partitions(3) // Chia thành 3 partition để xử lý song song
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic scoringCompletedTopic() {
        return TopicBuilder.name(SCORING_COMPLETED_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
