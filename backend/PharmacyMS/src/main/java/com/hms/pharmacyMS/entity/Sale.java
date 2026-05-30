package com.hms.pharmacyMS.entity;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.hms.pharmacyMS.dto.SaleDTO;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class Sale {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long prescriptionId;
    private String buyerName;
    private String buyerContact;
    private LocalDateTime saleDate;
    private double totalAmount;

    public Sale(Long id){
        this.id = id;
    }

    public SaleDTO toDTO(){
        return new SaleDTO(id, prescriptionId,buyerName, buyerContact, saleDate, totalAmount);
    }

}
