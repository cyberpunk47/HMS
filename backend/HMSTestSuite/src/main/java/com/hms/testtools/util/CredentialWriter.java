package com.hms.testtools.util;

import com.hms.testtools.dto.UserCredentialDTO;
import tools.jackson.databind.ObjectMapper;

import java.io.File;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class CredentialWriter {

    private static final String DEFAULT_FILE = "credentials.json";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static synchronized void writeCredentials(List<UserCredentialDTO> credentials) {
        writeCredentials(DEFAULT_FILE, credentials);
    }

    public static synchronized void writeCredentials(String filePath, List<UserCredentialDTO> credentials) {
        if (filePath == null || filePath.trim().isEmpty()) {
            filePath = DEFAULT_FILE;
        }

        try {
            File file = new File(filePath);
            Map<String, UserCredentialDTO> map = new LinkedHashMap<>();

            // If file already exists, load existing credentials first so they are preserved
            if (file.exists() && file.length() > 0) {
                try {
                    UserCredentialDTO[] existing = objectMapper.readValue(file, UserCredentialDTO[].class);
                    if (existing != null) {
                        for (UserCredentialDTO cred : existing) {
                            if (cred != null && cred.getEmail() != null) {
                                map.put(cred.getEmail(), cred);
                            }
                        }
                    }
                } catch (Exception ex) {
                    System.out.println(">>> Notice: Overwriting " + filePath + " (" + ex.getMessage() + ")");
                }
            }

            // Merge with newly seeded credentials
            for (UserCredentialDTO cred : credentials) {
                if (cred != null && cred.getEmail() != null) {
                    map.put(cred.getEmail(), cred);
                }
            }

            List<UserCredentialDTO> sortedList = new ArrayList<>(map.values());
            sortedList.sort(Comparator
                    .comparing(UserCredentialDTO::getRole, Comparator.reverseOrder()) // PATIENT before DOCTOR
                    .thenComparing(UserCredentialDTO::getEmail));

            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file, sortedList);
            System.out.println(">>> Successfully exported " + sortedList.size() + " user credentials to: " + file.getAbsolutePath());
        } catch (Exception e) {
            System.err.println(">>> Failed to export credentials to " + filePath + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
