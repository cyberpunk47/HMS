package com.hms.pharmacy.pharmacyMS.repository;


import org.springframework.data.repository.CrudRepository;

import com.hms.pharmacy.pharmacyMS.dto.StockStatus;
import com.hms.pharmacy.pharmacyMS.entity.MedicineInventory;
import java.util.List;
import java.time.LocalDate;

public interface MedicineInventoryRepository extends CrudRepository<MedicineInventory, Long> {
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
}
