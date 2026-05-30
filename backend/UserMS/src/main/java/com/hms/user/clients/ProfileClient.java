package com.hms.user.clients;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.hms.user.config.FeignClientInterceptor;
import com.hms.user.dto.UserDTO;




@FeignClient(name = "ProfileMS", configuration = FeignClientInterceptor.class)
public interface ProfileClient {

    @PostMapping("/profile/doctor/add")
    Long addDoctor(@RequestBody UserDTO userDTO);

    @PostMapping("/profile/patient/add")
    Long addPatient(@RequestBody UserDTO userDTO);

    @org.springframework.web.bind.annotation.GetMapping("/profile/doctor/getProfileId/{id}")
    Long getDoctorProfilePictureId(@org.springframework.web.bind.annotation.PathVariable("id") Long id);

    @org.springframework.web.bind.annotation.GetMapping("/profile/patient/getProfileId/{id}")
    Long getPatientProfilePictureId(@org.springframework.web.bind.annotation.PathVariable("id") Long id);
}
