package com.hms.pharmacyMS.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hms.pharmacyMS.dto.StockStatus;
import com.hms.pharmacyMS.entity.MedicineInventory;

public interface MedicineInventoryRepository extends JpaRepository<MedicineInventory, Long> {
     List<MedicineInventory> findByExpiryDateBefore(LocalDate date);

     List<MedicineInventory> findByMedicineIdAndExpiryDateAfterAndQuantityGreaterThanAndStatusOrderByExpiryDateAsc(
               Long medicineId,
               LocalDate date,
               Integer quantity,
               StockStatus status);

     // Example use case here
     // Give all available stock entries for medicine id = 1,
     // not expired,
     // quantity > 0,
     // sorted by nearest expiry first.
     Boolean existsByMedicineIdAndBatchNo(
               Long medicineId,
               String batchNo);

     List<MedicineInventory> findAllMedicineById(Long medicineId);
}
