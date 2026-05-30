package com.hms.pharmacyMS.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hms.pharmacyMS.entity.Sale;

public interface SaleRepository extends JpaRepository<Sale, Long>{
    Boolean existsByPrescriptionId(Long prescriptionId);
    Optional<Sale> findByPrescriptionId(Long prescriptionId);
}
