package com.hms.testtools.auth;

import com.hms.testtools.client.AuthClient;
import com.hms.testtools.dto.LoginDTO;
import com.hms.testtools.dto.ResponseDTO;
import com.hms.testtools.dto.UserDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private AuthClient authClient;

    public String login(String email, String password) {
        LoginDTO loginDTO = new LoginDTO(email, password);
        String token = authClient.login(loginDTO);
        TokenManager.setToken(token);
        return token;
    }

    public ResponseDTO register(UserDTO userDTO) {
        return authClient.register(userDTO);
    }

    public void logout() {
        TokenManager.clearToken();
    }
}
