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

    public UserDTO generateUser(Roles role, int index) {
        UserDTO user = new UserDTO();
        String name = faker.name().fullName();
        user.setName(name);

        String prefix;
        if (role == Roles.PATIENT) {
            prefix = "patient";
        } else if (role == Roles.DOCTOR) {
            prefix = "doctor";
        } else if (role == Roles.ADMIN) {
            prefix = "admin";
        } else {
            prefix = "user";
        }

        user.setEmail(String.format("%s%03d@hms.com", prefix, index));
        user.setPassword("Password@123");
        user.setRole(role);
        return user;
    }

    public UserDTO generateUser(Roles role) {
        return generateUser(role, faker.number().numberBetween(1, 999));
    }
}
