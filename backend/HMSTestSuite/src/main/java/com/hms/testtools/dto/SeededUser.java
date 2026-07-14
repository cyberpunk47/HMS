package com.hms.testtools.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SeededUser {
    private UserDTO user;
    private Long profileId;
}
