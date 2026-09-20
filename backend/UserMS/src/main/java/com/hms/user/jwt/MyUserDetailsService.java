package com.hms.user.jwt;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.hms.user.dto.UserDTO;
import com.hms.user.exception.HmsException;
import com.hms.user.service.UserService;


@Service
public class MyUserDetailsService implements UserDetailsService{


    @Autowired
    private UserService userService;


    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        try{
            UserDTO dto = userService.getUser(email);
            return new CustomUserDetails(dto.getId(), dto.getEmail(), dto.getPassword(), dto.getRole(), dto.getName(), dto.getEmail(),dto.getProfileId(), null);
        }catch(HmsException e){
            // Contract of UserDetailsService: throw instead of returning null. Spring converts this to
            // BadCredentialsException, so /login still answers INVALID_CREDENTIALS (no behaviour change),
            // without printing a stack trace for every unknown email.
            throw new UsernameNotFoundException("USER_NOT_FOUND");
        }
    }
    
}
