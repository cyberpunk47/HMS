package com.hms.testtools.dto;


// import com.hms.pharmacyMS.entity.Medicine;
// import com.hms.pharmacyMS.entity.Sale;
// import com.hms.pharmacyMS.entity.SaleItem;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    /*
public SaleItem toEntity(){
        return new SaleItem(id, new Sale(saleId), new Medicine(medicineId), batchNo, quantity, unitPrice);
    }
*/

}