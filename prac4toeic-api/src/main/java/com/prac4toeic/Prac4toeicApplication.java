package com.prac4toeic;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

@SpringBootApplication
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class Prac4toeicApplication {

	public static void main(String[] args) {
		SpringApplication.run(Prac4toeicApplication.class, args);
	}

}
