package com.hms.user.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.hms.user.clients.ProfileClient;
import com.hms.user.dto.Roles;
import com.hms.user.dto.UserDTO;
import com.hms.user.entity.User;
import com.hms.user.exception.HmsException;
import com.hms.user.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service("userService")
@Transactional
public class UserServiceImpl implements UserService {

@Autowired
private UserRepository userRepository;

@Autowired
private PasswordEncoder passwordEncoder;


@Autowired
private ProfileClient profileClient;

    
    @Override
    public Long registerUser(UserDTO userDTO) throws HmsException {
        Optional <User> opt =  userRepository.findByEmail(userDTO.getEmail());
        if(opt.isPresent()){
            throw new HmsException("USER_ALREADY_EXISTS");

        }

        userDTO.setPassword(passwordEncoder.encode(userDTO.getPassword()));

        Long profileId = null;
        if(userDTO.getRole().equals(Roles.DOCTOR)) {
            profileId = profileClient.addDoctor(userDTO);
        }
        else if(userDTO.getRole().equals(Roles.PATIENT)) {
            profileId = profileClient.addPatient(userDTO);
        }
        userDTO.setProfileId(profileId);
        userRepository.save(userDTO.toEntity());
        return profileId;

    }

    @Override
    public UserDTO loginUser(UserDTO userDTO) throws HmsException {
        User user = userRepository.findByEmail(userDTO.getEmail()).orElseThrow(() -> new HmsException("USER_NOT_FOUND"));
        if (!passwordEncoder.matches(userDTO.getPassword(), user.getPassword())) {
            throw new HmsException("INVALID_CREDENTIALS");
        } 
        user.setPassword(null);
        return user.toDTO();
    }

    @Override
    public UserDTO getUserById(Long id) throws HmsException{
        return userRepository.findById(id).orElseThrow(() -> new HmsException("USER_NOT_FOUND")).toDTO();
    }

    @Override
    public void updateUser(UserDTO userDTO) {
        // Implementation here
        throw new UnsupportedOperationException("Unimplemented method 'updateUser'");
    }

    @Override
    public UserDTO getUser(String email) throws HmsException {
       return userRepository.findByEmail(email).orElseThrow(() -> new HmsException("USER_NOT_FOUND")).toDTO();
    }

    @Override
    public Long getProfilePictureId(Long id) throws HmsException {
        User user = userRepository.findById(id).orElseThrow(() -> new HmsException("USER_NOT_FOUND"));
        if (user.getRole() == Roles.DOCTOR) {
            return profileClient.getDoctorProfilePictureId(user.getProfileId());
        } else if (user.getRole() == Roles.PATIENT) {
            return profileClient.getPatientProfilePictureId(user.getProfileId());
        }
        return null;
    }

    @Override
    public com.hms.user.dto.RegistrationCountsDTO getRegistrationCounts() throws HmsException {
        long patientCount = userRepository.countByRole(Roles.PATIENT);
        long doctorCount = userRepository.countByRole(Roles.DOCTOR);

        String currentMonth = java.time.format.DateTimeFormatter.ofPattern("MMMM", java.util.Locale.ENGLISH)
                .format(java.time.LocalDate.now());

        java.util.List<com.hms.user.dto.MonthlyCountDTO> patientCounts = new java.util.ArrayList<>();
        java.util.List<com.hms.user.dto.MonthlyCountDTO> doctorCounts = new java.util.ArrayList<>();

        String[] months = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};

        for (int i = 0; i < months.length; i++) {
            if (months[i].equalsIgnoreCase(currentMonth)) {
                patientCounts.add(new com.hms.user.dto.MonthlyCountDTO(months[i], patientCount));
                doctorCounts.add(new com.hms.user.dto.MonthlyCountDTO(months[i], doctorCount));
            } else {
                patientCounts.add(new com.hms.user.dto.MonthlyCountDTO(months[i], 0L));
                doctorCounts.add(new com.hms.user.dto.MonthlyCountDTO(months[i], 0L));
            }
        }

        return new com.hms.user.dto.RegistrationCountsDTO(patientCounts, doctorCounts);
    }

}
