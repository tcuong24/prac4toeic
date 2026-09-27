package com.prac4toeic.modules.vocabulary.mapper;

import com.prac4toeic.modules.vocabulary.dto.VocabularyResponseDto;
import com.prac4toeic.modules.vocabulary.entity.Vocabulary;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface VocabularyMapper {

    @Mapping(source = "topic.id", target = "topicId")
    @Mapping(source = "topic.name", target = "topicName")
    VocabularyResponseDto toDto(Vocabulary vocabulary);
}
