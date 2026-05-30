package com.hms.user.dto;

import java.util.List;

public class RegistrationCountsDTO {
    private List<MonthlyCountDTO> patientCounts;
    private List<MonthlyCountDTO> doctorCounts;

    public RegistrationCountsDTO() {}

    public RegistrationCountsDTO(List<MonthlyCountDTO> patientCounts, List<MonthlyCountDTO> doctorCounts) {
        this.patientCounts = patientCounts;
        this.doctorCounts = doctorCounts;
    }

    public List<MonthlyCountDTO> getPatientCounts() {
        return patientCounts;
    }

    public void setPatientCounts(List<MonthlyCountDTO> patientCounts) {
        this.patientCounts = patientCounts;
    }

    public List<MonthlyCountDTO> getDoctorCounts() {
        return doctorCounts;
    }

    public void setDoctorCounts(List<MonthlyCountDTO> doctorCounts) {
        this.doctorCounts = doctorCounts;
    }
}
