package com.hms.testtools.dto;

import java.time.LocalDate;

// import com.hms.profile.entity.Patient;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
// import com.hms.profile.dto.BloodGroup;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PatientDTO {
    private Long id;
    private String name;
    private String email;
    private LocalDate dob;
    private Long profilePictureId;
    private String phone;
    private String address;
    private String aadharNo;
    private BloodGroup bloodGroup;
    private String gender;
    private String allergies;
    private String chronicDesease;

    /*
public Patient toEntity() {
        return new Patient(this.id, this.name, this.email, this.dob, this.profilePictureId, this.phone, this.address, this.aadharNo, this.bloodGroup, this.gender, this.allergies, this.chronicDesease);
    }
*/
}
