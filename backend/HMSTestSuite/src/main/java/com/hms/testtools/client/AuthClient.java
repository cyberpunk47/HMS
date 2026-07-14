package com.hms.testtools.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.hms.testtools.dto.LoginDTO;
import com.hms.testtools.dto.ResponseDTO;
import com.hms.testtools.dto.UserDTO;

@FeignClient(
    name = "auth-client",
    url = "${gateway.url}"
)
public interface AuthClient {

    @PostMapping("/users/register")
    ResponseDTO register(@RequestBody UserDTO userDTO);

    @PostMapping("/users/login")
    String login(@RequestBody LoginDTO loginDTO);
}
