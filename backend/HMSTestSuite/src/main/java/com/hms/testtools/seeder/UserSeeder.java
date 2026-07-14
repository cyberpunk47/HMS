package com.hms.testtools.seeder;

import com.hms.testtools.auth.AuthService;
import com.hms.testtools.dto.Roles;
import com.hms.testtools.dto.UserDTO;
import com.hms.testtools.dto.ResponseDTO;
import com.hms.testtools.dto.SeededUser;
import com.hms.testtools.generator.UserGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserSeeder {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserGenerator userGenerator;

    public SeededUser seedUser(Roles role) {
        UserDTO user = userGenerator.generateUser(role);
        ResponseDTO response = authService.register(user);
        return new SeededUser(user, response.getProfileId());
    }
}
