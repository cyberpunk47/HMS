package com.hms.pharmacyMS.services;

import java.util.List;

import com.hms.pharmacyMS.dto.SaleItemDTO;
import com.hms.pharmacyMS.exception.HmsException;

public interface SaleItemService {
    // create the sale 
    Long createSaleItem(SaleItemDTO saleItemDTO) throws HmsException;

    void createSaleItem(Long saleId, List<SaleItemDTO> saleItemDTOS) throws HmsException;
    void createMultipleSaleItem(Long saleId, Long medicineId, List<SaleItemDTO> saleItemDTOS) throws HmsException;

    void updateSaleItem(SaleItemDTO saleItemDTO) throws HmsException;
    List<SaleItemDTO> getSaleItemsBySaleId(Long saleId) throws HmsException;
    SaleItemDTO getSaleItem(Long id)throws HmsException;
}
