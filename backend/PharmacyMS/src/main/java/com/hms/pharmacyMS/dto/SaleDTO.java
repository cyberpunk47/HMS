package com.hms.pharmacyMS.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.hms.pharmacyMS.entity.Sale;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SaleDTO {
    private Long id;
    private Long prescriptionId;
    private String buyerName;
    private String buyerContact;
    private LocalDateTime saleDate;
    private double totalAmount;

    public Sale toEntity(){
        return new Sale(id, prescriptionId, buyerName, buyerContact, saleDate, totalAmount);
    }

}