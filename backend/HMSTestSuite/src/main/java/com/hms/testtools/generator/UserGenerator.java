package com.hms.testtools.generator;

import com.hms.testtools.dto.Roles;
import com.hms.testtools.dto.UserDTO;
import net.datafaker.Faker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class UserGenerator {

    @Autowired
    private Faker faker;

    public UserDTO generateUser(Roles role) {
        UserDTO user = new UserDTO();
        String name = faker.name().fullName();
        user.setName(name);
        String emailName = name.toLowerCase().replaceAll("[^a-z0-9]", "");
        user.setEmail(emailName + "_" + faker.random().hex(4) + "@hms.com");
        user.setPassword("Password@123");
        user.setRole(role);
        return user;
    }
}
