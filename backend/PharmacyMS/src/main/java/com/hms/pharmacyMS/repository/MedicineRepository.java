package com.hms.pharmacyMS.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hms.pharmacyMS.entity.Medicine;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    Optional<Medicine> findByNameIgnoreCaseAndDosageIgnoreCase(String name, String dosage);

    Optional<Integer> findStockById(Long id);
    // Because medicine is not yet created db wont generate an id so we need to rely on the  name to find if it exists
    Boolean existsByName(String name);
}
