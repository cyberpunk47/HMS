package com.hms.pharmacyMS.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import com.hms.pharmacyMS.dto.SaleItemDTO;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SaleRequest {
    private Long prescriptionId;
    private String buyerName;
    private String buyerContact;
    private Double totalAmount;
    private List<SaleItemDTO> saleItems;
}