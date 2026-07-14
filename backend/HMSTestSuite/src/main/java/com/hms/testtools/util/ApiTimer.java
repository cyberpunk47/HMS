package com.hms.testtools.util;

public class ApiTimer {
    public static long start(){
        return System.nanoTime();
    }
    public static long stop(long start){
        return (long) ((System.nanoTime() - start) / 1_000_000);
    }
}
