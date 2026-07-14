package com.hms.testtools.seeder;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class SeederRunner implements CommandLineRunner {

    @Autowired
    private SeederService seederService;

    @Autowired
    private ParallelSeederService parallelSeederService;

    @Value("${seeder.enabled:false}")
    private boolean seederEnabled;

    @Value("${seeder.parallel:false}")
    private boolean seederParallel;
    
    @Override
    public void run(String... args) throws Exception {
        if (!seederEnabled) {
            System.out.println(">>> Database Seeding is disabled.");
            return;
        }
        if (seederParallel) {
            parallelSeederService.seedEverythingParallel();
        } else {
            seederService.seedEverything();
        }
    }
}
