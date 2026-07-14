package com.hms.pharmacyMS.entity;

import java.time.LocalDateTime;

import com.hms.pharmacyMS.dto.MedicineDTO;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Medicine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String dosage;
    private String description;
    private MedicineCategory category; // Antibiotic , viral or other
    private MedicineType type; // tablet , injection or other
    private String manufacturer;
    private Integer unitPrice;
    private Integer stock;
    private LocalDateTime mfd;
    private LocalDateTime expDate;
    private String notes;
    private LocalDateTime createdAt;

    public Medicine(Long id){
        this.id = id;
    }
    public MedicineDTO toDTO(){
        return new MedicineDTO(id, name, dosage, description, category, type, manufacturer, unitPrice, stock, mfd, expDate, notes, createdAt);
    }
}
