package com.hms.pharmacyMS.repository;

import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hms.pharmacyMS.entity.Medicine;

public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    Optional<Medicine> findByNameIgnoreCaseAndDosageIgnoreCase(String name, String dosage);

    Optional<Integer> findStockById(Long id);
    // Because medicine is not yet created db wont generate an id so we need to rely on the  name to find if it exists
    Boolean existsByName(String name);

    // Row lock for stock read-modify-write (prevents lost updates when sales run concurrently).
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Medicine m WHERE m.id = :id")
    Optional<Medicine> findByIdForUpdate(@Param("id") Long id);
}
