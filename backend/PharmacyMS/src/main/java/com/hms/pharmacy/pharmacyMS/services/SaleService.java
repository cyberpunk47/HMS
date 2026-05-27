package com.hms.pharmacy.pharmacyMS.services;

import java.util.List;

import com.hms.pharmacy.pharmacyMS.dto.SaleDTO;
import com.hms.pharmacy.pharmacyMS.entity.SaleRequest;
import com.hms.pharmacy.pharmacyMS.exception.HmsException;

public interface SaleService {
    Long createSale(SaleRequest dto) throws HmsException;
    void updateSale(SaleDTO dto) throws HmsException;
    SaleDTO getSale(Long id) throws HmsException;

    SaleDTO getSaleByPrescriptionId(Long prescriptionId) throws HmsException;

    List<SaleDTO> getAllSales() throws HmsException;
}
