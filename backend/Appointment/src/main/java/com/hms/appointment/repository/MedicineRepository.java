package com.hms.appointment.repository;

import com.hms.appointment.entity.Medicine;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface MedicineRepository extends CrudRepository<Medicine, Long> {
    List<Medicine> findAllByPrescription_id(Long prescriptionId);

    List<Medicine> findAllByPrescription_idIn(List<Long> ids);
}
