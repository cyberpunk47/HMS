package com.hms.testtools.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserCredentialDTO {
    private String email;
    private String password;
    private Long profileId;
    private String role;
}
