package com.hms.pharmacyMS.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hms.pharmacyMS.dto.StockStatus;
import com.hms.pharmacyMS.entity.MedicineInventory;

import jakarta.persistence.LockModeType;

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

     // Same filter/order as findByMedicineIdAndExpiryDateAfterAndQuantityGreaterThanAndStatusOrderByExpiryDateAsc,
     // but locks the batch rows so two concurrent sales cannot both consume the same units.
     @Lock(LockModeType.PESSIMISTIC_WRITE)
     @Query("SELECT i FROM MedicineInventory i WHERE i.medicine.id = :medicineId AND i.expiryDate > :date "
               + "AND i.quantity > :quantity AND i.status = :status ORDER BY i.expiryDate ASC")
     List<MedicineInventory> findSellableBatchesForUpdate(@Param("medicineId") Long medicineId,
               @Param("date") LocalDate date,
               @Param("quantity") Integer quantity,
               @Param("status") StockStatus status);
}
