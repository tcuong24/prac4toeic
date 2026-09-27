package com.prac4toeic.modules.vocabulary.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "vocabularies")
public class VocabularyDocument {

    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String word;

    @Field(type = FieldType.Text)
    private String phonetic;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String meaningVi;

    @Field(type = FieldType.Keyword)
    private String wordClass; // noun, verb, adj, adv

    @Field(type = FieldType.Keyword)
    private String topic; // Economy, Corporate, Travel, Office

    @Field(type = FieldType.Text)
    private String exampleSentence;
}
