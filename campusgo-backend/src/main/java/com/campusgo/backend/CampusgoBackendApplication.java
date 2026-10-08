package com.campusgo.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CampusgoBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(CampusgoBackendApplication.class, args);
	}

}
