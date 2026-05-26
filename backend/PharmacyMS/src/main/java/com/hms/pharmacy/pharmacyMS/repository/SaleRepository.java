package com.hms.pharmacy.pharmacyMS.repository;

import java.util.Optional;

import org.springframework.data.repository.CrudRepository;

import com.hms.pharmacy.pharmacyMS.entity.Sale;

public interface SaleRepository extends CrudRepository<Sale, Long>{
    Boolean existsByPrescriptionId(Long prescriptionId);
    Optional<Sale> findByPrescriptionId(Long prescriptionId);
}
