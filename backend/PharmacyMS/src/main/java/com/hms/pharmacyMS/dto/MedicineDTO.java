package com.hms.pharmacyMS.dto;

import java.time.LocalDateTime;

import com.hms.pharmacyMS.entity.Medicine;
import com.hms.pharmacyMS.entity.MedicineCategory;
import com.hms.pharmacyMS.entity.MedicineType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicineDTO {
    private Long id;
    private String name;
    private String description;
     private String dosage;

    private MedicineCategory category; // Antibiotic , viral or other
    private MedicineType type; // tablet , injection or other
    private String manufacturer;
    private Integer unitPrice;
    private Integer stock;
    private LocalDateTime mfd;
    private LocalDateTime expDate;
    private String notes;
    private LocalDateTime createdAt;

    public Medicine toEntity(){
        return new Medicine(id, name, description, dosage, category, type, manufacturer, unitPrice, stock, mfd, expDate, notes, createdAt);
    }
}
