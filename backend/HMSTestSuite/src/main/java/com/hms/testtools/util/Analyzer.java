package com.hms.testtools.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Analyzer {
  public static void main(String[] args) throws IOException {
    Path path = Paths.get("performance.csv");
    if (!Files.exists(path)) {
      path = Paths.get("backend/HMSTestSuite/performance.csv");
    }
    if (!Files.exists(path)) {
      path = Paths.get("HMSTestSuite/performance.csv");
    }

    List<String> lines = Files.readAllLines(path);
    Map<String, List<Long>> timings = new HashMap<>();
    Map<String, Integer> successCount = new HashMap<>();
    Map<String, Integer> failureCount = new HashMap<>();

    for (int i = 1; i < lines.size(); i++) {
      String line = lines.get(i);
      String[] data = line.split(",");
      if (data.length < 4)
        continue;

      String operation = data[1];
      long rt = Long.parseLong(data[2]);
      boolean success = Boolean.parseBoolean(data[3]);

      timings.computeIfAbsent(operation, k -> new ArrayList<>()).add(rt);

      if (success) {
        successCount.put(operation, successCount.getOrDefault(operation, 0) + 1);
      } else {
        failureCount.put(operation, failureCount.getOrDefault(operation, 0) + 1);
      }
    }


    System.out.println("==================================================");
    for (String operation : timings.keySet()) {
      List<Long> list = timings.get(operation);
      long sum = 0;
      for (long value : list) {
        sum += value;
      }
      double avg = (double) sum / list.size();
      long min = Collections.min(list);
      long max = Collections.max(list);
      int count = list.size();

      //p95 problem how many person/obj created under 95 percent of time
      Collections.sort(list);
      //its size
      int s = list.size();
      int index = (int)Math.ceil(0.95 * s) - 1;
      System.out.println("P95 " + list.get(index));
      //p99



      System.out.println(operation);
      System.out.println();
      System.out.println("Calls : " + count);
      System.out.println("Average : " + (long) avg + " ms");
      System.out.println("Min : " + min + " ms");
      System.out.println("Max : " + max + " ms");
      System.out.println("\n--------------------------------------\n");
    }
    System.out.println("==================================================");

    for (String operation : timings.keySet()) {
      System.out.println(operation);
      System.out.println("Success");
      System.out.println(successCount.getOrDefault(operation, 0));
      System.out.println("Failure");
      System.out.println(failureCount.getOrDefault(operation, 0));
      System.out.println("\n-----------------");
    }
  }
}