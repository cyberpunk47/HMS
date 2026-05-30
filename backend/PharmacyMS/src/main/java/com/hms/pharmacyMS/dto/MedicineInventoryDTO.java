package com.hms.pharmacyMS.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.hms.pharmacyMS.entity.Medicine;
import com.hms.pharmacyMS.entity.MedicineInventory;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicineInventoryDTO {
    private Long id;
    private Long medicineId;
    private String batchNo;
    private Integer quantity;
    private LocalDate expiryDate;
    private LocalDate addedDate;
    private Integer initialQuantity;
    private StockStatus status;

    public MedicineInventory toEntity() {
        return new MedicineInventory(id, new Medicine(medicineId), batchNo, quantity, expiryDate, addedDate, initialQuantity, status);
    }
}
