package com.hms.pharmacy.pharmacyMS.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.hms.pharmacy.pharmacyMS.entity.Medicine;
import com.hms.pharmacy.pharmacyMS.entity.Sale;
import com.hms.pharmacy.pharmacyMS.entity.SaleItem;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SaleItemDTO {
    private Long id;
    private Long saleId;
    private Long medicineId;
    private String batchNo;
    private Integer quantity;
    private Double unitPrice;

    public SaleItem toEntity(){
        return new SaleItem(id, new Sale(saleId), new Medicine(medicineId), batchNo, quantity, unitPrice);
    }

}