package com.hms.testtools.util;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;

public class CsvWriter {

    private static final String FILE = "performance.csv";

    static {
        File file = new File(FILE);

        if (!file.exists()) {
            try (PrintWriter pw = new PrintWriter(new FileWriter(FILE))) {
                pw.println("Timestamp,Operation,ResponseTime(ms),Success");
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    public static synchronized void write(
            String operation,
            long responseTime,
            boolean success) {

        try (PrintWriter pw = new PrintWriter(new FileWriter(FILE, true))) {

            pw.printf("%d,%s,%d,%s%n",
                    System.currentTimeMillis(),
                    operation,
                    responseTime,
                    success);

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

}