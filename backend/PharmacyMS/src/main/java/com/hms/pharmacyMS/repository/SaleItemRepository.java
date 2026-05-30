package com.hms.pharmacyMS.repository;

import org.springframework.data.repository.CrudRepository;

import com.hms.pharmacyMS.entity.SaleItem;

import java.util.List;

public interface SaleItemRepository extends CrudRepository<SaleItem, Long> {
    List<SaleItem> findBySaleId(Long saleId);
    List<SaleItem> findByMedicineId(Long medicineId);
}