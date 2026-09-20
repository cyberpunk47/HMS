package com.hms.user.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hms.user.dto.LoginDTO;
import com.hms.user.dto.ResponseDTO;
import com.hms.user.dto.Roles;
import com.hms.user.dto.UserDTO;
import com.hms.user.exception.ForbiddenException;
import com.hms.user.exception.HmsException;
import com.hms.user.jwt.JwtUtil;
import com.hms.user.service.UserService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;


@RestController
@RequestMapping({"/user", "/users"})
@Validated

public class UserAPI {
    @Autowired
    private UserService userService;


    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> registerUser(@RequestBody @Valid UserDTO userDTO,
            @RequestHeader(value = "X-User-Role", required = false) String callerRole) throws HmsException{
        // Public sign-up must not be able to mint administrators. An ADMIN account can be created
        // only when no admin exists yet (first-time bootstrap) or by a caller that is already
        // ADMIN (the Gateway forwards X-User-Role only from a verified token).
        if (userDTO.getRole() == Roles.ADMIN && !"ADMIN".equals(callerRole) && userService.adminExists()) {
            throw new ForbiddenException("Admin accounts can only be created by an existing admin.");
        }
        Long profileId = userService.registerUser(userDTO);
        return new ResponseEntity<>(new ResponseDTO("Account created successfully.", profileId), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<String> loginUser(@RequestBody LoginDTO loginDTO) throws HmsException{
        final Authentication authentication;
        try{
            authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(loginDTO.getEmail(), loginDTO.getPassword()));
        }catch(AuthenticationException e){
            throw new HmsException("INVALID_CREDENTIALS");
        }
        // The authenticated principal is the CustomUserDetails already loaded (and BCrypt-verified)
        // by the AuthenticationManager. Re-loading it by email was a second, redundant DB query per login.
        final UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        final String jwt = jwtUtil.generateToken(userDetails);
        return new ResponseEntity<>(jwt, HttpStatus.OK);
    }
    
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return new ResponseEntity<>("Test", HttpStatus.OK);
    }

    @GetMapping("/getProfile/{id}")
    public ResponseEntity<Long> getProfile(@org.springframework.web.bind.annotation.PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(userService.getProfilePictureId(id), HttpStatus.OK);
    }

    @GetMapping("/getRegistrationCounts")
    public ResponseEntity<com.hms.user.dto.RegistrationCountsDTO> getRegistrationCounts() throws HmsException {
        return new ResponseEntity<>(userService.getRegistrationCounts(), HttpStatus.OK);
    }
    
}
