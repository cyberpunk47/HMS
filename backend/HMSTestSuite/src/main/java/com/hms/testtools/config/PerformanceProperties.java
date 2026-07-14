package com.hms.testtools.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "performance")
public class PerformanceProperties {

    private int doctors;
    private int patients;
    private int medicines;
    private int inventoryBatches;
    private int admins;
    private int parallelThreads;

}
