package com.hms.testtools;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class HmsTestSuiteApplication {

	public static void main(String[] args) {
		SpringApplication.run(HmsTestSuiteApplication.class, args);
	}

}
