package com.hms.pharmacy.pharmacyMS.dto;

import java.time.LocalDateTime;

import com.hms.pharmacy.pharmacyMS.entity.Medicine;
import com.hms.pharmacy.pharmacyMS.entity.MedicineCategory;
import com.hms.pharmacy.pharmacyMS.entity.MedicineType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicineDTO {
    private Long id;
    private String name;
    private String Description;
    private MedicineCategory category; // Antibiotic , viral or other
    private MedicineType type; // tablet , injection or other
    private String manufacturer;
    private Integer unitPrice;
    private Integer stock;
    private LocalDateTime mfd;
    private LocalDateTime expDate;
    private String notes;

    public Medicine toEntity(){
        return new Medicine(id, name, Description, category, type, manufacturer, unitPrice, stock, mfd, expDate, notes);
    }
}
