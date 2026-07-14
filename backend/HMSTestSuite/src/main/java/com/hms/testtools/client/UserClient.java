package com.hms.testtools.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import com.hms.testtools.dto.RegistrationCountsDTO;

@FeignClient(
    name = "user-client",
    url = "${gateway.url}"
)
public interface UserClient {

    @GetMapping("/users/getProfile/{id}")
    Long getProfilePicture(@PathVariable("id") Long id);

    @GetMapping("/users/getRegistrationCounts")
    RegistrationCountsDTO getRegistrationCounts();
}