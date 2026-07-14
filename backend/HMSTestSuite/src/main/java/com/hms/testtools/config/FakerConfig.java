package com.hms.testtools.config;

import java.util.Locale;

import net.datafaker.Faker;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FakerConfig {
    @Bean
    public Faker faker() {
        return new Faker(Locale.of("en","IN"));
    }
}
